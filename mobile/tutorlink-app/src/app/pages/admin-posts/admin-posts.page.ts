import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonIcon, IonBackButton, IonButtons,
  AlertController, ToastController, IonSpinner, IonCard, IonRefresher, IonRefresherContent
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trashOutline, star, peopleOutline } from 'ionicons/icons';
import { AdminService } from '../../services/admin.service';
import { API_BASE_URL } from '../../config';

@Component({
  selector: 'app-admin-posts',
  templateUrl: './admin-posts.page.html',
  styleUrls: ['./admin-posts.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon, IonBackButton, IonButtons, IonSpinner, IonCard, IonRefresher, IonRefresherContent
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
    addIcons({ trashOutline, star, peopleOutline });
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

      // Kung relative path
      if (img.startsWith('/uploads/')) {
        return `${API_BASE_URL}${img}`;
      }
      if (!img.startsWith('http') && !img.startsWith('/')) {
        return `${API_BASE_URL}/uploads/${img}`;
      }

      // 🔥 AYUSIN: Palitan ang lumang localhost sa API_BASE_URL
      if (img.includes('localhost')) {
        return img.replace(/http:\/\/localhost:\d+/, API_BASE_URL);
      }
      return img;
    });
  } catch (e) {
    return [];
  }
}

  async confirmDelete(post: any) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Post',
      message: `Are you sure you want to delete the post "${post.subject}" by ${post.tutor_name}?`,
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
        const toast = await this.toastCtrl.create({ message: 'Post deleted', duration: 2000, color: 'success' });
        await toast.present();
      }
    });
  }
}