import { Component, OnInit, ChangeDetectorRef, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonButton,
  IonIcon, IonCard, IonSpinner, IonButtons, IonFab,
  IonFabButton, MenuController, AlertController, ToastController,
  IonModal, IonTextarea, IonRefresher, IonRefresherContent
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  menuOutline, starOutline, star, chatbubbleEllipsesOutline, addOutline,
  flagOutline, peopleOutline,
  schoolOutline, chatbubblesOutline
} from 'ionicons/icons';
import { MessageService } from '../services/message.service';
import { TutorPost, TutorPostService } from '../services/tutor-post.service';
import { API_BASE_URL } from '../config';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonButton,
    IonIcon, IonCard, IonSpinner, IonButtons, IonFab,
    IonFabButton, IonModal, IonTextarea, IonRefresher, IonRefresherContent
  ],
})
export class HomePage implements OnInit {
  @ViewChild('reportModal') reportModal!: IonModal;

  posts: TutorPost[] = [];
  loading = false;
  searchQuery = '';
  currentUserId: number | string | null = null;

  selectedPostToReport: any = null;
  reportReason = '';

  private tutorPostService = inject(TutorPostService);
  private router = inject(Router);
  private menuController = inject(MenuController);
  private cdr = inject(ChangeDetectorRef);
  private messageService = inject(MessageService);
  private alertCtrl = inject(AlertController);
  private http = inject(HttpClient);
  private toastCtrl = inject(ToastController);

  constructor() {
    addIcons({ 
      menuOutline, starOutline, star, chatbubbleEllipsesOutline, addOutline,
      flagOutline, peopleOutline,
      schoolOutline, chatbubblesOutline,
    });
  }

  ngOnInit() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        this.currentUserId = user.id ?? null;
      } catch (e) {}
    }
    this.loadPosts();
  }

  // 🔥 IDINAGDAG: PULL TO REFRESH FUNCTION
  doRefresh(event: any) {
    this.tutorPostService.getAllPosts(this.searchQuery).subscribe({
      next: (posts) => {
        this.posts = posts;
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      }
    });
  }

  loadPosts() {
    this.loading = true;
    this.cdr.detectChanges();
    this.tutorPostService.getAllPosts(this.searchQuery).subscribe({
      next: (posts) => {
        this.posts = posts;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onSearchChange(event: any) {
    this.searchQuery = event.detail.value || '';
    this.loadPosts();
  }

  async openMenu() {
    await this.menuController.open();
  }

  goToTutorDetails(post: TutorPost) {
    this.router.navigate(['/tutor-details', post.id]);
  }

  goToCreatePost() {
    this.router.navigate(['/create-post']);
  }

  async goToMessages(post: TutorPost) {
    if (this.currentUserId !== null && post.user_id === this.currentUserId) {
      await this.showAlert('Oops!', 'You cannot message yourself.');
      return;
    }

    const images = this.parseImages(post.post_pictures);
    const thumbnail = images.length > 0 ? images[0] : null;

    const initialMessage = `Hi! I'm interested in your ${post.subject} post.`;

    this.messageService.startConversation(post.user_id, {
      initialMessage,
      postId: post.id,
      postSubject: post.subject,
      postPicture: thumbnail,
    }).subscribe({
      next: (conv: any) => this.router.navigate(['/chat', conv.id]),
      error: async () => {
        await this.showAlert('Oops!', 'Unable to start the conversation. Please try again.');
      },
    });
  }

  openReportModal(post: any) {
    this.selectedPostToReport = post;
    this.reportReason = '';
    this.reportModal.present();
  }

  submitReport() {
    if (!this.selectedPostToReport || !this.reportReason.trim()) return;

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    const postId = this.selectedPostToReport?.id;
    
    if (!postId) {
      this.showToast('Error: Post ID is missing.', 'danger');
      return;
    }

    if (this.reportReason.trim().length < 5) {
       this.showToast('Reason must be at least 5 characters.', 'warning');
       return;
    }

    this.http.post(`${API_BASE_URL}/reports`, {
      reported_post_id: Number(postId),
      reason: this.reportReason.trim()
    }, { headers }).subscribe({
      next: async () => {
        this.reportModal.dismiss();
        this.reportReason = '';
        const toast = await this.toastCtrl.create({ message: 'Report submitted. Admin will review it.', duration: 2500, color: 'warning' });
        await toast.present();
      },
      error: async (err) => {
        console.error("Report Error:", err);
        const errorMsg = err.error?.detail ? JSON.stringify(err.error.detail) : 'Error submitting report';
        const toast = await this.toastCtrl.create({ message: errorMsg, duration: 3000, color: 'danger' });
        await toast.present();
      }
    });
  }

  parseImages(jsonString: string | null | undefined): string[] {
    if (!jsonString) return [];
    try {
      const images = JSON.parse(jsonString);
      return images.map((img: string) => {
        if (!img) return img;
        
        if (img.includes('localhost')) {
          return img.replace(/http:\/\/localhost:\d+/, API_BASE_URL);
        }
        
        if (img.startsWith('/uploads/')) {
          return `${API_BASE_URL}${img}`;
        }
        if (!img.startsWith('http') && !img.startsWith('/')) {
          return `${API_BASE_URL}/uploads/${img}`;
        }
        
        return img;
      });
    } catch (e) {
      return [];
    }
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({ header, message, buttons: ['OK'] });
    await alert.present();
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color });
    await toast.present();
  }
}