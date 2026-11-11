import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
  IonLabel, IonAvatar, IonButtons, IonBackButton, IonSpinner, IonIcon,
  IonButton, AlertController, ToastController, IonMenu, MenuController,
  IonMenuToggle, IonBadge, IonRefresher, IonRefresherContent
} from '@ionic/angular';
import { 
  trashOutline, homeOutline, personOutline, chatbubbleOutline, 
  bookOutline, settingsOutline, logOutOutline, menuOutline,
  chatbubblesOutline,
  send
} from 'ionicons/icons';
import { addIcons } from 'ionicons';

import { MessageService } from '../../services/message.service';
import { AuthUser } from '../../models/user.model';
import { SessionService } from '../../services/session.service';
import { API_BASE_URL } from '../../config';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.page.html',
  styleUrls: ['./messages.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonAvatar, IonButtons, IonBackButton,
    IonSpinner, IonIcon, IonButton, IonMenu, IonMenuToggle, IonBadge, IonRefresher, IonRefresherContent
  ],
})
export class MessagesPage implements OnInit, OnDestroy {
  private messageService = inject(MessageService);
  private session = inject(SessionService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  conversations = signal<any[]>([]);
  loading = signal(true);
  currentUser: AuthUser | null = null;

  private pollingInterval: any;

  constructor(public menuController: MenuController) {
    addIcons({ 
      trashOutline, homeOutline, personOutline, chatbubbleOutline, 
      bookOutline, settingsOutline, logOutOutline, menuOutline,
      chatbubblesOutline,
      send
    });
  }

  ngOnInit() {
    const userJson = localStorage.getItem('user');
    if (userJson) this.currentUser = JSON.parse(userJson);
    
    this.loadConversations();

    this.pollingInterval = setInterval(() => {
      this.fetchConversationsSilently();
    }, 3000);
  }

  ngOnDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  getImageUrl(pic: string | null | undefined): string {
    if (!pic) return 'https://ionicframework.com/docs/img/demos/avatar.svg';
    if (pic.startsWith('/uploads/')) return `${API_BASE_URL}${pic}`;
    if (pic.includes('localhost')) return pic.replace(/http:\/\/localhost:\d+/, API_BASE_URL);
    if (!pic.startsWith('http')) return `${API_BASE_URL}/uploads/${pic}`;
    return pic;
  }

  loadConversations() {
    this.loading.set(true);
    this.messageService.getMyConversations().subscribe({
      next: (convs) => {
        this.conversations.set(convs);
        this.loading.set(false);
        this.cdr.detectChanges();
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

  fetchConversationsSilently() {
    this.messageService.getMyConversations().subscribe({
      next: (convs) => {
        this.conversations.set(convs);
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err?.status === 401) {
          clearInterval(this.pollingInterval);
          this.session.logout();
          this.router.navigate(['/login']);
        }
      },
    });
  }

  openChat(conv: any) { 
    this.router.navigate(['/chat', conv.id]); 
  }

  async confirmDelete(conv: any, event: Event) {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Delete Conversation',
      message: `Are you sure you want to delete this conversation?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => this.deleteConversation(conv) }
      ]
    });
    await alert.present();
  }

  private deleteConversation(conv: any) {
    this.messageService.deleteConversation(conv.id).subscribe({
      next: async () => {
        this.conversations.update(convs => convs.filter(c => c.id !== conv.id));
        this.cdr.detectChanges();
        const toast = await this.toastCtrl.create({ message: 'Deleted', duration: 2000, color: 'success' });
        await toast.present();
      }
    });
  }

  doRefresh(event: any) {
    this.messageService.getMyConversations().subscribe({
      next: (convs) => {
        this.conversations.set(convs);
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      }
    });
  }

  goToHome() { this.menuController.close(); this.router.navigate(['/home']); }
  goToProfile() { this.menuController.close(); this.router.navigate(['/profile']); }
  goToMyLesson() { this.menuController.close(); this.router.navigate(['/my-lesson']); }
  goToSettings() { this.menuController.close(); this.router.navigate(['/settings']); }
  logout() { this.menuController.close(); this.session.logout(); this.router.navigate(['/login']); }
}