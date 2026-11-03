import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { DAY_LABELS, formatTime, TutorDetail } from '../../models/tutor.model';
import { TutorService } from '../../services/tutor.service';

@Component({
  selector: 'app-tutor-profile',
  templateUrl: './tutor-profile.page.html',
  styleUrls: ['./tutor-profile.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonButton,
    IonChip,
    IonText,
    RouterLink,
  ],
})
export class TutorProfilePage implements OnInit {
  private route = inject(ActivatedRoute);
  private tutorService = inject(TutorService);

  tutor = signal<TutorDetail | undefined>(undefined);
  loading = signal(true);
  errorMessage = signal('');
  dayLabels = DAY_LABELS;
  formatTime = formatTime;

  ngOnInit() {
    this.load();
  }

  async load() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loading.set(true);
    this.errorMessage.set('');
    try {
      this.tutor.set(await this.tutorService.getTutor(id));
    } catch {
      this.errorMessage.set(
        'Hindi makuha ang datos mula sa server. Siguraduhing tumatakbo ang backend, tapos subukan ulit.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}