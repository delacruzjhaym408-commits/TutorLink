import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  AlertController,
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
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { AdminApplication } from '../../models/admin.model';
import { APPLICATION_COLORS, APPLICATION_LABELS } from '../../models/application.model';
import { DAY_LABELS, formatTime } from '../../models/tutor.model';
import { AdminService } from '../../services/admin.service';
import { apiErrorMessage } from '../../utils/api-error';

type Tab = 'pending' | 'reviewed';

@Component({
  selector: 'app-admin-applications',
  templateUrl: './admin-applications.page.html',
  styleUrls: ['./admin-applications.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonChip,
    IonText,
    DatePipe,
  ],
})
export class AdminApplicationsPage {
  private adminService = inject(AdminService);
  private alertController = inject(AlertController);

  applications = signal<AdminApplication[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  tab = signal<Tab>('pending');

  labels = APPLICATION_LABELS;
  colors = APPLICATION_COLORS;
  dayLabels = DAY_LABELS;
  formatTime = formatTime;

  pending = computed(() =>
    this.applications()
      .filter((a) => a.status === 'pending')
      .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at)),
  );

  reviewed = computed(() =>
    this.applications()
      .filter((a) => a.status !== 'pending')
      .sort((a, b) => (b.reviewed_at ?? '').localeCompare(a.reviewed_at ?? '')),
  );

  visible = computed(() => (this.tab() === 'pending' ? this.pending() : this.reviewed()));

  // Tumatakbo tuwing papasok ang admin sa pahinang ito
  ionViewWillEnter() {
    this.load();
  }

  async load() {
    this.errorMessage.set('');
    try {
      this.applications.set(await this.adminService.getApplications());
    } catch (error) {
      this.errorMessage.set(
        apiErrorMessage(error, 'Could not load the applications. Please try again.'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  onTabChange(event: CustomEvent) {
    this.tab.set(event.detail.value as Tab);
  }

  // Isinasagawa ang aksyon, ipinapakita ang error kung meron, at nire-refresh ang listahan
  private async runAction(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      await this.showError(apiErrorMessage(error, 'Could not perform the action. Please try again.'));
    }
    await this.load();
  }

  private async showError(message: string) {
    const alert = await this.alertController.create({
      header: 'Something went wrong.',
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  async confirmApprove(application: AdminApplication) {
    const alert = await this.alertController.create({
      header: 'Approve Application?',
      message: `Si ${application.applicant_name} It will now appear in the List of Tutors.`,
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Yes, approve',
          role: 'confirm',
          handler: () => {
            this.runAction(() => this.adminService.approve(application.id));
          },
        },
      ],
    });
    await alert.present();
  }

  async confirmReject(application: AdminApplication) {
    const alert = await this.alertController.create({
      header: 'Reject Application?',
      message: `Application ni ${application.applicant_name}. Please provide a reason that the applicant can see.`,
      inputs: [
        {
          name: 'remarks',
          type: 'textarea',
          placeholder: 'Reason for Rejection',
        },
      ],
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Yes, reject',
          role: 'confirm',
          handler: (data) => {
            const remarks = String(data?.remarks ?? '').trim();
            if (remarks.length < 3) {
              return false; // Hindi isasara ang kahon hangga't walang sapat na dahilan
            }
            this.runAction(() => this.adminService.reject(application.id, remarks));
            return true;
          },
        },
      ],
    });
    await alert.present();
  }
}