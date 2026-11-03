import { Component, inject, OnInit, signal } from '@angular/core';
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
  IonInput,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { DAY_LABELS, Subject, TutorSummary } from '../../models/tutor.model';
import { TutorService } from '../../services/tutor.service';

const ERROR_TEXT =
  'Hindi makuha ang datos mula sa server. Siguraduhing tumatakbo ang backend, tapos subukan ulit.';

@Component({
  selector: 'app-tutors',
  templateUrl: './tutors.page.html',
  styleUrls: ['./tutors.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonButton,
    IonSelect,
    IonSelectOption,
    IonInput,
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
export class TutorsPage implements OnInit {
  private tutorService = inject(TutorService);

  subjects = signal<Subject[]>([]);
  tutors = signal<TutorSummary[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  days = Object.entries(DAY_LABELS); // [['monday', 'Lunes'], ...]

  subjectId = 0;
  day = 'all';
  maxRate: number | null = null;

  // Binibilang ang bawat request para hindi matalo ng lumang sagot ang bago
  private requestId = 0;

  async ngOnInit() {
    try {
      this.subjects.set(await this.tutorService.getSubjects());
    } catch {
      // Ang loadTutors ang magpapakita ng error
    }
    await this.loadTutors();
  }

  async loadTutors() {
    const currentRequest = ++this.requestId;
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const result = await this.tutorService.getTutors({
        subjectId: this.subjectId,
        maxRate: this.maxRate,
        day: this.day,
      });
      if (currentRequest !== this.requestId) {
        return; // may mas bago nang request, kaya huwag gamitin ang sagot na ito
      }
      this.tutors.set(result);
    } catch {
      if (currentRequest !== this.requestId) {
        return;
      }
      this.tutors.set([]);
      this.errorMessage.set(ERROR_TEXT);
    } finally {
      if (currentRequest === this.requestId) {
        this.loading.set(false);
      }
    }
  }

  onSubjectChange(event: CustomEvent) {
    this.subjectId = Number(event.detail.value);
    this.loadTutors();
  }

  onDayChange(event: CustomEvent) {
    this.day = String(event.detail.value);
    this.loadTutors();
  }

  onRateInput(event: CustomEvent) {
    const raw = event.detail.value;
    const value = Number(raw);
    this.maxRate = raw === '' || raw == null || isNaN(value) ? null : value;
    this.loadTutors();
  }
}