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
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { ApplicationService } from '../services/application.service';
import { SessionService } from '../services/session.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
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
    RouterLink,
  ],
})
export class HomePage {
  private router = inject(Router);
  private applicationService = inject(ApplicationService);
  private session = inject(SessionService);

  isTutor = signal(false);
  user = this.session.user;

  // Tumatakbo tuwing babalik ang user sa Home
  async ionViewWillEnter() {
    this.isTutor.set(await this.applicationService.isApprovedTutor());
  }

  logout() {
    // PANSAMANTALA: sa Phase 9 buburahin din dito ang token ng login
    this.session.logout();
    this.router.navigateByUrl('/login');
  }
}