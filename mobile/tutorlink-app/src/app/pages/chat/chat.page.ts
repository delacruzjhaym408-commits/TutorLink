import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonFooter, IonInput, IonButton, IonIcon, IonSpinner, IonAvatar
} from '@ionic/angular';
import { 
  sendOutline, callOutline, videocamOutline,
  chatbubblesOutline,
  cameraOutline
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Subscription } from 'rxjs';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { MessageService, Message } from '../../services/message.service';
import { AuthUser } from '../../models/user.model';
import { WebSocketService } from '../../services/websocket.service';
import { AppStateService } from '../../services/app-state.service';
import { SessionService } from '../../services/session.service';
import { API_BASE_URL } from '../../config'; 

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonBackButton, IonFooter, IonInput, IonButton, IonIcon, IonSpinner, IonAvatar
  ],
})
export class ChatPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private wsService = inject(WebSocketService);
  private appState = inject(AppStateService);
  private cdr = inject(ChangeDetectorRef);
  private session = inject(SessionService);

  @ViewChild(IonContent) content!: IonContent;

  conversationId = 0;
  messages = signal<Message[]>([]);
  newMessage = '';
  loading = signal(true);
  sending = signal(false);
  currentUser: AuthUser | null = null;
  
  otherUserName = signal<string>('Chat');
  otherUserPicture = signal<string | null>(null);

  private wsSubscription!: Subscription;

  constructor() {
    addIcons({ sendOutline, callOutline, videocamOutline, chatbubblesOutline, cameraOutline });
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

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.conversationId = Number(id);
    
    const userJson = localStorage.getItem('user');
    if (userJson) this.currentUser = JSON.parse(userJson);

    this.loadChatDetails();
    this.loadMessages();

    this.wsSubscription = this.wsService.messages$.subscribe((data) => {
      if (data.type === 'new_message' && data.conversation_id === this.conversationId) {
        if (data.message.sender_id !== this.currentUser?.id) {
          this.messages.update(m => [...m, data.message]);
          this.cdr.detectChanges();
          setTimeout(() => this.content?.scrollToBottom(300), 100);
          
          this.messageService.markAsRead(this.conversationId).subscribe(() => {
            this.appState.triggerRefreshBadges();
          });
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.wsSubscription) this.wsSubscription.unsubscribe();
  }

  loadChatDetails() {
    this.messageService.getMyConversations().subscribe({
      next: (convs) => {
        const currentConv = convs.find(c => c.id === this.conversationId);
        if (currentConv) {
          this.otherUserName.set(currentConv.other_user_name);
          this.otherUserPicture.set(this.getImageUrl(currentConv.other_user_picture)); 
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        if (err?.status === 401) {
          this.session.logout();
          this.router.navigate(['/login']);
        }
      },
    });
  }

  loadMessages() {
    this.messageService.getMessages(this.conversationId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.loading.set(false);
        this.cdr.detectChanges();
        setTimeout(() => this.content?.scrollToBottom(300), 100);
        
        this.messageService.markAsRead(this.conversationId).subscribe(() => {
          this.appState.triggerRefreshBadges();
        });
      },
      error: (err) => {
        if (err?.status === 401) {
          this.session.logout();
          this.router.navigate(['/login']);
          return;
        }
        this.loading.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  async send() {
    if (!this.newMessage.trim()) return;
    this.sending.set(true);

    this.messageService.sendMessage(this.conversationId, this.newMessage.trim()).subscribe({
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

  // 🔥 FIXED: CameraSource.Photos para deretso gallery
  async sendImage() {
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

      if (image.dataUrl) {
        const content = `[IMAGE]${image.dataUrl}`;
        this.sending.set(true);

        this.messageService.sendMessage(this.conversationId, content).subscribe({
          next: (msg) => {
            this.messages.update((m) => [...m, msg]);
            this.sending.set(false);
            this.cdr.detectChanges();
            setTimeout(() => this.content?.scrollToBottom(300), 100);
          },
          error: (err) => { 
            console.error('Send Image Error:', err);
            this.sending.set(false); 
            this.showToast('Error: ' + (err.error?.detail || 'Server error'));
          }
        });
      }
    } catch (e) {
      console.error('Camera cancelled or error:', e);
      this.showToast('Failed to pick image. Please check permissions.');
    }
  }

  private async showToast(msg: string) {
    const toast = document.createElement('ion-toast');
    toast.message = msg;
    toast.duration = 2000;
    toast.color = 'danger';
    document.body.appendChild(toast);
    await toast.present();
  }

  startCall() {
    const roomName = `TutorLink-Chat-${this.conversationId}`;
    this.sendCallMessage("📞 Voice Call", roomName);
  }

  startVideoCall() {
    const roomName = `TutorLink-Chat-${this.conversationId}`;
    this.sendCallMessage("🎥 Video Call", roomName);
  }

  private sendCallMessage(type: string, roomName: string) {
    const content = `${type} started. Click to join: [ROOM:${roomName}]`;
    
    this.messageService.sendMessage(this.conversationId, content).subscribe({
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

  isMine(msg: Message): boolean {
    return msg.sender_id === this.currentUser?.id;
  }

  goToPost(postId: number | null | undefined) {
    if (postId) {
      this.router.navigate(['/tutor-details', postId]);
    }
  }
}