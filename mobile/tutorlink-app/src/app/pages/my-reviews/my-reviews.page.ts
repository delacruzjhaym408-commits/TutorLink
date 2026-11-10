import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon,
  IonBackButton, IonButtons, IonSpinner
} from '@ionic/angular'; // <-- INALIS ANG IonList, IonItem, IonLabel, IonAvatar, IonNote
import { addIcons } from 'ionicons';
import { star, starOutline, chatbubbleOutline } from 'ionicons/icons';
import { TutorPostService } from '../../services/tutor-post.service';

@Component({
  selector: 'app-my-reviews',
  templateUrl: './my-reviews.page.html',
  styleUrls: ['./my-reviews.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon,
    IonBackButton, IonButtons, IonSpinner
    // <-- INALIS DIN SILA DITO
  ],
})
export class MyReviewsPage implements OnInit {
  private tutorPostService = inject(TutorPostService);
  private cdr = inject(ChangeDetectorRef);

  reviews = signal<any[]>([]);
  loading = signal(true);
  averageRating = signal(0);

  constructor() {
    addIcons({ star, starOutline, chatbubbleOutline });
  }

  ngOnInit() {
    this.loadReviews();
  }

  loadReviews() {
    this.loading.set(true);
    this.tutorPostService.getMyReviews().subscribe({
      next: (data) => {
        this.reviews.set(data);
        this.loading.set(false);
        
        if (data.length > 0) {
          const total = data.reduce((sum: number, r: any) => sum + r.rating, 0);
          this.averageRating.set(Number((total / data.length).toFixed(1)));
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
        this.cdr.detectChanges();
      }
    });
  }
}