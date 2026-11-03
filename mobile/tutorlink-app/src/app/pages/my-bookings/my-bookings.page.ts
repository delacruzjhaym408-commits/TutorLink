import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import {
  Booking,
  formatDate,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../models/booking.model';
import { formatTime } from '../../models/tutor.model';
import { BookingService } from '../../services/booking.service';
import { apiErrorMessage } from '../../utils/api-error';

@Component({
  selector: 'app-my-bookings',
  templateUrl: './my-bookings.page.html',
  styleUrls: ['./my-bookings.page.scss'],
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
  ],
})
export class MyBookingsPage {
  private bookingService = inject(BookingService);
  private alertController = inject(AlertController);

  bookings = signal<Booking[]>([]);
  loading = signal(true);
  errorMessage = signal('');

  statusLabels = STATUS_LABELS;
  statusColors = STATUS_COLORS;
  formatDate = formatDate;
  formatTime = formatTime;

  // Tumatakbo tuwing papasok ang user sa pahinang ito
  ionViewWillEnter() {
    this.load();
  }

  async load() {
    this.errorMessage.set('');
    try {
      this.bookings.set(await this.bookingService.getMyBookings());
    } catch (error) {
      this.errorMessage.set(
        apiErrorMessage(error, 'Could not load your bookings. Please try again.'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  canCancel(booking: Booking): boolean {
    return booking.status === 'pending' || booking.status === 'accepted';
  }

  private async showError(message: string) {
    const alert = await this.alertController.create({
      header: 'Something went wrong.',
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  private async cancel(booking: Booking) {
    try {
      await this.bookingService.cancelBooking(booking.id);
    } catch (error) {
      await this.showError(
        apiErrorMessage(error, '"Unable to cancel the booking. Please try again."'),
      );
    }
    await this.load();
  }

  async confirmCancel(booking: Booking) {
    const alert = await this.alertController.create({
      header: 'Cancel Booking?',
      message: `Booking with ${booking.tutor_name} on ${formatDate(booking.session_date)}.`,
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Yes, cancel',
          role: 'confirm',
          handler: () => {
            this.cancel(booking);
          },
        },
      ],
    });
    await alert.present();
  }
}