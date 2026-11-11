import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonButton,
  IonButtons, IonRefresher, IonRefresherContent
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { peopleOutline, documentTextOutline, warningOutline, logOutOutline } from 'ionicons/icons';
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
    IonCardContent, IonIcon, IonButton, IonButtons, IonRefresher, IonRefresherContent
  ],
})
export class AdminDashboardPage implements OnInit {
  private adminService = inject(AdminService);
  private session = inject(SessionService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  totalUsers = signal(0);
  totalPosts = signal(0);
  totalReports = signal(0);

  constructor() {
    addIcons({ peopleOutline, documentTextOutline, warningOutline, logOutOutline });
  }

  ngOnInit() {
    this.loadStats();
  }

    doRefresh(event: any) {
    let completed = 0;
    const checkComplete = () => {
      completed++;
      if (completed === 3) event.target.complete();
    };

    this.adminService.getUsers().subscribe(users => {
      this.totalUsers.set(users.length);
      this.cdr.detectChanges();
      checkComplete();
    });
    this.adminService.getPosts().subscribe(posts => {
      this.totalPosts.set(posts.length);
      this.cdr.detectChanges();
      checkComplete();
    });
    this.adminService.getReports().subscribe(reports => {
      this.totalReports.set(reports.length);
      this.cdr.detectChanges();
      checkComplete();
    });
  }

  loadStats() {
    this.adminService.getUsers().subscribe(users => {
      this.totalUsers.set(users.length);
      this.cdr.detectChanges();
    });
    this.adminService.getPosts().subscribe(posts => {
      this.totalPosts.set(posts.length);
      this.cdr.detectChanges();
    });
    this.adminService.getReports().subscribe(reports => {
      this.totalReports.set(reports.length);
      this.cdr.detectChanges();
    });
  }

  goToUsers() { this.router.navigate(['/admin/users']); }
  goToPosts() { this.router.navigate(['/admin/posts']); }
  goToReports() { this.router.navigate(['/admin/reports']); }

  logout() {
    this.session.logout();
    this.router.navigate(['/login']);
  }
}