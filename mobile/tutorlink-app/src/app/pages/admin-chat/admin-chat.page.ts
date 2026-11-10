import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, 
  IonButtons, IonSpinner, IonIcon
} from '@ionic/angular'; // <-- INALIS ANG IonButton
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline, warningOutline } from 'ionicons/icons';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { API_BASE_URL } from '../../config';

@Component({
  selector: 'app-admin-chat',
  templateUrl: './admin-chat.page.html',
  styleUrls: ['./admin-chat.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, 
    IonBackButton, IonButtons, IonSpinner, IonIcon
    // <-- INALIS DIN DITO ANG IONBUTTON
  ],
})
export class AdminChatPage implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  messages = signal<any[]>([]);
  loading = signal(true);

  constructor() {
    addIcons({ shieldCheckmarkOutline, warningOutline });
  }

  ngOnInit() {
    this.loadMessages();
  }

  loadMessages() {
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<any[]>(`${API_BASE_URL}/admin-messages/my-messages`, { headers }).subscribe({
      next: (data) => {
        this.messages.set(data);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  goBack() {
    this.router.navigate(['/profile']);
  }
}