import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import {
  APPLICATION_COLORS,
  APPLICATION_LABELS,
  TutorApplication,
} from '../../models/application.model';
import { DAY_LABELS, formatTime } from '../../models/tutor.model';
import { ApplicationService } from '../../services/application.service';
import { apiErrorMessage } from '../../utils/api-error';

@Component({
  selector: 'app-tutor-application',
  templateUrl: './tutor-application.page.html',
  styleUrls: ['./tutor-application.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonChip,
    IonText,
    RouterLink,
    DatePipe,
  ],
})
export class TutorApplicationPage {
  private applicationService = inject(ApplicationService);

  application = signal<TutorApplication | null>(null);
  loading = signal(true);
  errorMessage = signal('');

  labels = APPLICATION_LABELS;
  colors = APPLICATION_COLORS;
  dayLabels = DAY_LABELS;
  formatTime = formatTime;

  // Tumatakbo tuwing papasok ang user sa pahinang ito
  ionViewWillEnter() {
    this.load();
  }

  async load() {
    this.errorMessage.set('');
    try {
      this.application.set(await this.applicationService.getMyApplication());
    } catch (error) {
      this.errorMessage.set(
        apiErrorMessage(error, 'Could not load your application. Please try again.'),
      );
    } finally {
      this.loading.set(false);
    }
  }
}