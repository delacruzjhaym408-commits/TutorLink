import { Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { DAY_LABELS, formatTime, TutorDetail } from '../../models/tutor.model';
import { BookingService } from '../../services/booking.service';
import { TutorService } from '../../services/tutor.service';
import { apiErrorMessage } from '../../utils/api-error';

// Sinusuri na hindi lumipas ang petsa at mas huli ang end time kaysa start time
function bookingValidator(group: AbstractControl): ValidationErrors | null {
  const date = group.get('sessionDate')?.value as string;
  const start = group.get('startTime')?.value as string;
  const end = group.get('endTime')?.value as string;
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

  const errors: ValidationErrors = {};
  if (date && date < today) {
    errors['pastDate'] = true;
  }
  if (start && end && end <= start) {
    errors['timeOrder'] = true;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

@Component({
  selector: 'app-booking-request',
  templateUrl: './booking-request.page.html',
  styleUrls: ['./booking-request.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonButton,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonText,
    ReactiveFormsModule,
  ],
})
export class BookingRequestPage implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tutorService = inject(TutorService);
  private bookingService = inject(BookingService);

  tutor = signal<TutorDetail | undefined>(undefined);
  loading = signal(true);
  submitting = signal(false);
  errorMessage = signal('');

  today = new Date().toLocaleDateString('en-CA');
  dayLabels = DAY_LABELS;
  formatTime = formatTime;

  form = this.fb.nonNullable.group(
    {
      subjectId: [0, [Validators.required, Validators.min(1)]],
      sessionDate: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      notes: [''],
    },
    { validators: bookingValidator },
  );

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('tutorId'));
    this.tutor.set(await this.tutorService.getTutor(id));
    this.loading.set(false);
  }

  showError(name: 'subjectId' | 'sessionDate' | 'startTime' | 'endTime'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  showPastDate(): boolean {
    return this.form.hasError('pastDate') && this.form.controls.sessionDate.touched;
  }

  showTimeOrder(): boolean {
    return this.form.hasError('timeOrder') && this.form.controls.endTime.touched;
  }

  async onSubmit() {
    const tutor = this.tutor();
    if (this.form.invalid || !tutor) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');
    try {
      const value = this.form.getRawValue();
      await this.bookingService.createBooking({
        tutor_profile_id: tutor.id,
        subject_id: value.subjectId,
        session_date: value.sessionDate,
        start_time: `${value.startTime}:00`,
        end_time: `${value.endTime}:00`,
        notes: value.notes.trim() || null,
      });
      await this.router.navigateByUrl('/my-bookings');
    } catch (error) {
      this.errorMessage.set(
        apiErrorMessage(error, 'The booking request could not be sent. Please try again.'),
      );
    } finally {
      this.submitting.set(false);
    }
  }
}