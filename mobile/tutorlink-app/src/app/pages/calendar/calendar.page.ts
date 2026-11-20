import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, 
  IonLabel, IonButton, IonIcon, IonSpinner, IonModal, IonInput, 
  AlertController, ToastController, IonButtons, IonBackButton, IonDatetime 
} from '@ionic/angular';
import { addOutline, trashOutline, timeOutline, createOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { API_BASE_URL } from '../../config';
import { SessionService } from '../../services/session.service';
import { CalendarService } from '../../services/calendar.service';

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
  private calendarService = inject(CalendarService);

  role = signal<'student' | 'tutor' | 'admin' | null>(null);
  availabilities = signal<any[]>([]);
  highlightedDates = signal<any[]>([]);
  bookedDatesData = signal<any[]>([]); 
  
  loading = signal(true);
  
  selectedDate = signal<string>('');
  selectedDateFormatted = signal<string>(''); 
  startTime = '09:00';
  endTime = '17:00';
  notes = '';
  editingId = signal<number | null>(null); // 🔥 PARA SA EDIT

  constructor() {
    addIcons({ addOutline, trashOutline, timeOutline, createOutline });
  }

  ngOnInit() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        this.role.set(user.role || null);
      } catch (e) {
        this.role.set(null);
      }
    } else {
      this.role.set(null);
    }
    this.selectedDate.set(new Date().toISOString());

    this.loadAvailability();
    this.updateSelectedDate();

    window.addEventListener('refreshCalendar', () => {
      this.loadAvailability();
    });
  }

  ionViewWillEnter() {
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
        this.loadBookedDates(); 
      },
      error: () => this.loading.set(false)
    });
  }

  loadBookedDates() {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
      this.generateHighlightedDates([]);
      return;
    }
    
    const user = JSON.parse(userJson);
    if (user.role !== 'tutor') {
      this.generateHighlightedDates([]);
      return;
    }

    this.calendarService.getTutorBookedDates(user.id).subscribe({
      next: (booked) => {
        console.log('🔥 Booked Dates from Backend:', booked); // 🔥 DEBUG
        this.bookedDatesData.set(booked || []); 
        this.generateHighlightedDates(booked || []);
      },
      error: (err) => {
        console.error('Failed to load booked dates:', err);
        this.bookedDatesData.set([]);
        this.generateHighlightedDates([]); 
      }
    });
  }

  onDateChange(event: any) {
    const dateValue = Array.isArray(event.detail.value) ? event.detail.value[0] : event.detail.value;
    // 🔥 Siguraduhing tama ang format (YYYY-MM-DD)
    if (typeof dateValue === 'string') {
      this.selectedDate.set(dateValue);
      this.updateSelectedDate();
    }
  }

  updateSelectedDate() {
    const raw = this.selectedDate();
    if (!raw) return;
    // 🔥 Safe string-based date extraction (no timezone shift)
    const formatted = raw.split('T')[0];
    this.selectedDateFormatted.set(formatted);
  }

  getAvailabilitiesForSelectedDay() {
    const selected = this.selectedDateFormatted();
    if (!selected) return [];

    const d = new Date(selected + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDayName = dayNames[d.getDay()];

    return this.availabilities().filter(a => {
      if (a.specific_date) return a.specific_date === selected;
      if (a.day_of_week) return a.day_of_week === selectedDayName;
      return false;
    });
  }

  getBookedForSelectedDay() {
    const selected = this.selectedDateFormatted();
    if (!selected) return [];

    const bookedDay = this.bookedDatesData().find(b => b.date === selected);
    return bookedDay && bookedDay.details ? bookedDay.details : [];
  }

  generateHighlightedDates(booked: any[] = []) {
    const dates: any[] = [];
    const today = new Date();
    
    // 1. BOOKED (Yellow, Orange, Red)
    for (const b of booked) {
      let color = '';
      if (b.count === 1) color = '#eab308'; 
      else if (b.count === 2) color = '#f97316'; 
      else if (b.count >= 3) color = '#ef4444'; 

      dates.push({ 
        date: b.date, 
        backgroundColor: color, 
        textColor: '#ffffff' 
      });
    }

    // 2. AVAILABLE (Green)
    for (const a of this.availabilities()) {
      if (a.specific_date) {
        const isBooked = booked.some(b => b.date === a.specific_date);
        if (!isBooked) {
          dates.push({ 
            date: a.specific_date, 
            backgroundColor: '#10b981', 
            textColor: '#ffffff' 
          });
        }
      } 
    }

    // 3. GREY BACKGROUND (No Schedule)
    for (let m = 0; m < 3; m++) {
        const year = today.getFullYear();
        const month = today.getMonth() + m;
        const maxDay = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= maxDay; day++) {
            const y = new Date(year, month, day).getFullYear();
            const mo = String(new Date(year, month, day).getMonth() + 1).padStart(2, '0');
            const da = String(day).padStart(2, '0');
            const dateStr = `${y}-${mo}-${da}`;

            const hasColor = dates.some(d => d.date === dateStr);
            if (!hasColor) {
                dates.push({
                    date: dateStr,
                    backgroundColor: '#e5e7eb', 
                    textColor: '#9ca3af' 
                });
            }
        }
    }
    
    this.highlightedDates.set(dates);
  }

  // 🔥 BAGONG METHOD PARA SA EDIT
  editSchedule(item: any) {
    this.editingId.set(item.id);
    this.startTime = item.start_time;
    this.endTime = item.end_time;
    this.notes = item.notes || '';
    this.addModal.present();
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

    // Kung may editingId, i-update natin
    if (this.editingId()) {
      this.http.put(`${API_BASE_URL}/calendar/availability/${this.editingId()}`, {
        specific_date: this.selectedDateFormatted(),
        start_time: this.startTime, 
        end_time: this.endTime,
        notes: this.notes 
      }, { headers: this.getHeaders() }).subscribe({
        next: () => { 
          this.addModal.dismiss();
          this.editingId.set(null);
          this.notes = '';
          this.loadAvailability(); 
          this.showToast(`Schedule updated!`);
        },
        error: (err) => { 
          console.error(err);
          this.showToast('Error updating schedule.');
        }
      });
    } else {
      // Bagong schedule
      this.http.post(`${API_BASE_URL}/calendar/availability`, {
        specific_date: this.selectedDateFormatted(),
        start_time: this.startTime, 
        end_time: this.endTime,
        notes: this.notes
      }, { headers: this.getHeaders() }).subscribe({
        next: () => { 
          this.addModal.dismiss();
          this.notes = ''; 
          this.loadAvailability(); 
          this.showToast(`Schedule added!`);
        },
        error: (err) => { 
          console.error(err);
          this.showToast('Error adding schedule.');
        }
      });
    }
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