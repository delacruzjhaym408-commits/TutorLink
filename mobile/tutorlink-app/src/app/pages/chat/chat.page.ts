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
  // 🔥 IDINAGDAG
  chatbubblesOutline
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Subscription } from 'rxjs';

import { MessageService, Message } from '../../services/message.service';
import { AuthUser } from '../../models/user.model';
import { WebSocketService } from '../../services/websocket.service';
import { AppStateService } from '../../services/app-state.service';
import { SessionService } from '../../services/session.service';

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
    addIcons({ sendOutline, callOutline, videocamOutline, chatbubblesOutline });
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
          this.otherUserPicture.set(currentConv.other_user_picture);
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
        // 🔥 FIX: Handle 401
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