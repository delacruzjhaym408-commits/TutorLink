import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonFooter, IonInput, IonButton, IonIcon, IonSpinner, IonModal, 
  AlertController, ToastController, IonAvatar, IonList, IonItem, IonLabel,
  ViewWillLeave 
} from '@ionic/angular';
import { send, sendOutline, settingsOutline, logOutOutline, createOutline, cameraOutline, personRemoveOutline, timeOutline, closeCircleOutline, callOutline, videocamOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'; // 🔥 IDINAGDAG
import { Subscription } from 'rxjs';

import { LessonService, LessonMessage, Lesson, Enrollment } from '../../services/lesson.service';
import { AuthUser } from '../../models/user.model';
import { SessionService } from '../../services/session.service';
import { WebSocketService } from '../../services/websocket.service';
import { AppStateService } from '../../services/app-state.service';

@Component({
  selector: 'app-lesson-chat',
  templateUrl: './lesson-chat.page.html',
  styleUrls: ['./lesson-chat.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonBackButton, IonFooter, IonInput, IonButton, IonIcon, IonSpinner, IonModal, IonAvatar, IonList, IonItem, IonLabel
  ],
})
export class LessonChatPage implements OnInit, OnDestroy, ViewWillLeave {
  @ViewChild('settingsModal') settingsModal!: IonModal;
  @ViewChild(IonContent) content!: IonContent;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lessonService = inject(LessonService);
  private session = inject(SessionService);
  private wsService = inject(WebSocketService);
  private appState = inject(AppStateService);
  private cdr = inject(ChangeDetectorRef);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  lessonId = 0;
  lesson: Lesson | null = null;
  messages = signal<LessonMessage[]>([]);
  members = signal<any[]>([]);
  newMessage = '';
  loading = signal(true);
  sending = signal(false);
  currentUser: AuthUser | null = null;
  isCreator = false;

  myStatus = signal<string>('enrolled');
  rejectionReason = signal<string | null>(null);

  editName = '';
  editDate = '';
  editTime = '';
  editPhoto = signal<string | null>(null);

  private wsSubscription!: Subscription;

  constructor() {
    // 🔥 IDINAGDAG ANG cameraOutline
    addIcons({ 
      send, sendOutline, settingsOutline, logOutOutline, createOutline, 
      cameraOutline, personRemoveOutline, timeOutline, closeCircleOutline,
      callOutline, videocamOutline
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.lessonId = Number(id);
    
    const userJson = localStorage.getItem('user');
    if (userJson) this.currentUser = JSON.parse(userJson);

    this.loadLessonDetails();
    this.loadMessages();
    this.loadMembers();

    this.wsSubscription = this.wsService.messages$.subscribe((data) => {
      if (data.type === 'new_lesson_message' && data.lesson_id === this.lessonId) {
        if (data.message.sender_id !== this.currentUser?.id) {
          this.messages.update(m => [...m, data.message]);
          this.cdr.detectChanges();
          setTimeout(() => this.content?.scrollToBottom(300), 100);
          
          this.lessonService.markAsRead(this.lessonId).subscribe(() => {
            this.appState.triggerRefreshBadges();
          });
        }
      }
    });
  }

  async ionViewWillLeave() {
    this.lessonService.markAsRead(this.lessonId).subscribe(() => {
      this.appState.triggerRefreshBadges();
    });
  }

  ngOnDestroy() {
    if (this.wsSubscription) this.wsSubscription.unsubscribe();
  }

  loadLessonDetails() {
    this.lessonService.getMyEnrollments().subscribe({
      next: (enrollments) => {
        const myEnrollment = enrollments.find(e => e.lesson.id === this.lessonId);
        if (myEnrollment) {
          this.lesson = myEnrollment.lesson;
          this.isCreator = myEnrollment.status === 'tutor';
          
          this.myStatus.set(myEnrollment.status);
          this.rejectionReason.set(myEnrollment.rejection_reason || null);

          this.editName = this.lesson.gc_name;
          this.editDate = this.lesson.next_meeting_date || '';
          this.editTime = this.lesson.next_meeting_time || '';
          this.editPhoto.set(this.lesson.photo || null);
          this.cdr.detectChanges();
        }
      }
    });
  }

  loadMembers() {
    this.lessonService.getLessonMembers(this.lessonId).subscribe({
      next: (members) => {
        this.members.set(members);
        this.cdr.detectChanges();
      }
    });
  }

  loadMessages() {
    this.loading.set(true);
    this.lessonService.getMessages(this.lessonId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.loading.set(false);
        this.cdr.detectChanges();
        setTimeout(() => this.content?.scrollToBottom(300), 100);
        
        this.lessonService.markAsRead(this.lessonId).subscribe({
          next: () => {
            setTimeout(() => {
              this.appState.triggerRefreshBadges();
            }, 300); 
          }
        });
      },
      error: () => { this.loading.set(false); this.cdr.detectChanges(); },
    });
  }

  async send() {
    if (!this.newMessage.trim()) return;
    this.sending.set(true);

    this.lessonService.sendMessage(this.lessonId, this.newMessage.trim()).subscribe({
      next: (msg) => {
        this.messages.update((m) => [...m, msg]);
        this.newMessage = '';
        this.sending.set(false);
        this.cdr.detectChanges();
        setTimeout(() => this.content?.scrollToBottom(300), 100);
      },
      error: () => { this.sending.set(false); },
    });
  }

  // 🔥 IDINAGDAG: FUNCTION PARA MAG-SEND NG IMAGE
  async sendImage() {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      if (image.dataUrl) {
        const content = `[IMAGE]${image.dataUrl}`;
        this.sending.set(true);

        this.lessonService.sendMessage(this.lessonId, content).subscribe({
          next: (msg) => {
            this.messages.update((m) => [...m, msg]);
            this.sending.set(false);
            this.cdr.detectChanges();
            setTimeout(() => this.content?.scrollToBottom(300), 100);
          },
          error: () => { this.sending.set(false); }
        });
      }
    } catch (e) {
      console.log('Camera cancelled', e);
    }
  }

  startCall() {
    const roomName = `TutorLink-Lesson-${this.lessonId}`;
    this.sendCallMessage("📞 Voice Call started by Tutor.", roomName);
  }

  startVideoCall() {
    const roomName = `TutorLink-Lesson-${this.lessonId}`;
    this.sendCallMessage("🎥 Video Call started by Tutor.", roomName);
  }

  private sendCallMessage(text: string, roomName: string) {
    const content = `${text} Click to join: [ROOM:${roomName}]`;
    
    this.lessonService.sendMessage(this.lessonId, content).subscribe({
      next: (msg) => {
        this.messages.update((m) => [...m, msg]);
        this.cdr.detectChanges();
        setTimeout(() => this.content?.scrollToBottom(300), 100);
      }
    });
  }

  joinCall(content: string) {
    const match = content.match(/\[ROOM:(.*?)\]/);
    if (match && match[1]) {
      this.router.navigate(['/video-call', match[1]]);
    }
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
        this.editPhoto.set(image.dataUrl);
      }
    } catch (e) {}
  }

  saveSettings() {
    if (!this.isCreator) return;
    this.lessonService.updateLesson(this.lessonId, {
      gc_name: this.editName,
      next_meeting_date: this.editDate,
      next_meeting_time: this.editTime,
      photo: this.editPhoto()
    }).subscribe({
      next: () => {
        this.settingsModal.dismiss();
        this.showToast('Group chat updated!');
        this.loadLessonDetails();
      },
      error: () => this.showToast('Error updating GC.')
    });
  }

  async confirmKick(member: any) {
    const alert = await this.alertCtrl.create({
      header: 'Kick Member',
      message: `Sigurado ka bang gusto mong i-kick si ${member.full_name} sa group?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Kick', 
          role: 'destructive', 
          handler: () => this.kickMember(member) 
        }
      ]
    });
    await alert.present();
  }

  kickMember(member: any) {
    this.lessonService.kickMember(this.lessonId, member.student_id).subscribe({
      next: () => {
        this.members.update(m => m.filter(x => x.student_id !== member.student_id));
        this.showToast(`${member.full_name} has been kicked.`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showToast(err.error?.detail || 'Failed to kick member.');
      }
    });
  }

  async leaveGroup() {
    const alert = await this.alertCtrl.create({
      header: 'Leave Group',
      message: 'Sigurado ka bang gusto mong umalis sa Group Chat na ito?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Leave', role: 'destructive', handler: () => this.confirmLeave() }
      ]
    });
    await alert.present();
  }

  confirmLeave() {
    this.lessonService.leaveLesson(this.lessonId).subscribe({
      next: () => {
        this.settingsModal.dismiss();
        this.router.navigate(['/my-lesson']);
      }
    });
  }

  async showToast(msg: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color: 'primary' });
    await toast.present();
  }

  isMine(msg: LessonMessage): boolean {
    return msg.sender_id === this.currentUser?.id;
  }
}