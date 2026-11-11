import { Component, inject, OnDestroy, OnInit, signal, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import {
  IonApp, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel,
  IonMenu, IonHeader, IonToolbar, IonContent, IonList, IonItem,
  MenuController, IonBadge, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  homeOutline, chatbubbleOutline, personOutline, settingsOutline,
  bookOutline, logOutOutline, personCircleOutline
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { SessionService } from './services/session.service';
import { MessageService } from './services/message.service';
import { LessonService } from './services/lesson.service';
import { WebSocketService } from './services/websocket.service';
import { AppStateService } from './services/app-state.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonApp, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel,
    IonMenu, IonHeader, IonToolbar, IonContent, IonList, IonItem,
    IonBadge
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  // 🔥 ISANG ROUTER LANG, PUBLIC PARA MAGAMIT SA HTML
  public router = inject(Router); 
  
  private menuController = inject(MenuController);
  private session = inject(SessionService);
  private messageService = inject(MessageService);
  private lessonService = inject(LessonService);
  private wsService = inject(WebSocketService);
  private appState = inject(AppStateService);
  private toastCtrl = inject(ToastController);
  private zone = inject(NgZone);

  userName = signal('');
  showLayout = signal(true);
  
  totalUnreadMessages = signal(0);
  totalUnreadLessons = signal(0);

  private wsSubscription!: Subscription;
  private appStateSubscription!: Subscription;

  constructor() {
    // 🔥 IDINAGDAG ANG bookOutline PARA SA ICON
    addIcons({
      homeOutline, chatbubbleOutline, personOutline, settingsOutline,
      bookOutline, logOutOutline, personCircleOutline
    });

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects;
        this.showLayout.set(!(url.includes('/login') || url.includes('/register') || url.startsWith('/admin') || url === '/'));

        if (this.isAuthenticated()) {
          if (url.includes('/lesson-chat/')) {
            setTimeout(() => this.fetchUnreadCounts(), 500);
          } else {
            this.fetchUnreadCounts();
          }
        }
      }
    });
  }

  ngOnInit() {
    if (this.isAuthenticated()) {
      this.wsService.connect();

      this.wsSubscription = this.wsService.messages$.subscribe((data) => {
        this.zone.run(() => {
          if (data.type === 'new_message') {
            this.fetchUnreadCounts();
            const currentUrl = this.router.url;
            if (!currentUrl.includes(`/chat/${data.conversation_id}`)) {
              this.showNewMessageToast(data.message.sender_name);
            }
          } 
          else if (data.type === 'new_lesson_message') {
            this.fetchUnreadCounts();
            const currentUrl = this.router.url;
            if (!currentUrl.includes(`/lesson-chat/${data.lesson_id}`)) {
              this.showNewLessonToast(data.message.sender_name);
            }
          }
        });
      });

      this.appStateSubscription = this.appState.refreshBadges$.subscribe(() => {
        if (this.isAuthenticated()) this.fetchUnreadCounts();
      });

      this.fetchUnreadCounts();
    }
  }

  private isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    return !!token && !!user;
  }

  fetchUnreadCounts() {
    if (!this.isAuthenticated()) return;

    this.messageService.getMyConversations().subscribe({
      next: (convs) => {
        this.zone.run(() => {
          const total = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0);
          this.totalUnreadMessages.set(total);
        });
      },
      error: (err) => {
        if (err?.status === 401) this.handleUnauthorized();
      },
    });

    this.lessonService.getMyEnrollments().subscribe({
      next: (enrollments) => {
        this.zone.run(() => {
          const total = enrollments.reduce((sum, e) => sum + (e.unread_count || 0), 0);
          this.totalUnreadLessons.set(total);
        });
      },
      error: (err) => {
        if (err?.status === 401) this.handleUnauthorized();
      },
    });
  }

  private handleUnauthorized() {
    if (this.router.url.includes('/login')) return;
    this.wsService.disconnect();
    this.session.logout();
    this.router.navigate(['/login']);
  }

  async showNewMessageToast(senderName: string) {
    const toast = await this.toastCtrl.create({
      message: `New message from ${senderName}`,
      duration: 3000,
      position: 'top',
      color: 'primary',
      buttons: [{ text: 'View', handler: () => this.router.navigate(['/messages']) }]
    });
    await toast.present();
  }

  async showNewLessonToast(senderName: string) {
    const toast = await this.toastCtrl.create({
      message: `New message in Group Chat from ${senderName}`,
      duration: 3000,
      position: 'top',
      color: 'secondary',
      buttons: [{ text: 'View', handler: () => this.router.navigate(['/my-lesson']) }]
    });
    await toast.present();
  }

  ngOnDestroy() {
    if (this.wsSubscription) this.wsSubscription.unsubscribe();
    if (this.appStateSubscription) this.appStateSubscription.unsubscribe();
    this.wsService.disconnect();
  }

  goTo(path: string) {
    this.router.navigate([path]);
  }

  loadUser() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        this.userName.set(JSON.parse(userJson).full_name || '');
      } catch (e) {}
    }
  }

  async navigate(path: string) {
    await this.menuController.close();
    this.router.navigate([path]);
  }

  async logout() {
    await this.menuController.close();
    this.wsService.disconnect();
    this.session.logout();
    this.router.navigate(['/login']).then(() => {
      window.location.reload();
    });
  }
}