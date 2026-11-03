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

import { TutorApplicationCreate } from '../../models/application.model';
import { DAY_LABELS, Subject, TutorDetail } from '../../models/tutor.model';
import { ApplicationService } from '../../services/application.service';
import { TutorService } from '../../services/tutor.service';
import { apiErrorMessage } from '../../utils/api-error';

// The end must be later than the start for each availability slot
function slotValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('start')?.value as string;
  const end = group.get('end')?.value as string;
  return start && end && end <= start ? { timeOrder: true } : null;
}

@Component({
  selector: 'app-apply-tutor',
  templateUrl: './apply-tutor.page.html',
  styleUrls: ['./apply-tutor.page.scss'],
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
export class ApplyTutorPage implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private tutorService = inject(TutorService);
  private applicationService = inject(ApplicationService);

  // The same form is used to apply (default) and to edit an approved tutor's profile
  // (the route sets data: { mode: 'edit' })
  editMode = this.route.snapshot.data['mode'] === 'edit';

  subjects = signal<Subject[]>([]);
  submitting = signal(false);
  errorMessage = signal('');
  days = Object.entries(DAY_LABELS);

  form = this.fb.nonNullable.group({
    qualifications: ['', [Validators.required, Validators.minLength(10)]],
    bio: [''],
    hourlyRate: [null as number | null, [Validators.required, Validators.min(50)]],
    subjectIds: [[] as number[], Validators.required],
    availability: this.fb.array([this.newSlot()]),
  });

  get availability() {
    return this.form.controls.availability;
  }

  private newSlot() {
    return this.fb.nonNullable.group(
      {
        day: ['monday', Validators.required],
        start: ['', Validators.required],
        end: ['', Validators.required],
      },
      { validators: slotValidator },
    );
  }

  async ngOnInit() {
    try {
      this.subjects.set(await this.tutorService.getSubjects());

      if (this.editMode) {
        this.fillForm(await this.tutorService.getMyProfile());
        return;
      }

      // If there is a pending or approved application, redirect to the status page
      const existing = await this.applicationService.getMyApplication();
      if (existing && existing.status !== 'rejected') {
        await this.router.navigateByUrl('/tutor-application', { replaceUrl: true });
      }
    } catch (error) {
      this.errorMessage.set(
        apiErrorMessage(error, 'Could not load the form data. Please try again.'),
      );
    }
  }

  // Copies the current tutor profile into the form (edit mode)
  private fillForm(profile: TutorDetail) {
    this.form.patchValue({
      qualifications: profile.qualifications,
      bio: profile.bio ?? '',
      hourlyRate: profile.hourly_rate,
      subjectIds: profile.subjects.map((subject) => subject.id),
    });

    this.availability.clear();
    for (const slot of profile.availability) {
      const group = this.newSlot();
      group.patchValue({
        day: slot.day_of_week,
        start: slot.start_time.slice(0, 5),
        end: slot.end_time.slice(0, 5),
      });
      this.availability.push(group);
    }
    if (this.availability.length === 0) {
      this.availability.push(this.newSlot());
    }
  }

  showError(name: 'qualifications' | 'hourlyRate' | 'subjectIds'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  slotTimeError(index: number): boolean {
    const slot = this.availability.at(index);
    return slot.hasError('timeOrder') && slot.controls.end.touched;
  }

  addSlot() {
    this.availability.push(this.newSlot());
  }

  removeSlot(index: number) {
    if (this.availability.length > 1) {
      this.availability.removeAt(index);
    }
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');
    try {
      const value = this.form.getRawValue();
      const payload: TutorApplicationCreate = {
        qualifications: value.qualifications.trim(),
        bio: value.bio.trim() || null,
        hourly_rate: Number(value.hourlyRate),
        subject_ids: value.subjectIds,
        availability: value.availability.map((slot) => ({
          day_of_week: slot.day,
          start_time: `${slot.start}:00`,
          end_time: `${slot.end}:00`,
        })),
      };

      if (this.editMode) {
        await this.tutorService.updateMyProfile(payload);
        await this.router.navigateByUrl('/tutor-dashboard', { replaceUrl: true });
      } else {
        await this.applicationService.submit(payload);
        await this.router.navigateByUrl('/tutor-application', { replaceUrl: true });
      }
    } catch (error) {
      this.errorMessage.set(
        apiErrorMessage(
          error,
          this.editMode
            ? 'Could not save the changes. Please try again.'
            : 'The application could not be sent. Please try again.',
        ),
      );
    } finally {
      this.submitting.set(false);
    }
  }
}