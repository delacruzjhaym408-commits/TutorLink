import { Component, OnInit, inject, signal, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonAvatar, IonSpinner, IonButtons, IonBackButton, IonList,
  IonItem, IonLabel, AlertController, IonMenu, MenuController,
  IonMenuToggle, ToastController, IonModal, IonTextarea, IonInput,
  IonRefresher, IonRefresherContent, IonBadge, IonDatetime
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  star, starOutline, starHalf, schoolOutline, chatbubbleEllipsesOutline,
  personOutline, homeOutline, chatbubbleOutline, bookOutline,
  settingsOutline, logOutOutline, menuOutline, flagOutline,
  cameraOutline, cashOutline, checkmarkCircle, copyOutline,
  send, sendOutline, chatbubblesOutline, closeCircleOutline, bulbOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Clipboard } from '@capacitor/clipboard';
import { CalendarService, TutorAvailability } from '../../services/calendar.service';
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
    IonBackButton, IonList, IonItem, IonLabel, IonBadge,
    IonMenuToggle, IonMenu, IonModal, IonTextarea, IonInput,
    IonRefresher, IonRefresherContent, IonDatetime
  ],
})
export class TutorDetailsPage implements OnInit {
  @ViewChild('ratingModal') ratingModal!: IonModal;
  @ViewChild('reportModal') reportModal!: IonModal;
  @ViewChild('paymentModal') paymentModal!: IonModal;
  @ViewChild('scheduleModal') scheduleModal!: IonModal; // 🔥 BAGONG MODAL

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
  private calendarService = inject(CalendarService);
  
  currentUserId: number | null = null;
  todayDate: string = new Date().toISOString();

  tutorAvailabilities = signal<TutorAvailability[]>([]);
  highlightedDates = signal<any[]>([]);
  currentBookedDates = signal<any[]>([]);
  
  // 🔥 SCHEDULE MODAL VARIABLES
  availableStartTime = '';
  availableEndTime = '';
  selectedDateBookedTimes = signal<{ start: string; end: string }[]>([]);
  
  selectedDate = signal<string>(new Date().toISOString());
  selectedStartTime = '';
  selectedEndTime = '';
  bookingSubject = '';
  bookingAmount = signal<number>(0); 
  bookingRef = '';
  bookingReceipt = signal<string | null>(null); 

  post = signal<TutorPost | null>(null);
  tutorGallery = signal<string[]>([]);
  tutorStats = signal<{ average: number, total_reviews: number }>({ average: 5.0, total_reviews: 0 });
  loading = signal(true);
  errorMessage = signal('');
  
  canReview = signal(false);
  canReviewReason = signal('');
  canReviewSource = signal<string | null>(null);

  newRating = 5;
  reviewComment = '';
  reportReason = '';

  tutorLessons = signal<Lesson[]>([]);
  selectedLesson: Lesson | null = null;

  getImageUrl(pic: string | null | undefined): string {
    if (!pic) return 'https://ionicframework.com/docs/img/demos/avatar.svg';
    if (pic.includes('localhost') || pic.includes('127.0.0.1') || pic.match(/http:\/\/192\.168\.\d+\.\d+:\d+/)) {
      return pic.replace(/http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+/, API_BASE_URL);
    }
    if (pic.startsWith('/uploads/')) return `${API_BASE_URL}${pic}`;
    if (!pic.startsWith('http')) return `${API_BASE_URL}/uploads/${pic}`;
    return pic;
  }

  parsePostPictures(pictures: string | null | undefined): string[] {
    if (!pictures) return [];
    try {
      const images = JSON.parse(pictures);
      return images.map((img: string) => this.getImageUrl(img));
    } catch { return []; }
  }

  constructor(public menuController: MenuController) {
    addIcons({
      star, starOutline, starHalf, schoolOutline, chatbubbleEllipsesOutline,
      personOutline, homeOutline, chatbubbleOutline, bookOutline,
      settingsOutline, logOutOutline, menuOutline, flagOutline,
      cameraOutline, cashOutline, checkmarkCircle, copyOutline,
      send, sendOutline, chatbubblesOutline, closeCircleOutline, bulbOutline,
      checkmarkCircleOutline
    });
  }

  ngOnInit() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try { this.currentUserId = JSON.parse(userJson).id || null; } catch (e) {}
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPost(Number(id));
      
      this.route.queryParams.subscribe(params => {
        if (params['apply'] === 'true') {
          setTimeout(() => { this.applyLesson(); }, 500);
        }
      });
    } else {
      this.errorMessage.set('Post ID not found');
      this.loading.set(false);
    }
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
          this.checkCanReview(post.user_id);
        }
      },
      error: () => { 
        this.errorMessage.set('Could not load tutor details.'); 
        this.loading.set(false); 
        this.cdr.detectChanges(); 
      },
    });
  }

  private checkCanReview(tutorId: number) {
    this.tutorPostService.canReviewTutor(tutorId).subscribe({
      next: (res) => {
        this.canReview.set(res.allowed);
        this.canReviewReason.set(res.reason);
        this.canReviewSource.set(res.source);
        this.cdr.detectChanges();
      },
      error: () => {
        this.canReview.set(false);
        this.canReviewReason.set('Unable to check review eligibility.');
        this.canReviewSource.set(null);
        this.cdr.detectChanges();
      }
    });
  }

  private loadTutorGallery(userId: number) {
    this.tutorPostService.getTutorGallery(userId).subscribe({
      next: (res) => { 
        this.tutorGallery.set(res.images || []); 
        this.cdr.detectChanges(); 
      }
    });
  }

  private loadTutorStats(userId: number) {
    this.tutorPostService.getTutorRatingStats(userId).subscribe({
      next: (stats) => { 
        this.tutorStats.set(stats); 
        this.cdr.detectChanges(); 
      }
    });
  }

  async goToMessages() {
    const currentPost = this.post();
    if (!currentPost) return;
    const initialMessage = `Hi! I'm interested in your ${currentPost.subject} post.`;
    const gallery = this.parsePostPictures(currentPost.post_pictures);
    const thumbnail = gallery.length > 0 ? gallery[0] : null;

    this.messageService.startConversation(currentPost.user_id, {
      initialMessage, postId: currentPost.id, postSubject: currentPost.subject, postPicture: thumbnail,
    }).subscribe({
      next: (conv: any) => this.router.navigate(['/chat', conv.id]),
      error: async (err) => {
        if (err?.status === 401) { this.session.logout(); this.router.navigate(['/login']); return; }
        const alert = await this.alertCtrl.create({ header: 'Oops!', message: 'You cannot message yourself.', buttons: ['OK'] });
        await alert.present();
      }
    });
  }

  applyLesson() {
    const currentPost = this.post();
    if (!currentPost) return;

    this.calendarService.getTutorAvailability(currentPost.user_id).subscribe({
      next: (avails) => {
        this.tutorAvailabilities.set(avails);
        
        this.calendarService.getTutorBookedDates(currentPost.user_id).subscribe({
          next: (booked) => {
            this.currentBookedDates.set(booked); 
            this.generateStudentCalendarMarkings(avails, booked);
          },
          error: () => {
            this.currentBookedDates.set([]);
            this.generateStudentCalendarMarkings(avails, []);
          }
        });
      }
    });
    
    this.selectedDate.set(new Date().toISOString());
    this.selectedStartTime = '';
    this.selectedEndTime = '';
    this.bookingSubject = currentPost.subject || '';
    this.bookingAmount.set(0);
    this.bookingRef = '';
    this.bookingReceipt.set(null);
    
    this.paymentModal.present();
  }

  generateStudentCalendarMarkings(avails: TutorAvailability[], booked: any[]) {
    const dates: any[] = [];
    
    for (const b of booked) {
      let color = '';
      if (b.count === 1) color = '#eab308';
      else if (b.count === 2) color = '#f97316';
      else if (b.count >= 3) color = '#ef4444';
      
      dates.push({ date: b.date, backgroundColor: color, textColor: '#ffffff' });
    }

    for (const a of avails) {
      if (a.specific_date) {
        const isBooked = booked.some(b => b.date === a.specific_date);
        if (!isBooked) {
          dates.push({ date: a.specific_date, backgroundColor: '#10b981', textColor: '#ffffff' });
        }
      }
    }

    const today = new Date();
    for (let m = 0; m < 3; m++) {
        const year = today.getFullYear();
        const month = today.getMonth() + m;
        const maxDay = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= maxDay; day++) {
            const y = new Date(year, month, day).getFullYear();
            const mo = String(new Date(year, month, day).getMonth() + 1).padStart(2, '0');
            const da = String(day).padStart(2, '0');
            const dateStr = `${y}-${mo}-${da}`;

            const hasColor = dates.some(d => d.date === dateStr);
            if (!hasColor) {
                dates.push({ date: dateStr, backgroundColor: '#e5e7eb', textColor: '#9ca3af' });
            }
        }
    }
    
    this.highlightedDates.set(dates);
  }

  computeBookingAmount() {
    const currentPost = this.post();
    if (!currentPost || !this.selectedStartTime || !this.selectedEndTime) {
      this.bookingAmount.set(0); 
      return;
    }

    const start = new Date(`1970-01-01T${this.selectedStartTime}:00`);
    const end = new Date(`1970-01-01T${this.selectedEndTime}:00`);
    let diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (diffHours <= 0) {
      this.bookingAmount.set(0);
    } else {
      if (diffHours < 1) diffHours = 1;
      const total = currentPost.hourly_rate * diffHours;
      this.bookingAmount.set(total);
    }
  }

  async copyPostGcashNumber() {
    const currentPost = this.post();
    if (currentPost?.gcash_number) {
      await Clipboard.write({ string: currentPost.gcash_number });
      this.showToast('GCash Number Copied!');
    } else { 
      this.showToast('No GCash number to copy.'); 
    }
  }

  async pickBookingReceipt() {
    try {
      const image = await Camera.getPhoto({ 
        quality: 30, allowEditing: false, resultType: CameraResultType.DataUrl, 
        source: CameraSource.Photos, width: 800, height: 800, correctOrientation: true
      });
      if (image.dataUrl) this.bookingReceipt.set(image.dataUrl);
    } catch (e) { this.showToast('Failed to pick image.'); }
  }

  book1v1Session() {
    const currentPost = this.post();
    if (!currentPost) return;

    if (!this.selectedDate() || !this.selectedStartTime || !this.selectedEndTime) {
      this.showToast('Please select date, start time, and end time.'); return;
    }
    if (!this.bookingAmount() || this.bookingAmount() <= 0) {
      this.showToast('Please select a valid time to compute the amount.'); return;
    }
    if (!this.bookingRef.trim() || !this.bookingReceipt()) {
      this.showToast('Please enter reference number and upload receipt.'); return;
    }

    const dateStr = this.selectedDate().split('T')[0];

    const availableDay = this.tutorAvailabilities().find(a => a.specific_date === dateStr);
    if (!availableDay) {
      this.showToast('🚫 Tutor is not available for this day.'); return;
    }
    if (this.selectedStartTime < availableDay.start_time || this.selectedEndTime > availableDay.end_time) {
      this.showToast(`🚫 Tutor is only available from ${availableDay.start_time} to ${availableDay.end_time}.`); return;
    }

    const bookedInfo = this.currentBookedDates().find(b => b.date === dateStr);
    if (bookedInfo) {
      const hasConflict = bookedInfo.times.some((bookedTime: string) => {
        if (!bookedTime || !bookedTime.includes(' - ')) return false;
        const [bStart, bEnd] = bookedTime.split(' - ').map((t: string) => t.trim());
        return (this.selectedStartTime < bEnd && this.selectedEndTime > bStart);
      });

      if (hasConflict) {
        this.showToast('🚫 Sorry, your chosen time conflicts with an existing booking.');
        return;
      }
    }

    this.lessonService.apply1v1Session({
      post_id: currentPost.id,
      reference: this.bookingRef.trim(),
      receipt: this.bookingReceipt(),
      amount: this.bookingAmount(),
      session_date: dateStr,
      start_time: this.selectedStartTime,
      end_time: this.selectedEndTime
    }).subscribe({
      next: () => {
        this.paymentModal.dismiss();
        this.showToast('1v1 Session Application Submitted! Wait for tutor approval.');
        this.router.navigate(['/my-lesson']);
      },
      error: (err) => this.showToast(err.error?.detail || 'Error booking session.')
    });
  }

  // 🔥 FORMAT TIME: 08:00 -> 8:00 AM
  formatTimeDisplay(time: string): string {
    if (!time) return 'TBA';
    const parts = time.split(':');
    const hour = parseInt(parts[0], 10);
    const minute = parts[1] || '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute} ${ampm}`;
  }

  // 🔥 ON DATE CHANGE (Gagamit ng Custom Modal)
  async onBookingDateChange(event: any) {
    const val = event.detail.value;
    if (typeof val === 'string') {
      const dateStr = val.split('T')[0];
      
      const hasAvail = this.tutorAvailabilities().find(a => a.specific_date === dateStr);
      const bookedInfo = this.currentBookedDates().find(b => b.date === dateStr);

      if (!hasAvail) {
        this.showToast('🚫 Tutor is not available for this day.');
        this.selectedDate.set(new Date().toISOString());
        return;
      }

      this.selectedDate.set(val);
      this.computeBookingAmount(); 

      // 🔥 SET VARIABLES PARA SA MODAL
      this.availableStartTime = hasAvail.start_time;
      this.availableEndTime = hasAvail.end_time;

      if (bookedInfo && bookedInfo.times.length > 0) {
        const parsedTimes = bookedInfo.times
          .filter((t: string) => t && t.includes(' - '))
          .map((t: string) => {
            const [start, end] = t.split(' - ').map((s: string) => s.trim());
            return { start, end };
          });
        this.selectedDateBookedTimes.set(parsedTimes);
      } else {
        this.selectedDateBookedTimes.set([]);
      }

      // 🔥 BUKSAN ANG CUSTOM MODAL
      await this.scheduleModal.present();
    }
  }

  selectLesson(lesson: Lesson) { this.selectedLesson = lesson; }

  submitReview() {
    const currentPost = this.post();
    if (!currentPost) return;
    
    if (!this.canReview()) { 
      this.showToast(this.canReviewReason() || 'You cannot review this tutor yet.'); 
      return; 
    }

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    
    this.http.post(`${API_BASE_URL}/reviews/tutor/${currentPost.user_id}`, { 
      rating: this.newRating, 
      comment: this.reviewComment 
    }, { headers }).subscribe({
      next: async () => {
        this.ratingModal.dismiss(); 
        this.reviewComment = '';
        const toast = await this.toastCtrl.create({ message: 'Thank you for your review!', duration: 2500, color: 'success' });
        await toast.present(); 
        
        this.loadPost(currentPost.id);
        this.checkCanReview(currentPost.user_id);
      },
      error: async (err) => {
        const toast = await this.toastCtrl.create({ message: err.error?.detail || 'Error submitting review', duration: 2500, color: 'danger' });
        await toast.present();
      }
    });
  }

  async showReviewBlockedMessage() {
    const reason = this.canReviewReason() || 'You cannot review this tutor yet.';
    const toast = await this.toastCtrl.create({ message: reason, duration: 2500, color: 'warning' });
    await toast.present();
  }

  submitReport() {
    const currentPost = this.post();
    if (!currentPost || !this.reportReason.trim()) return;
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.post(`${API_BASE_URL}/reports`, { reported_user_id: currentPost.user_id, reason: this.reportReason }, { headers }).subscribe({
      next: async () => {
        this.reportModal.dismiss(); this.reportReason = '';
        const toast = await this.toastCtrl.create({ message: 'Report submitted.', duration: 2500, color: 'warning' });
        await toast.present();
      },
      error: async (err) => {
        const toast = await this.toastCtrl.create({ message: err.error?.detail || 'Error submitting report', duration: 2500, color: 'danger' });
        await toast.present();
      }
    });
  }

  getQrImageSrc(qrData: string | null | undefined): string {
    if (!qrData) return '';
    
    if (qrData.startsWith('<img')) {
      const match = qrData.match(/src="([^"]+)"/);
      if (match && match[1]) return match[1];
    }
    
    if (qrData.startsWith('data:image')) {
      return qrData;
    }

    if (qrData.length > 100 && !qrData.includes('/')) {
      return `data:image/jpeg;base64,${qrData}`;
    }
    
    return this.getImageUrl(qrData);
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
            this.checkCanReview(post.user_id);
          }
          event.target.complete();
        },
        error: () => event.target.complete()
      });
    } else event.target.complete();
  }

  setRating(stars: number) { this.newRating = stars; }

  goToHome() { this.menuController.close('main-menu'); this.router.navigate(['/home']); }
  goToProfile() { this.menuController.close('main-menu'); this.router.navigate(['/profile']); }
  goToMessagesPage() { this.menuController.close('main-menu'); this.router.navigate(['/messages']); }
  goToMyLesson() { this.menuController.close('main-menu'); this.router.navigate(['/my-lesson']); }
  goToSettings() { this.menuController.close('main-menu'); this.router.navigate(['/settings']); }
  logout() { this.menuController.close('main-menu'); this.session.logout(); this.router.navigate(['/login']); }
}