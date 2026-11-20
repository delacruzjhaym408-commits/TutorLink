import { Component, OnInit, inject, signal, ChangeDetectorRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonAvatar, IonSpinner, IonButtons, IonBackButton, IonList, IonItem,
  IonLabel, AlertController, IonMenu, MenuController, IonMenuToggle,
  ToastController, IonModal, IonTextarea, IonInput, IonRefresher,
  IonRefresherContent, IonBadge, IonSegment, IonSegmentButton,
  IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, IonImg
} from '@ionic/angular';
import { 
  homeOutline, personOutline, chatbubbleOutline, settingsOutline, 
  bookOutline, logOutOutline, menuOutline, addOutline, 
  peopleOutline, calendarOutline, timeOutline, cameraOutline,
  checkmarkCircleOutline, closeCircleOutline, cashOutline,
  chatbubblesOutline, chatbubbleEllipsesOutline, trashOutline
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { LessonService, Enrollment } from '../../services/lesson.service';
import { SessionService } from '../../services/session.service';
import { AppStateService } from '../../services/app-state.service';
import { API_BASE_URL } from '../../config';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-my-lesson',
  templateUrl: './my-lesson.page.html',
  styleUrls: ['./my-lesson.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon, IonAvatar, IonSpinner, IonButtons, IonBackButton,
    IonList, IonItem, IonLabel, IonMenuToggle, IonMenu, IonModal,
    IonTextarea, IonInput, IonRefresher, IonRefresherContent, IonBadge,
    IonSegment, IonSegmentButton, IonCard, IonCardHeader, IonCardSubtitle,
    IonCardTitle, IonCardContent, IonImg
  ],
})
export class MyLessonPage implements OnInit {
  private lessonService = inject(LessonService);
  private session = inject(SessionService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private appState = inject(AppStateService);
  
  activeTab = signal<string>('students'); 
  paymentTab = signal<string>('pending'); 
  
  isReceiptModalOpen = signal(false);
  selectedReceiptImage = signal<string>('');

  enrollments = signal<Enrollment[]>([]);
  tutorStudents = signal<any[]>([]);
  loading = signal(true);
  currentUser = this.session.user;
  
  isTutor = computed(() => this.currentUser()?.role === 'tutor' || this.tutorStudents().length > 0); 

  // 🔥 COMPUTED SIGNAL PARA SA BADGE
  pendingPaymentCount = computed(() => {
    if (!this.isTutor()) return 0;
    return this.tutorStudents().filter(s => s.status === 'pending_payment').length;
  });

  // 🔥 CANCEL MODAL SIGNALS
  isCancelModalOpen = signal(false);
  cancelReason = '';
  refundProofReceipt = signal<string | null>(null);
  selectedSessionToCancel: any = null;

  constructor(public menuController: MenuController) {
    addIcons({ 
      homeOutline, personOutline, chatbubbleOutline, settingsOutline, 
      bookOutline, logOutOutline, menuOutline, addOutline, 
      peopleOutline, calendarOutline, timeOutline, cameraOutline,
      checkmarkCircleOutline, closeCircleOutline, cashOutline,
      chatbubblesOutline, chatbubbleEllipsesOutline, trashOutline
    });
  }

  ngOnInit() {
    this.loadLessons();
    this.loadStudents();
  }

  ionViewWillEnter() {
    this.loadLessons();
    this.loadStudents();
  }

  loadLessons() {
    this.loading.set(true);
    this.lessonService.getMyEnrollments().subscribe({
      next: (data) => { 
        this.enrollments.set(data); 
        this.loading.set(false); 
        this.cdr.detectChanges(); 
      },
      error: () => { 
        this.loading.set(false); 
        this.cdr.detectChanges(); 
      },
    });
  }

  loadStudents() {
    this.lessonService.getTutorStudents().subscribe({
      next: (data) => {
        this.tutorStudents.set(data);
        this.cdr.detectChanges();
      }
    });
  }

  getFilteredSessions(status: string) {
    if (this.isTutor()) { 
      return this.tutorStudents().filter((s: any) => s.status === status);
    } else {
      return this.enrollments().filter((e: any) => e.status === status);
    }
  }

  getImageUrl(pic: string | null | undefined): string {
    if (!pic) return 'https://ionicframework.com/docs/img/demos/avatar.svg';
    if (pic.includes('localhost') || pic.includes('127.0.0.1') || pic.match(/http:\/\/192\.168\.\d+\.\d+:\d+/)) {
      return pic.replace(/http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+/, API_BASE_URL);
    }
    if (pic.startsWith('/uploads/')) return `${API_BASE_URL}${pic}`;
    if (!pic.startsWith('http')) return `${API_BASE_URL}/uploads/${pic}`;
    return pic;
  }

  async markAsDone(s: any) {
    const alert = await this.alertCtrl.create({
      header: 'Mark as Done',
      message: `Mark session with ${s.full_name} as completed?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Yes, Done', 
          handler: () => {
            this.lessonService.markAsCompleted(s.enrollment_id).subscribe({
              next: () => {
                this.showToast('Session marked as completed!');
                this.loadLessons();
                this.loadStudents();
                window.dispatchEvent(new CustomEvent('refreshCalendar'));
              },
              error: (err) => this.showToast(err.error?.detail || 'Failed to mark as done.')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  openCancelModal(s: any) {
    this.selectedSessionToCancel = s;
    this.cancelReason = '';
    this.refundProofReceipt.set(null);
    this.isCancelModalOpen.set(true);
  }

  async pickRefundProof() {
    try {
      const image = await Camera.getPhoto({ 
        quality: 30, allowEditing: false, resultType: CameraResultType.DataUrl, 
        source: CameraSource.Photos, width: 800, height: 800, correctOrientation: true
      });
      if (image.dataUrl) this.refundProofReceipt.set(image.dataUrl);
    } catch (e) { this.showToast('Failed to pick image.'); }
  }

  submitCancellation() {
    if (!this.selectedSessionToCancel || !this.cancelReason.trim()) return;

    this.lessonService.cancelSessionWithReason(
      this.selectedSessionToCancel.enrollment_id,  
      this.cancelReason.trim(), 
      this.refundProofReceipt() || undefined
    ).subscribe({
      next: () => {
        this.showToast('Session cancelled successfully.');
        this.isCancelModalOpen.set(false);
        this.loadLessons();
        this.loadStudents();
        window.dispatchEvent(new CustomEvent('refreshCalendar'));
      },
      error: (err) => this.showToast(err.error?.detail || 'Failed to cancel session.')
    });
  }

  async cancelSession(s: any) {
    const alert = await this.alertCtrl.create({
      header: 'Cancel Session',
      message: `Sigurado ka bang gusto mong i-cancel ang session kay ${s.full_name}?`,
      buttons: [
        { text: 'No', role: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          role: 'destructive',
          handler: () => {
            this.lessonService.kickMember(s.lesson_id, s.student_id).subscribe({
              next: () => {
                this.showToast('Session Cancelled.');
                this.loadLessons();
                this.loadStudents();
                window.dispatchEvent(new CustomEvent('refreshCalendar'));
              },
              error: () => this.showToast('Failed to cancel session.')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  approveStudent(studentId: number, lessonId: number) {
    this.lessonService.approvePayment(lessonId, studentId).subscribe({
      next: () => {
        this.showToast('Student Approved!');
        this.loadStudents();
        this.loadLessons();
        this.appState.triggerRefreshBadges(); 
        window.dispatchEvent(new CustomEvent('refreshCalendar'));
      },
      error: () => this.showToast('Error approving student.')
    });
  }

  async rejectStudent(studentId: number, lessonId: number) {
    const alert = await this.alertCtrl.create({
      header: 'Reject Application',
      message: 'Please state the reason for rejection:',
      inputs: [{ name: 'reason', type: 'textarea', placeholder: 'e.g. Fake receipt' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject',
          handler: (data) => {
            if (!data.reason || !data.reason.trim()) {
              this.showToast('Please provide a reason.');
              return false; 
            }
            
            this.lessonService.rejectPayment(lessonId, studentId, data.reason.trim()).subscribe({
              next: () => {
                this.showToast('Student Rejected.');
                this.loadStudents();
                this.loadLessons();
                this.appState.triggerRefreshBadges(); 
                window.dispatchEvent(new CustomEvent('refreshCalendar'));
              },
              error: () => this.showToast('Error rejecting student.')
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(msg: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color: 'primary' });
    await toast.present();
  }

  doRefresh(event: any) {
    this.lessonService.getMyEnrollments().subscribe({
      next: (data) => {
        this.enrollments.set(data);
        this.loadStudents();
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      }
    });
  }

  openReceipt(base64Image: string) {
    if (!base64Image) return;
    
    let cleanImage = base64Image;
    
    if (cleanImage.startsWith('<img')) {
      const match = cleanImage.match(/src="([^"]+)"/);
      if (match && match[1]) {
        cleanImage = match[1];
      }
    }
    
    if (!cleanImage.startsWith('data:image') && cleanImage.length > 100) {
      cleanImage = `data:image/jpeg;base64,${cleanImage}`;
    }

    this.selectedReceiptImage.set(cleanImage);
    this.isReceiptModalOpen.set(true);
  }

  goToChat(conversationId: number | null | undefined) {
    if (!conversationId) {
      this.showToast('Conversation is being prepared. Please refresh in a moment.');
      return;
    }
    this.router.navigate(['/chat', conversationId]);
  }

  goToHome() { this.menuController.close('main-menu'); this.router.navigate(['/home']); }
  goToProfile() { this.menuController.close('main-menu'); this.router.navigate(['/profile']); }
  goToMessagesPage() { this.menuController.close('main-menu'); this.router.navigate(['/messages']); }
  goToMyLesson() { this.menuController.close('main-menu'); this.router.navigate(['/my-lesson']); }
  goToSettings() { this.menuController.close('main-menu'); this.router.navigate(['/settings']); }
  logout() { this.menuController.close('main-menu'); this.session.logout(); this.router.navigate(['/login']); }
}