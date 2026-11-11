import { Component, OnInit, inject, signal, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonAvatar, IonSpinner, IonButtons, IonBackButton, IonList,
  IonItem, IonLabel, AlertController, IonMenu, MenuController,
  IonMenuToggle, ToastController, IonModal, IonTextarea, IonInput,
  IonRefresher, IonRefresherContent
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  star, starOutline, starHalf, schoolOutline, chatbubbleEllipsesOutline,
  personOutline, homeOutline, chatbubbleOutline, bookOutline,
  settingsOutline, logOutOutline, menuOutline, flagOutline,
  cameraOutline, cashOutline, checkmarkCircle, copyOutline,
  send, sendOutline, chatbubblesOutline
} from 'ionicons/icons';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Clipboard } from '@capacitor/clipboard';

import { TutorPost, TutorPostService } from '../../services/tutor-post.service';
import { MessageService } from '../../services/message.service';
import { SessionService } from '../../services/session.service';
import { LessonService, Lesson } from '../../services/lesson.service';
import { API_BASE_URL } from '../../config';

@Component({
  selector: 'app-tutor-details',
  templateUrl: './tutor-details.page.html',
  styleUrls: ['./tutor-details.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon, IonAvatar, IonSpinner, IonButtons,
    IonBackButton, IonList, IonItem, IonLabel,
    IonMenuToggle, IonMenu, IonModal, IonTextarea, IonInput,
    IonRefresher, IonRefresherContent
  ],
})
export class TutorDetailsPage implements OnInit {
  @ViewChild('ratingModal') ratingModal!: IonModal;
  @ViewChild('reportModal') reportModal!: IonModal;
  @ViewChild('paymentModal') paymentModal!: IonModal;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tutorPostService = inject(TutorPostService);
  private messageService = inject(MessageService);
  private session = inject(SessionService);
  private cdr = inject(ChangeDetectorRef);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private lessonService = inject(LessonService);
  private http = inject(HttpClient);

  post = signal<TutorPost | null>(null);
  tutorGallery = signal<string[]>([]);
  tutorStats = signal<{ average: number, total_reviews: number }>({ average: 5.0, total_reviews: 0 });
  loading = signal(true);
  errorMessage = signal('');
  
  hasConversation = signal(false);

  newRating = 5;
  reviewComment = '';
  reportReason = '';

  tutorLessons = signal<Lesson[]>([]);
  selectedLesson: Lesson | null = null;
  paymentRef = '';
  paymentReceipt = signal<string | null>(null);

  getImageUrl(pic: string | null | undefined): string {
    if (!pic) return 'https://ionicframework.com/docs/img/demos/avatar.svg';
    
    if (pic.includes('localhost') || pic.includes('127.0.0.1') || pic.match(/http:\/\/192\.168\.\d+\.\d+:\d+/)) {
      return pic.replace(/http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+/, API_BASE_URL);
    }
    
    if (pic.startsWith('/uploads/')) {
      return `${API_BASE_URL}${pic}`;
    }
    if (!pic.startsWith('http')) {
      return `${API_BASE_URL}/uploads/${pic}`;
    }
    
    return pic;
  }

  parsePostPictures(pictures: string | null | undefined): string[] {
    if (!pictures) return [];
    try {
      const images = JSON.parse(pictures);
      return images.map((img: string) => this.getImageUrl(img));
    } catch {
      return [];
    }
  }

  constructor(public menuController: MenuController) {
    addIcons({
      star, starOutline, starHalf, schoolOutline, chatbubbleEllipsesOutline,
      personOutline, homeOutline, chatbubbleOutline, bookOutline,
      settingsOutline, logOutOutline, menuOutline, flagOutline,
      cameraOutline, cashOutline, checkmarkCircle, copyOutline,
      send, sendOutline, chatbubblesOutline
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadPost(Number(id));
    else { this.errorMessage.set('Post ID not found'); this.loading.set(false); }
  }

  private loadPost(id: number) {
    this.tutorPostService.getPostById(id).subscribe({
      next: (post) => {
        this.post.set(post);
        this.loading.set(false);
        this.cdr.detectChanges();
        if (post.user_id) {
          this.loadTutorGallery(post.user_id);
          this.loadTutorStats(post.user_id);
          this.checkConversation(post.user_id);
        }
      },
      error: () => { this.errorMessage.set('Could not load tutor details.'); this.loading.set(false); this.cdr.detectChanges(); },
    });
  }

  private checkConversation(tutorId: number) {
    this.messageService.checkConversation(tutorId).subscribe({
      next: (res) => {
        this.hasConversation.set(res.exists);
        this.cdr.detectChanges();
      }
    });
  }

  private loadTutorGallery(userId: number) {
    this.tutorPostService.getTutorGallery(userId).subscribe({
      next: (res) => { this.tutorGallery.set(res.images || []); this.cdr.detectChanges(); }
    });
  }

  private loadTutorStats(userId: number) {
    this.tutorPostService.getTutorRatingStats(userId).subscribe({
      next: (stats) => { this.tutorStats.set(stats); this.cdr.detectChanges(); }
    });
  }

  async goToMessages() {
    const currentPost = this.post();
    if (!currentPost) return;

    const initialMessage = `Hi! I'm interested in your ${currentPost.subject} post.`;
    const gallery = this.parsePostPictures(currentPost.post_pictures);
    const thumbnail = gallery.length > 0 ? gallery[0] : null;

    this.messageService.startConversation(currentPost.user_id, {
      initialMessage,
      postId: currentPost.id,
      postSubject: currentPost.subject,
      postPicture: thumbnail,
    }).subscribe({
      next: (conv: any) => this.router.navigate(['/chat', conv.id]),
      error: async (err) => {
        if (err?.status === 401) {
          this.session.logout();
          this.router.navigate(['/login']);
          return;
        }
        const alert = await this.alertCtrl.create({ header: 'Oops!', message: 'You cannot message yourself.', buttons: ['OK'] });
        await alert.present();
      }
    });
  }

  applyLesson() {
    const currentPost = this.post();
    if (!currentPost) return;

    this.lessonService.getTutorLessons(currentPost.user_id).subscribe({
      next: (lessons: Lesson[]) => {
        if (lessons.length === 0) {
          this.showToast('This tutor has no Group Chats yet.');
          return;
        }
        this.tutorLessons.set(lessons);
        this.selectedLesson = null;
        this.paymentRef = '';
        this.paymentReceipt.set(null);
        this.paymentModal.present();
      },
      error: () => this.showToast('Error fetching tutor lessons.')
    });
  }

  selectLesson(lesson: Lesson) { this.selectedLesson = lesson; }

  // 🔥 FINAL FIX: Deretso Gallery at may error logging
  async pickReceipt() {
    try {
      const image = await Camera.getPhoto({ 
        quality: 30,
        allowEditing: false,
        resultType: CameraResultType.DataUrl, 
        source: CameraSource.Photos, // 🔥 Deretso Gallery
        width: 800,
        height: 800,
        correctOrientation: true
      });
      
      console.log('📷 Image picked:', image);
      
      if (image.dataUrl) {
        this.paymentReceipt.set(image.dataUrl);
        console.log('✅ Receipt set successfully');
      }
    } catch (e) {
      console.error('❌ Camera cancelled or error:', e);
      this.showToast('Failed to pick image. Please check permissions.');
    }
  }

  async copyGcashNumber() {
    if (this.selectedLesson?.gcash_number) {
      await Clipboard.write({
        string: this.selectedLesson.gcash_number
      });
      this.showToast('GCash Number Copied!');
    } else {
      this.showToast('No GCash number to copy.');
    }
  }

  submitPayment() {
    if (!this.selectedLesson || !this.paymentRef.trim() || !this.paymentReceipt()) {
      this.showToast('Please select a lesson, enter reference number, and upload receipt.');
      return;
    }

    this.lessonService.applyWithPayment({
      lesson_id: this.selectedLesson.id,
      reference_number: this.paymentRef.trim(),
      receipt_base64: this.paymentReceipt()
    }).subscribe({
      next: () => {
        this.paymentModal.dismiss();
        this.showToast('Payment submitted! Wait for tutor approval.');
        this.router.navigate(['/my-lesson']);
      },
      error: (err) => this.showToast(err.error?.detail || 'Error submitting payment.')
    });
  }

  setRating(stars: number) { this.newRating = stars; }

  submitReview() {
    const currentPost = this.post();
    if (!currentPost) return;
    
    if (!this.hasConversation()) {
      this.showToast('You can only rate a tutor after having a conversation.');
      return;
    }

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.post(`${API_BASE_URL}/reviews/tutor/${currentPost.user_id}`, { rating: this.newRating, comment: this.reviewComment }, { headers }).subscribe({
      next: async () => {
        this.ratingModal.dismiss();
        this.reviewComment = '';
        const toast = await this.toastCtrl.create({ message: 'Thank you for your review!', duration: 2500, color: 'success' });
        await toast.present();
        this.loadPost(currentPost.id);
      },
      error: async (err) => {
        const toast = await this.toastCtrl.create({ message: err.error?.detail || 'Error submitting review', duration: 2500, color: 'danger' });
        await toast.present();
      }
    });
  }

  submitReport() {
    const currentPost = this.post();
    if (!currentPost || !this.reportReason.trim()) return;
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.post(`${API_BASE_URL}/reports`, { reported_user_id: currentPost.user_id, reason: this.reportReason }, { headers }).subscribe({
      next: async () => {
        this.reportModal.dismiss();
        this.reportReason = '';
        const toast = await this.toastCtrl.create({ message: 'Report submitted. Admin will review it.', duration: 2500, color: 'warning' });
        await toast.present();
      },
      error: async (err) => {
        const toast = await this.toastCtrl.create({ message: err.error?.detail || 'Error submitting report', duration: 2500, color: 'danger' });
        await toast.present();
      }
    });
  }

  async showToast(msg: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color: 'primary' });
    await toast.present();
  }

  doRefresh(event: any) {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.tutorPostService.getPostById(Number(id)).subscribe({
        next: (post) => {
          this.post.set(post);
          if (post.user_id) {
            this.loadTutorGallery(post.user_id);
            this.loadTutorStats(post.user_id);
            this.checkConversation(post.user_id);
          }
          event.target.complete();
        },
        error: () => {
          event.target.complete();
        }
      });
    } else {
      event.target.complete();
    }
  }

  goToHome() { this.menuController.close('main-menu'); this.router.navigate(['/home']); }
  goToProfile() { this.menuController.close('main-menu'); this.router.navigate(['/profile']); }
  goToMessagesPage() { this.menuController.close('main-menu'); this.router.navigate(['/messages']); }
  goToMyLesson() { this.menuController.close('main-menu'); this.router.navigate(['/my-lesson']); }
  goToSettings() { this.menuController.close('main-menu'); this.router.navigate(['/settings']); }
  logout() { this.menuController.close('main-menu'); this.session.logout(); this.router.navigate(['/login']); }
}