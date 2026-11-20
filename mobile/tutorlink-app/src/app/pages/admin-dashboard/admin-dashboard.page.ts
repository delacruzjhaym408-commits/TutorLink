import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonButton,
  IonButtons, IonRefresher, IonRefresherContent, IonBadge, ViewWillEnter, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { peopleOutline, documentTextOutline, warningOutline, logOutOutline, mailOutline } from 'ionicons/icons';
import { AdminService } from '../../services/admin.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle,
    IonCardContent, IonIcon, IonButton, IonButtons, IonRefresher, IonRefresherContent, IonBadge
  ],
})
export class AdminDashboardPage implements OnInit, ViewWillEnter {
  private adminService = inject(AdminService);
  private session = inject(SessionService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private toastCtrl = inject(ToastController);

  totalUsers = signal(0);
  totalPosts = signal(0);
  totalReports = signal(0);

  pendingPostsCount = signal(0);
  pendingAppealsCount = signal(0);
  pendingReportsCount = signal(0);

  constructor() {
    addIcons({ peopleOutline, documentTextOutline, warningOutline, logOutOutline, mailOutline });
  }

  ngOnInit() {
    this.loadStats();
  }

  ionViewWillEnter() {
    this.loadStats();
  }

  doRefresh(event: any) {
    this.loadStats(() => event.target.complete());
  }

  loadStats(onComplete?: () => void) {
    let completedCalls = 0;
    const checkComplete = () => {
      completedCalls++;
      if (completedCalls === 4 && onComplete) onComplete();
    };

    this.adminService.getUsers().subscribe(users => {
      this.totalUsers.set(users.length);
      this.cdr.detectChanges();
      checkComplete();
    });

    this.adminService.getPosts().subscribe(posts => {
      this.totalPosts.set(posts.length);
      const pending = posts.filter(p => p.status === 'pending');
      this.pendingPostsCount.set(pending.length);
      this.cdr.detectChanges();
      checkComplete();
    });

    this.adminService.getReports().subscribe(reports => {
      this.totalReports.set(reports.length);
      const pending = reports.filter(r => r.status === 'pending');
      this.pendingReportsCount.set(pending.length);
      this.cdr.detectChanges();
      checkComplete();
    });

    this.adminService.getAppeals().subscribe(appeals => {
      const pending = appeals.filter(a => a.status === 'pending');
      this.pendingAppealsCount.set(pending.length);
      this.cdr.detectChanges();
      checkComplete();
    });
  }

async runDisableCheck() {
  this.adminService.triggerAutoDisable().subscribe({
    next: async (res) => {
      // 🔥 GAMITIN ANG TOAST IMBES NA ALERT
      const toast = await this.toastCtrl.create({
        message: res.message,
        duration: 3000,
        color: res.message.includes('0 users') ? 'warning' : 'success',
        position: 'top'
      });
      await toast.present();
      
      this.loadStats(); // I-refresh ang stats
    },
    error: async (err) => {
      const toast = await this.toastCtrl.create({
        message: 'Error: ' + (err.error?.detail || 'Something went wrong'),
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  });
}
  goToUsers() { this.router.navigate(['/admin/users']); }
  goToPosts() { this.router.navigate(['/admin/posts']); }
  goToReports() { this.router.navigate(['/admin/reports']); }
  goToAppeals() { this.router.navigate(['/admin/appeals']); }

  logout() {
    this.session.logout();
    this.router.navigate(['/login']);
  }
}