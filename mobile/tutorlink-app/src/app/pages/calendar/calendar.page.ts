import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, 
  IonLabel, IonButton, IonIcon, IonSpinner, IonModal, IonInput, 
  AlertController, ToastController, IonButtons, IonBackButton, IonDatetime 
} from '@ionic/angular';
import { addOutline, trashOutline, timeOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { API_BASE_URL } from '../../config';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonButton, IonIcon, IonSpinner, IonModal,
    IonInput, IonButtons, IonBackButton, IonDatetime
  ],
})
export class CalendarPage implements OnInit {
  @ViewChild('addModal') addModal!: IonModal;

  private http = inject(HttpClient);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private session = inject(SessionService);

  role = signal<'student' | 'tutor' | 'admin' | null>(null);
  availabilities = signal<any[]>([]);
  highlightedDates = signal<any[]>([]);
  loading = signal(true);
  
  selectedDate = signal<string>('');
  selectedDateFormatted = signal<string>(''); 
  startTime = '09:00';
  endTime = '17:00';

  constructor() {
    addIcons({ addOutline, trashOutline, timeOutline });
  }

ngOnInit() {
  // 🔥 DIRECT READ FROM LOCALSTORAGE (Hindi na aasa sa SessionService)
  const userJson = localStorage.getItem('user');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      this.role.set(user.role || null);
      console.log('🔥 Current Role:', user.role); // Para makita mo sa console
    } catch (e) {
      console.error('Error parsing user:', e);
      this.role.set(null);
    }
  } else {
    console.warn('⚠️ No user found in localStorage');
    this.role.set(null);
  }
  this.selectedDate.set(new Date().toISOString());

  this.loadAvailability();
  this.updateSelectedDate();
}

  getHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  loadAvailability() {
    this.loading.set(true);
    this.http.get<any[]>(`${API_BASE_URL}/calendar/availability`, { headers: this.getHeaders() }).subscribe({
      next: (data) => { 
        this.availabilities.set(data || []); 
        this.loading.set(false); 
        this.generateHighlightedDates(); 
      },
      error: () => this.loading.set(false)
    });
  }

  onDateChange(event: any) {
    const dateValue = Array.isArray(event.detail.value) ? event.detail.value[0] : event.detail.value;
    this.selectedDate.set(dateValue);
    this.updateSelectedDate();
  }

  updateSelectedDate() {
    const raw = this.selectedDate();
    if (!raw) return;
    const formatted = raw.split('T')[0]; // Safe string-based date (no timezone shift)
    this.selectedDateFormatted.set(formatted);
  }

  getAvailabilitiesForSelectedDay() {
    const selected = this.selectedDateFormatted();
    if (!selected) return [];

    // Parse selected date to get day of week (Sunday = 0, Monday = 1, etc.)
    const d = new Date(selected + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDayName = dayNames[d.getDay()];

    return this.availabilities().filter(a => {
      // Case 1: Exact date match
      if (a.specific_date) return a.specific_date === selected;
      // Case 2: Recurring day match
      if (a.day_of_week) return a.day_of_week === selectedDayName;
      return false;
    });
  }

  generateHighlightedDates() {
    const dates: any[] = [];
    const today = new Date();
    
    for (const a of this.availabilities()) {
      // Case 1: Exact date
      if (a.specific_date) {
        dates.push({ 
          date: a.specific_date, 
          backgroundColor: '#10b981', 
          textColor: '#ffffff' 
        });
      } 
      // Case 2: Recurring day_of_week
      else if (a.day_of_week) {
        const dayMap: any = { 
          'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 
          'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 
        };
        const targetDay = dayMap[a.day_of_week];
        
        // Generate dates for 3 months
        for (let m = 0; m < 3; m++) {
          const cursor = new Date(today.getFullYear(), today.getMonth() + m, 1);
          const maxDay = new Date(today.getFullYear(), today.getMonth() + m + 1, 0).getDate();
          
          for (let day = 1; day <= maxDay; day++) {
            cursor.setDate(day);
            if (cursor.getDay() === targetDay) {
              const y = cursor.getFullYear();
              const mo = String(cursor.getMonth() + 1).padStart(2, '0');
              const da = String(cursor.getDate()).padStart(2, '0');
              dates.push({ 
                date: `${y}-${mo}-${da}`, 
                backgroundColor: '#10b981', 
                textColor: '#ffffff' 
              });
            }
          }
        }
      }
    }
    
    this.highlightedDates.set(dates);
  }

  async addAvailability() {
    if (this.role() !== 'tutor') return;
    
    if (!this.startTime || !this.endTime) {
      this.showToast('Please set both start and end times.');
      return;
    }
    
    if (this.startTime >= this.endTime) {
      this.showToast('Start time must be before end time.');
      return;
    }

    this.http.post(`${API_BASE_URL}/calendar/availability`, {
      specific_date: this.selectedDateFormatted(),
      start_time: this.startTime, 
      end_time: this.endTime
    }, { headers: this.getHeaders() }).subscribe({
      next: () => { 
        this.addModal.dismiss();
        this.loadAvailability(); 
        this.showToast(`Schedule added!`);
      },
      error: (err) => { 
        console.error(err);
        this.showToast('Error adding schedule.');
      }
    });
  }

  async deleteAvailability(id: number) {
    if (this.role() !== 'tutor') return;

    const alert = await this.alertCtrl.create({
      header: 'Remove Schedule',
      message: 'Are you sure you want to remove this available time?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Remove', 
          role: 'destructive',
          handler: () => {
            this.http.delete(`${API_BASE_URL}/calendar/availability/${id}`, { headers: this.getHeaders() }).subscribe({
              next: () => {
                this.loadAvailability();
                this.showToast('Schedule removed.');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(msg: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color: 'primary' });
    await toast.present();
  }
}