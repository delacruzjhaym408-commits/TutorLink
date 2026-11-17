import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonMenuButton, IonIcon, IonLabel, IonList, IonItem, IonCard, 
  IonCardContent, IonCardHeader, IonCardTitle, IonButton, IonSpinner,
  IonBadge, IonSelect, IonSelectOption, IonInput, IonDatetime, IonSegment, IonSegmentButton
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline, addOutline } from 'ionicons/icons';
import { SessionService } from '../../services/session.service';
import { CalendarService, TutorAvailability, SessionBooking } from '../../services/calendar.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, 
    IonContent, IonButtons, IonMenuButton, IonIcon, IonLabel, 
    IonList, IonItem, IonCard, IonCardContent, IonCardHeader, 
    IonCardTitle, IonButton, IonSpinner, IonBadge, IonSelect, 
    IonSelectOption, IonInput, IonDatetime, IonSegment, IonSegmentButton
  ]
})
export class CalendarPage implements OnInit {
  private session = inject(SessionService);
  private calendarService = inject(CalendarService);
  private cdr = inject(ChangeDetectorRef);
  private toastCtrl = inject(ToastController);

  currentUser = this.session.user;
  activeTab = signal<string>('student_view'); 

  sessions = signal<SessionBooking[]>([]);
  availabilities = signal<TutorAvailability[]>([]);
  loading = signal(true);

  selectedDate = signal<string>(new Date().toISOString());
  highlightedDates: any[] = []; 

  selectedDay = 'Monday';
  startTime = '';
  endTime = '';
  isSaving = false;
  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  constructor() {
    addIcons({ calendarOutline, timeOutline, addOutline });
  }

  ngOnInit() { this.loadData(); }
  ionViewWillEnter() { this.loadData(); }

  loadData() {
    this.loading.set(true);
    
    this.calendarService.getMySessions().subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.processHighlights(data);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading.set(false);
        this.showToast('Error loading sessions.');
        this.cdr.detectChanges();
      }
    });

    if (this.currentUser()) {
      this.calendarService.getTutorAvailability(this.currentUser()!.id).subscribe({
        next: (data) => {
          this.availabilities.set(data);
          this.cdr.detectChanges();
        }
      });
    }
  }

  processHighlights(data: SessionBooking[]) {
    const dates: any[] = [];
    data.forEach(s => {
      if (s.status !== 'cancelled') {
        dates.push({
          date: s.session_date,
          textColor: '#ffffff',
          backgroundColor: s.status === 'completed' ? '#2dd36f' : (s.status === 'pending' ? '#ffc409' : '#3880ff')
        });
      }
    });
    this.highlightedDates = dates;
  }

  getSessionsForDate(dateString: string) {
    if (!dateString) return [];
    const dateOnly = dateString.split('T')[0];
    return this.sessions().filter(s => s.session_date === dateOnly);
  }

  // 🔥 AYOS NA LOGIC PARA SA TYPE SAFETY
  onTabChange(event: any) {
    const val = event.detail.value;
    if (typeof val === 'string') this.activeTab.set(val);
  }

  onDateChange(event: any) {
    const val = event.detail.value;
    if (typeof val === 'string') this.selectedDate.set(val);
  }

  addAvailability() {
    if (!this.startTime || !this.endTime) {
      this.showToast('Please select start and end time.');
      return;
    }

    this.isSaving = true;
    const data: TutorAvailability = {
      day_of_week: this.selectedDay,
      start_time: this.startTime,
      end_time: this.endTime
    };

    this.calendarService.setAvailability(data).subscribe({
      next: () => {
        this.showToast('Availability added!');
        this.startTime = '';
        this.endTime = '';
        this.isSaving = false;
        this.loadData();
      },
      error: () => {
        this.showToast('Error adding availability.');
        this.isSaving = false;
      }
    });
  }

  async showToast(msg: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color: 'primary' });
    await toast.present();
  }
}