import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { AdminStats } from '../../models/admin.model';
import { AdminService } from '../../services/admin.service';
import { SessionService } from '../../services/session.service';
import { apiErrorMessage } from '../../utils/api-error';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonText,
    RouterLink,
  ],
})
export class AdminDashboardPage {
  private adminService = inject(AdminService);
  private session = inject(SessionService);
  private router = inject(Router);

  stats = signal<AdminStats | null>(null);
  errorMessage = signal('');

  // Tumatakbo tuwing papasok ang admin sa pahinang ito
  ionViewWillEnter() {
    this.load();
  }

  async load() {
    this.errorMessage.set('');
    try {
      this.stats.set(await this.adminService.getStats());
    } catch (error) {
      this.errorMessage.set(
        apiErrorMessage(error, 'Could not load the numbers. Please try again.'),
      );
    }
  }

  async logout() {
    this.session.logout();
    await this.router.navigateByUrl('/login');
  }
}