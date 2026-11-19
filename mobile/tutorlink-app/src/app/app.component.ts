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
  bookOutline, logOutOutline, personCircleOutline, calendarOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { SessionService } from './services/session.service';
import { MessageService } from './services/message.service';
import { LessonService } from './services/lesson.service';
import { TutorPostService } from './services/tutor-post.service';
import { AdminService } from './services/admin.service';
import { CalendarService } from './services/calendar.service';
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
    IonMenu, IonHeader, IonToolbar, IonContent, IonList, IonItem, IonBadge
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  public router = inject(Router); 
  
  private menuController = inject(MenuController);
  private session = inject(SessionService);
  private messageService = inject(MessageService);
  private lessonService = inject(LessonService);
  private tutorPostService = inject(TutorPostService);
  private adminService = inject(AdminService);
  private calendarService = inject(CalendarService);
  private wsService = inject(WebSocketService);
  private appState = inject(AppStateService);
  private toastCtrl = inject(ToastController);
  private zone = inject(NgZone);

  userName = signal('');
  showLayout = signal(true);
  hasApprovedPost = signal(false);
  
  totalUnreadMessages = signal(0);
  totalUnreadLessons = signal(0);
  unreadReviews = signal(0);
  hasScheduleToday = signal(false);
  hasSystemMessage = signal(false);

  private wsSubscription!: Subscription;
  private appStateSubscription!: Subscription;

  constructor() {
    addIcons({
      homeOutline, chatbubbleOutline, personOutline, settingsOutline,
      bookOutline, logOutOutline, personCircleOutline, calendarOutline,
      shieldCheckmarkOutline
    });

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects;
        
        const isChatPage = url.includes('/chat/') || url.includes('/lesson-chat/');
        const isAuthPage = url.includes('/login') || url.includes('/register');
        const isAdminPage = url.startsWith('/admin');
        
        this.showLayout.set(!(isAuthPage || isAdminPage || url === '/' || isChatPage));

        if (this.isAuthenticated()) {
          if (url.includes('/lesson-chat/')) {
            setTimeout(() => {
              this.fetchAllBadges();
              this.checkApprovedPosts(); 
            }, 500);
          } else {
            this.fetchAllBadges();
            this.checkApprovedPosts(); 
          }
        }
      }
    });
  }

  // 🔥 GINAWANG ASYNC PARA MA-AWAIT ANG RESTORE
  async ngOnInit() {
    // I-reset muna ang lahat ng signals
    this.hasApprovedPost.set(false);
    this.hasSystemMessage.set(false);
    this.totalUnreadMessages.set(0);
    this.totalUnreadLessons.set(0);
    this.hasScheduleToday.set(false);
    this.unreadReviews.set(0);
    this.userName.set('');

    // 🔥 I-RESTORE ANG SESSION BAGO MAG-CHECK
    await this.session.restore();

    if (this.isAuthenticated()) {
      this.checkApprovedPosts();
      this.wsService.connect();

      this.wsSubscription = this.wsService.messages$.subscribe((data) => {
        this.zone.run(() => {
          if (data.type === 'new_message') {
            this.fetchAllBadges();
            const currentUrl = this.router.url;
            if (!currentUrl.includes(`/chat/${data.conversation_id}`)) {
              this.showNewMessageToast(data.message.sender_name);
            }
          } 
          else if (data.type === 'new_lesson_message') {
            this.fetchAllBadges();
            const currentUrl = this.router.url;
            if (!currentUrl.includes(`/lesson-chat/${data.lesson_id}`)) {
              this.showNewLessonToast(data.message.sender_name);
            }
          }
          else if (data.type === 'post_approved') {
            this.checkApprovedPosts();
            this.showPostApprovedToast(); 
          }
        });
      });

      this.appStateSubscription = this.appState.refreshBadges$.subscribe(() => {
        if (this.isAuthenticated()) {
          this.fetchAllBadges();
          this.checkApprovedPosts(); 
        }
      });

      this.fetchAllBadges();
    }
  }

  private checkApprovedPosts() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      if (user.role === 'tutor') {
        this.tutorPostService.getMyPosts().subscribe({
          next: (posts) => {
            const approved = posts.some(p => p.status === 'published' || p.status === 'approved');
            this.hasApprovedPost.set(approved);
          },
          error: () => {
            this.hasApprovedPost.set(false);
          }
        });
      } else {
        this.hasApprovedPost.set(false);
      }
    } else {
       this.hasApprovedPost.set(false);
    }
  }

  private isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    return !!token && !!user;
  }

  fetchAllBadges() {
    if (!this.isAuthenticated()) return;
    const userJson = localStorage.getItem('user');
    if (!userJson) return;
    const user = JSON.parse(userJson);

    this.messageService.getMyConversations().subscribe({
      next: (convs) => {
        this.zone.run(() => {
          const total = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0);
          this.totalUnreadMessages.set(total);
        });
      }
    });

    this.lessonService.getMyEnrollments().subscribe({
      next: (enrollments) => {
        this.zone.run(() => {
          const total = enrollments.reduce((sum, e) => sum + (e.unread_count || 0), 0);
          this.totalUnreadLessons.set(total);
        });
      }
    });

    if (user.role === 'tutor') {
      this.tutorPostService.getUnreadReviewsCount().subscribe({
        next: (res) => this.unreadReviews.set(res.unread_reviews),
        error: () => {}
      });

      this.calendarService.getTutorBookedDates(user.id).subscribe({
        next: (booked) => {
          const todayStr = new Date().toISOString().split('T')[0];
          this.hasScheduleToday.set(booked.some((b: any) => b.date === todayStr));
        },
        error: () => {}
      });
    }

    this.adminService.getMyAdminMessages().subscribe({
      next: (msgs: any[]) => {
        this.hasSystemMessage.set(msgs.some((m: any) => !m.is_read));
      },
      error: () => {}
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
      message: `New message in Lesson Chat from ${senderName}`,
      duration: 3000,
      position: 'top',
      color: 'secondary',
      buttons: [{ text: 'View', handler: () => this.router.navigate(['/my-lesson']) }]
    });
    await toast.present();
  }

  async showPostApprovedToast() {
    const toast = await this.toastCtrl.create({
      message: '🎉 Your tutor post has been approved! You now have access to Tutor Dashboard.',
      duration: 4000,
      position: 'top',
      color: 'success'
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
    
    this.hasApprovedPost.set(false);
    this.hasSystemMessage.set(false);
    this.totalUnreadMessages.set(0);
    this.totalUnreadLessons.set(0);
    this.hasScheduleToday.set(false);
    this.unreadReviews.set(0);
    this.userName.set('');

    this.router.navigate(['/login']).then(() => {
      window.location.reload();
    });
  }
}