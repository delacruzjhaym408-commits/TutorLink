import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonButton, IonIcon, IonBackButton, IonButtons, AlertController, ToastController, IonBadge } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { banOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-lessons',
  templateUrl: './admin-lessons.page.html',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonButton, IonIcon, IonBackButton, IonButtons, IonBadge],
})
export class AdminLessonsPage implements OnInit {
  private adminService = inject(AdminService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  lessons = signal<any[]>([]);

  constructor() {
    addIcons({ banOutline, checkmarkCircleOutline });
  }

  ngOnInit() {
    this.loadLessons();
  }

  loadLessons() {
    this.adminService.getLessons().subscribe(res => this.lessons.set(res));
  }

  async confirmDisable(lesson: any) {
    const alert = await this.alertCtrl.create({
      header: 'Disable Group Chat',
      inputs: [{ name: 'reason', type: 'text', placeholder: 'Reason (required)' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Disable', 
          role: 'destructive', 
          handler: (data) => {
            if (!data.reason) return false;
            this.adminService.disableLesson(lesson.id, data.reason).subscribe(() => {
              this.loadLessons();
              this.showToast('GC disabled');
            });
            return true;
          } 
        }
      ]
    });
    await alert.present();
  }

  confirmEnable(lesson: any) {
    this.adminService.enableLesson(lesson.id).subscribe(() => {
      this.loadLessons();
      this.showToast('GC enabled');
    });
  }

  async showToast(msg: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2000, color: 'success' });
    await t.present();
  }
}