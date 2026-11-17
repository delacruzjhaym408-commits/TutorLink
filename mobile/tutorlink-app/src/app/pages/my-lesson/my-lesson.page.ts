import { Component, OnInit, inject, signal, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonAvatar, IonSpinner, IonButtons, IonBackButton, IonList,
  IonItem, IonLabel, AlertController, IonMenu, MenuController,
  IonMenuToggle, ToastController, IonModal, IonTextarea, IonInput,
  IonRefresher, IonRefresherContent, IonBadge, IonSegment, IonSegmentButton,
  IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent,
  IonImg
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
    CommonModule, FormsModule, 
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonAvatar, IonSpinner, IonButtons, IonBackButton, IonList,
    IonItem, IonLabel, IonMenuToggle, IonMenu, IonModal, IonTextarea,
    IonInput, IonRefresher, IonRefresherContent, IonBadge, IonSegment, IonSegmentButton,
    IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent,
    IonImg
  ],
})
export class MyLessonPage implements OnInit {
  @ViewChild('createGcModal') createGcModal!: IonModal;

  private lessonService = inject(LessonService);
  private session = inject(SessionService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private appState = inject(AppStateService);
  
  // 🔥 DEFAULT TAB AY 1v1 SESSIONS NA
  activeTab = signal<string>('students'); 
  
  enrollments = signal<Enrollment[]>([]);
  tutorStudents = signal<any[]>([]);
  loading = signal(true);
  currentUser = this.session.user;

  // PAYMENTS FILTER
  paymentFilter = signal<string>('pending'); 

  // CREATE GC VARIABLES (Iwinaksi na natin ito pero itatago natin para hindi mag-error ang HTML)
  newGcName = '';
  newGcDescription = '';
  newGcPhoto = signal<string | null>(null);
  newGcNumber = '';
  newMonthlyRate: number | null = null;

  selectedLessonId = signal<number | null>(null);
  members = signal<any[]>([]);
  loadingMembers = signal(false);

  pendingCounts: { [lessonId: number]: number } = {};

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
        const grouped: any = {};
        data.forEach(s => {
          if (!grouped[s.lesson_name]) grouped[s.lesson_name] = [];
          grouped[s.lesson_name].push(s);
        });
        
        const groupedArray = Object.keys(grouped).map(key => ({
          gc_name: key,
          students: grouped[key]
        }));
        
        this.tutorStudents.set(groupedArray);
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

  // 🔥 MGA METHODS PARA SA LUMANG GC (Pwedeng iwan kahit hindi na ginagamit)
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
    // Not used anymore, but kept for safety
  }

  openChat(chat: Enrollment) {
    this.router.navigate(['/lesson-chat', chat.lesson.id]);
  }

  isTutor(item: Enrollment): boolean {
    return item.status === 'tutor';
  }

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

  approveStudent(studentId: number, lessonId: number) {
    this.lessonService.approvePayment(lessonId, studentId).subscribe({
      next: () => {
        this.showToast('Student Approved!');
        this.loadStudents();
        this.loadLessons();
        this.appState.triggerRefreshBadges(); 
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

  getFilteredMembers() {
    const filter = this.paymentFilter();
    return this.members().filter(m => {
      if (filter === 'pending') return m.status === 'pending_payment';
      if (filter === 'approved') return m.status === 'enrolled';
      if (filter === 'rejected') return m.status === 'rejected';
      return true;
    });
  }

  doRefresh(event: any) {
    this.lessonService.getMyEnrollments().subscribe({
      next: (data) => {
        this.enrollments.set(data);
        this.checkPendingCounts();
        this.loadStudents();
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      }
    });
  }

  async openReceipt(base64Image: string) {
    if (!base64Image) return;
    
    const alert = await this.alertCtrl.create({
      header: 'Payment Receipt',
      message: `<img src="${base64Image}" style="width: 100%; border-radius: 8px;" />`,
      buttons: ['Close']
    });
    await alert.present();
  }

  goToHome() { this.menuController.close('main-menu'); this.router.navigate(['/home']); }
  goToProfile() { this.menuController.close('main-menu'); this.router.navigate(['/profile']); }
  goToMessagesPage() { this.menuController.close('main-menu'); this.router.navigate(['/messages']); }
  goToMyLesson() { this.menuController.close('main-menu'); this.router.navigate(['/my-lesson']); }
  goToSettings() { this.menuController.close('main-menu'); this.router.navigate(['/settings']); }
  logout() { this.menuController.close('main-menu'); this.session.logout(); this.router.navigate(['/login']); }
}