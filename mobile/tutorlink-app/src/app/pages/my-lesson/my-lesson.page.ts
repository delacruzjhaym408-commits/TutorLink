import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
  IonLabel, IonAvatar, IonButtons, IonBackButton, IonSpinner,
  IonBadge, IonMenu, IonIcon, IonButton, MenuController, IonMenuToggle,
  AlertController, ToastController, IonModal, IonInput, IonTextarea,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonImg, IonSegment, IonSegmentButton
} from '@ionic/angular';
import { 
  homeOutline, personOutline, chatbubbleOutline, settingsOutline, 
  bookOutline, logOutOutline, menuOutline, addOutline, 
  peopleOutline, calendarOutline, timeOutline, cameraOutline,
  checkmarkCircleOutline, closeCircleOutline, cashOutline
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { LessonService, Enrollment } from '../../services/lesson.service';
import { SessionService } from '../../services/session.service';
import { AppStateService } from '../../services/app-state.service';

@Component({
  selector: 'app-my-lesson',
  templateUrl: './my-lesson.page.html',
  styleUrls: ['./my-lesson.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonAvatar, IonButtons, IonBackButton,
    IonSpinner, IonBadge, IonMenu, IonIcon, IonButton, IonMenuToggle,
    IonModal, IonInput, IonTextarea, IonCard, IonCardHeader, IonCardTitle, 
    IonCardContent, IonImg, IonSegment, IonSegmentButton
  ],
})
export class MyLessonPage implements OnInit, OnDestroy {
  @ViewChild('createGcModal') createGcModal!: IonModal;

  private lessonService = inject(LessonService);
  private session = inject(SessionService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private appState = inject(AppStateService);

  activeTab = signal<string>('gc'); // 'gc' | 'students' | 'payments'
  
  enrollments = signal<Enrollment[]>([]);
  tutorStudents = signal<any[]>([]);
  loading = signal(true);
  currentUser = this.session.user;

  // PAYMENTS FILTER
  paymentFilter = signal<string>('pending'); // 'pending' | 'approved' | 'rejected'

  newGcName = '';
  newGcDescription = '';
  newGcPhoto = signal<string | null>(null);
  newGcNumber = '';
  newMonthlyRate: number | null = null;

  selectedLessonId = signal<number | null>(null);
  members = signal<any[]>([]);
  loadingMembers = signal(false);

  pendingCounts: { [lessonId: number]: number } = {};

  private pollingInterval: any;

  constructor(public menuController: MenuController) {
    addIcons({ 
      homeOutline, personOutline, chatbubbleOutline, settingsOutline, 
      bookOutline, logOutOutline, menuOutline, addOutline, 
      peopleOutline, calendarOutline, timeOutline, cameraOutline,
      checkmarkCircleOutline, closeCircleOutline, cashOutline 
    });
  }

  ngOnInit() { 
    this.loadLessons(); 
    this.loadStudents();
    this.pollingInterval = setInterval(() => {
      this.fetchLessonsSilently();
    }, 5000);
  }

  ngOnDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
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
        this.checkPendingCounts(); 
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
        // Naka-group by GC
        const grouped: any = {};
        data.forEach(s => {
          if (!grouped[s.lesson_name]) grouped[s.lesson_name] = [];
          grouped[s.lesson_name].push(s);
        });
        
        // I-convert sa array para sa *ngFor
        const groupedArray = Object.keys(grouped).map(key => ({
          gc_name: key,
          students: grouped[key]
        }));
        
        this.tutorStudents.set(groupedArray);
        this.cdr.detectChanges();
      }
    });
  }

  fetchLessonsSilently() {
    this.lessonService.getMyEnrollments().subscribe({
      next: (data) => {
        this.enrollments.set(data);
        this.checkPendingCounts(); 
        this.cdr.detectChanges();
      }
    });
  }

  checkPendingCounts() {
    for (let item of this.enrollments()) {
      if (this.isTutor(item)) {
        this.lessonService.getLessonMembers(item.lesson.id).subscribe({
          next: (members) => {
            const pending = members.filter(m => m.status === 'pending_payment').length;
            this.pendingCounts[item.lesson.id] = pending;
            this.cdr.detectChanges();
          }
        });
      }
    }
  }

  openCreateGcModal() {
    this.newGcName = '';
    this.newGcDescription = '';
    this.newGcPhoto.set(null);
    this.newGcNumber = '';
    this.newMonthlyRate = null;
    this.createGcModal.present();
  }

  async pickGcImage() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });
      if (image.dataUrl) {
        this.newGcPhoto.set(image.dataUrl);
      }
    } catch (e) {}
  }

  saveGroupChat() {
    if (!this.newGcName.trim() || !this.newGcNumber.trim() || !this.newMonthlyRate) {
      this.showToast('Please fill in all required fields (Name, GCash, Monthly Rate).');
      return;
    }

    this.lessonService.createLesson({
      gc_name: this.newGcName.trim(),
      description: this.newGcDescription.trim(),
      photo: this.newGcPhoto(),
      gcash_number: this.newGcNumber.trim(),
      monthly_rate: Number(this.newMonthlyRate)
    }).subscribe({
      next: () => {
        this.showToast('Group Chat created successfully!');
        this.createGcModal.dismiss();
        this.loadLessons();
        this.loadStudents();
        this.appState.triggerRefreshBadges(); 
      },
      error: () => {
        this.showToast('Error creating GC.');
      }
    });
  }

  openChat(chat: Enrollment) {
    this.router.navigate(['/lesson-chat', chat.lesson.id]);
  }

  isTutor(item: Enrollment): boolean {
    return item.status === 'tutor';
  }

  // 🔥 IDINAGDAG: Ito yung para sa <select> dropdown sa Payments Tab
  onSelectPaymentGc(lessonId: string) {
    if (lessonId) {
      this.openMembersModal(Number(lessonId));
    }
  }

  openMembersModal(lessonId: number) {
    this.selectedLessonId.set(lessonId);
    this.loadingMembers.set(true);
    this.members.set([]);

    this.lessonService.getLessonMembers(lessonId).subscribe({
      next: (data: any[]) => {
        this.members.set(data);
        this.loadingMembers.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.showToast('Error loading members.');
        this.loadingMembers.set(false);
      }
    });
  }

  approveStudent(studentId: number) {
    const lessonId = this.selectedLessonId();
    if (!lessonId) return;

    this.lessonService.approvePayment(lessonId, studentId).subscribe({
      next: () => {
        this.showToast('Student Approved!');
        this.openMembersModal(lessonId);
        this.loadStudents();
        this.loadLessons();
        this.appState.triggerRefreshBadges(); 
      },
      error: () => this.showToast('Error approving student.')
    });
  }

  async rejectStudent(studentId: number) {
    const lessonId = this.selectedLessonId();
    if (!lessonId) return;

    const alert = await this.alertCtrl.create({
      header: 'Reject Application',
      message: 'Please state the reason for rejection:',
      inputs: [{ name: 'reason', type: 'textarea', placeholder: 'e.g. Fake receipt, invalid reference number' }],
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
                this.openMembersModal(lessonId);
                this.loadStudents();
                this.loadLessons();
                this.appState.triggerRefreshBadges(); 
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

  // --- HELPERS PARA SA PAYMENTS TAB ---
  getFilteredMembers() {
    const filter = this.paymentFilter();
    return this.members().filter(m => {
      if (filter === 'pending') return m.status === 'pending_payment';
      if (filter === 'approved') return m.status === 'enrolled';
      if (filter === 'rejected') return m.status === 'rejected';
      return true;
    });
  }

  goToHome() { this.menuController.close('main-menu'); this.router.navigate(['/home']); }
  goToProfile() { this.menuController.close('main-menu'); this.router.navigate(['/profile']); }
  goToMessagesPage() { this.menuController.close('main-menu'); this.router.navigate(['/messages']); }
  goToMyLesson() { this.menuController.close('main-menu'); this.router.navigate(['/my-lesson']); }
  goToSettings() { this.menuController.close('main-menu'); this.router.navigate(['/settings']); }
  logout() { this.menuController.close('main-menu'); this.session.logout(); this.router.navigate(['/login']); }
}