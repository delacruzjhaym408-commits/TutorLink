import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonIcon, IonBackButton, IonButtons,
  AlertController, ToastController, IonSpinner, IonCard, IonRefresher, IonRefresherContent, IonBadge
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trashOutline, star, peopleOutline, banOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { AdminService } from '../../services/admin.service';
import { API_BASE_URL } from '../../config';

@Component({
  selector: 'app-admin-posts',
  templateUrl: './admin-posts.page.html',
  styleUrls: ['./admin-posts.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon, IonBackButton, IonButtons, IonSpinner, IonCard, IonRefresher, IonRefresherContent, IonBadge
  ],
})
export class AdminPostsPage implements OnInit {
  private adminService = inject(AdminService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  posts = signal<any[]>([]);
  loading = signal(true);

  constructor() {
    addIcons({ trashOutline, star, peopleOutline, banOutline, checkmarkCircleOutline });
  }

  ngOnInit() {
    this.loadPosts();
  }

  doRefresh(event: any) {
    this.adminService.getPosts().subscribe({
      next: (posts) => {
        this.posts.set(posts);
        this.cdr.detectChanges();
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      }
    });
  }

  loadPosts() {
    this.loading.set(true);
    this.adminService.getPosts().subscribe(posts => {
      this.posts.set(posts);
      this.loading.set(false);
      this.cdr.detectChanges();
    });
  }

  parseImages(jsonString: string | null | undefined): string[] {
    if (!jsonString) return [];
    try {
      const images = JSON.parse(jsonString);
      return images.map((img: string) => {
        if (!img) return img;
        if (img.startsWith('/uploads/')) return `${API_BASE_URL}${img}`;
        if (!img.startsWith('http') && !img.startsWith('/')) return `${API_BASE_URL}/uploads/${img}`;
        if (img.includes('localhost')) return img.replace(/http:\/\/localhost:\d+/, API_BASE_URL);
        return img;
      });
    } catch (e) {
      return [];
    }
  }

  async confirmDisable(post: any) {
    const alert = await this.alertCtrl.create({
      header: 'Disable Post',
      message: `Are you sure you want to disable this post?`,
      inputs: [{ name: 'reason', type: 'text', placeholder: 'Reason (required)' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Disable', 
          role: 'destructive', 
          handler: (data) => {
            if (!data.reason || !data.reason.trim()) {
              this.showToast('Reason is required', 'warning');
              return false;
            }
            this.disablePost(post.id, data.reason);
            return true;
          } 
        }
      ]
    });
    await alert.present();
  }

  disablePost(id: number, reason: string) {
    this.adminService.disablePost(id, reason).subscribe({
      next: () => {
        this.posts.update(p => p.map(post => post.id === id ? { ...post, status: 'disabled', disabled_reason: reason } : post));
        this.cdr.detectChanges();
        this.showToast('Post disabled', 'success');
      }
    });
  }

  async confirmEnable(post: any) {
    this.adminService.enablePost(post.id).subscribe({
      next: () => {
        this.posts.update(p => p.map(post => post.id === post.id ? { ...post, status: 'published', disabled_reason: null } : post));
        this.cdr.detectChanges();
        this.showToast('Post enabled', 'success');
      }
    });
  }

  async confirmDelete(post: any) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Post',
      message: `Are you sure you want to delete "${post.subject}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => this.deletePost(post.id) }
      ]
    });
    await alert.present();
  }

  deletePost(id: number) {
    this.adminService.deletePost(id).subscribe({
      next: async () => {
        this.posts.update(p => p.filter(post => post.id !== id));
        this.cdr.detectChanges();
        this.showToast('Post deleted', 'success');
      }
    });
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color });
    await toast.present();
  }

    approvePost(id: number) {
    this.adminService.approvePost(id).subscribe(() => {
      this.showToast('Post approved', 'success');
      this.loadPosts(); // I-reload ang listahan
    });
  }

  rejectPost(id: number) {
    this.adminService.rejectPost(id).subscribe(() => {
      this.showToast('Post rejected', 'danger');
      this.loadPosts();
    });
  }
}