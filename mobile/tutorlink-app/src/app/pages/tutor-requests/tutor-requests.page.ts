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

import { formatDate, STATUS_COLORS, STATUS_LABELS } from '../../models/booking.model';
import { IncomingBooking } from '../../models/incoming-booking.model';
import { formatTime } from '../../models/tutor.model';
import { TutorBookingService } from '../../services/tutor-booking.service';
import { apiErrorMessage } from '../../utils/api-error';

type Tab = 'pending' | 'schedule' | 'history';

@Component({
  selector: 'app-tutor-requests',
  templateUrl: './tutor-requests.page.html',
  styleUrls: ['./tutor-requests.page.scss'],
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
  ],
})
export class TutorRequestsPage {
  private tutorBookingService = inject(TutorBookingService);
  private alertController = inject(AlertController);

  bookings = signal<IncomingBooking[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  tab = signal<Tab>('pending');

  statusLabels = STATUS_LABELS;
  statusColors = STATUS_COLORS;
  formatDate = formatDate;
  formatTime = formatTime;

  pending = computed(() =>
    this.bookings()
      .filter((b) => b.status === 'pending')
      .sort((a, b) => this.byDate(a, b)),
  );

  schedule = computed(() =>
    this.bookings()
      .filter((b) => b.status === 'accepted')
      .sort((a, b) => this.byDate(a, b)),
  );

  history = computed(() =>
    this.bookings()
      .filter((b) => ['completed', 'rejected', 'cancelled'].includes(b.status))
      .sort((a, b) => this.byDate(b, a)),
  );

  visible = computed(() => {
    switch (this.tab()) {
      case 'pending':
        return this.pending();
      case 'schedule':
        return this.schedule();
      default:
        return this.history();
    }
  });

  emptyMessage = computed(() => {
    switch (this.tab()) {
      case 'pending':
        return 'No new booking requests.';
      case 'schedule':
        return 'No upcoming sessions scheduled.';
      default:
        return 'No booking history available.';
    }
  });

  private byDate(a: IncomingBooking, b: IncomingBooking): number {
    return (a.session_date + a.start_time).localeCompare(b.session_date + b.start_time);
  }

  // Tumatakbo tuwing papasok ang user sa pahinang ito
  ionViewWillEnter() {
    this.load();
  }

  async load() {
    this.errorMessage.set('');
    try {
      this.bookings.set(await this.tutorBookingService.getIncoming());
    } catch (error) {
      this.errorMessage.set(
        apiErrorMessage(error, 'Could not load the booking requests. Please try again.'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  onTabChange(event: CustomEvent) {
    this.tab.set(event.detail.value as Tab);
  }

  // Isinasagawa ang aksyon, ipinapakita ang error ng server kung meron, at nire-refresh ang listahan
  private async runAction(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      const alert = await this.alertController.create({
        header: 'There is a problem',
        message: apiErrorMessage(error, 'Action failed. Please try again'),
        buttons: ['OK'],
      });
      await alert.present();
    }
    await this.load();
  }

  accept(booking: IncomingBooking) {
    return this.runAction(() => this.tutorBookingService.accept(booking.id));
  }

  complete(booking: IncomingBooking) {
    return this.runAction(() => this.tutorBookingService.complete(booking.id));
  }

  async confirmReject(booking: IncomingBooking) {
    const alert = await this.alertController.create({
      header: 'Reject Request?',
      message: `Request ni ${booking.student_name} sa ${formatDate(booking.session_date)}.`,
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Yes, reject',
          role: 'confirm',
          handler: () => {
            this.runAction(() => this.tutorBookingService.reject(booking.id));
          },
        },
      ],
    });
    await alert.present();
  }
}