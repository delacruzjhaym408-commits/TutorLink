import { Component, computed, inject, signal } from '@angular/core';
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

import { TutorApplication } from '../../models/application.model';
import { formatDate } from '../../models/booking.model';
import { IncomingBooking } from '../../models/incoming-booking.model';
import { formatTime } from '../../models/tutor.model';
import { ApplicationService } from '../../services/application.service';
import { TutorBookingService } from '../../services/tutor-booking.service';
import { apiErrorMessage } from '../../utils/api-error';

@Component({
  selector: 'app-tutor-dashboard',
  templateUrl: './tutor-dashboard.page.html',
  styleUrls: ['./tutor-dashboard.page.scss'],
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
export class TutorDashboardPage {
  private applicationService = inject(ApplicationService);
  private tutorBookingService = inject(TutorBookingService);

  application = signal<TutorApplication | null>(null);
  bookings = signal<IncomingBooking[]>([]);
  loading = signal(true);
  errorMessage = signal('');

  formatDate = formatDate;
  formatTime = formatTime;

  pendingCount = computed(
    () => this.bookings().filter((b) => b.status === 'pending').length,
  );
  upcomingCount = computed(
    () => this.bookings().filter((b) => b.status === 'accepted').length,
  );
  completedCount = computed(
    () => this.bookings().filter((b) => b.status === 'completed').length,
  );

  // Ang pinakamalapit na tinanggap na sesyon na hindi pa lumilipas ang petsa
  nextSession = computed(() => {
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const accepted = this.bookings()
      .filter((b) => b.status === 'accepted' && b.session_date >= today)
      .sort((a, b) =>
        (a.session_date + a.start_time).localeCompare(b.session_date + b.start_time),
      );
    return accepted.length > 0 ? accepted[0] : null;
  });

  // Tumatakbo tuwing papasok ang user sa pahinang ito
  ionViewWillEnter() {
    this.load();
  }

  async load() {
    this.errorMessage.set('');
    try {
      const [application, bookings] = await Promise.all([
        this.applicationService.getMyApplication(),
        this.tutorBookingService.getIncoming(),
      ]);
      this.application.set(application);
      this.bookings.set(bookings);
    } catch (error) {
      this.errorMessage.set(
        apiErrorMessage(error, 'Could not load the dashboard data. Please try again.'),
      );
    } finally {
      this.loading.set(false);
    }
  }
}