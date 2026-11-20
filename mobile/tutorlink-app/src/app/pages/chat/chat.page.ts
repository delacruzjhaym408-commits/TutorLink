import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectorRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonFooter, IonInput, IonButton, IonIcon, IonSpinner, IonAvatar, ToastController
} from '@ionic/angular';
import { send, chatbubblesOutline, cameraOutline, calendarOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Subscription } from 'rxjs';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { MessageService, Message } from '../../services/message.service';
import { AuthUser } from '../../models/user.model';
import { WebSocketService } from '../../services/websocket.service';
import { AppStateService } from '../../services/app-state.service';
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
  private ngZone = inject(NgZone);
  private toastCtrl = inject(ToastController);

  @ViewChild(IonContent) content!: IonContent;

  conversationId = 0;
  messages = signal<Message[]>([]);
  newMessage = '';
  loading = signal(true);
  sending = signal(false);
  currentUser: AuthUser | null = null;
  
  otherUserName = signal<string>('Chat');
  otherUserPicture = signal<string | null>(null);
  otherUserIsOnline = signal<boolean>(false);

  private wsSubscription!: Subscription;

  constructor() {
    addIcons({ send, chatbubblesOutline, cameraOutline, calendarOutline });
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

    this.wsSubscription = this.wsService.messages$.subscribe((data: any) => {
      if (data.type === 'new_message' && Number(data.conversation_id) === Number(this.conversationId)) {
        if (Number(data.message.sender_id) !== Number(this.currentUser?.id)) {
          this.ngZone.run(() => {
            this.messages.update(m => [...m, data.message]);
            this.cdr.detectChanges();
            setTimeout(() => this.content?.scrollToBottom(300), 100);
            
            this.messageService.markAsRead(this.conversationId).subscribe(() => {
              this.appState.triggerRefreshBadges();
            });
          });
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.wsSubscription) this.wsSubscription.unsubscribe();
  }

  loadChatDetails() {
    this.messageService.getMyConversations().subscribe(convs => {
      const currentConv = convs.find(c => c.id === this.conversationId);
      if (currentConv) {
        this.otherUserName.set(currentConv.other_user_name);
        this.otherUserPicture.set(currentConv.other_user_picture);
        this.otherUserIsOnline.set(currentConv.other_user_is_online || false);
        this.cdr.detectChanges();
      }
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
      error: () => {
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
        this.ngZone.run(() => {
          this.messages.update((m) => [...m, msg]);
          this.newMessage = '';
          this.sending.set(false);
          this.cdr.detectChanges();
          setTimeout(() => this.content?.scrollToBottom(300), 100);
        });
      },
      error: () => { this.sending.set(false); },
    });
  }

  async sendImage() {
    try {
      const image = await Camera.getPhoto({
        quality: 30, allowEditing: false, resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos, width: 800, height: 800, correctOrientation: true
      });

      if (image.dataUrl) {
        const content = `[IMAGE]${image.dataUrl}`;
        this.sending.set(true);

        this.messageService.sendMessage(this.conversationId, content).subscribe({
          next: (msg) => {
            this.ngZone.run(() => {
              this.messages.update((m) => [...m, msg]);
              this.sending.set(false);
              this.cdr.detectChanges();
              setTimeout(() => this.content?.scrollToBottom(300), 100);
            });
          },
          error: () => { 
            this.sending.set(false); 
            alert('Error sending image.'); 
          }
        });
      }
    } catch (e) {
      console.log('Camera cancelled or failed', e);
    }
  }

  async bookSession() {
    const postMsg = this.messages().find(m => m.post_id);
    
    if (postMsg && postMsg.post_id) {
      this.router.navigate(['/tutor-details', postMsg.post_id], { queryParams: { apply: 'true' } });
    } else {
      const toast = await this.toastCtrl.create({
        message: 'Walang naka-attach na post sa chat na ito. Pumunta sa Tutor Profile para mag-book.',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
    }
  }

  // 🔥 IDINAGDAG NA FALLBACK PARA MAHANAP ANG post_id SA MESSAGES
  private getFirstPostId(): number | null {
    const postMsg = this.messages().find(m => m.post_id);
    return postMsg && postMsg.post_id !== undefined ? postMsg.post_id : null;
  }

  // 🔥 GO TO VIEW POST
  goToPost(postId: number | null | undefined) {
    if (postId) {
      this.router.navigate(['/view-post', postId]);
    } else {
      this.showToast('This message is not linked to any post.');
    }
  }

  isMine(msg: Message): boolean {
    return Number(msg.sender_id) === Number(this.currentUser?.id);
  }

  // 🔥 GO TO TUTOR DETAILS
  goToTutorDetails() {
    const postId = this.getFirstPostId();
    
    if (postId) {
      this.router.navigate(['/tutor-details', postId]);
    } else {
      this.showToast('Tutor profile is not linked to this chat.');
    }
  }

  async showToast(msg: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color: 'primary' });
    await toast.present();
  }
}