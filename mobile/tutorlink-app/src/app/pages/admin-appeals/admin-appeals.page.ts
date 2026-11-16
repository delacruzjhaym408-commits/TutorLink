import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonButton, IonIcon, IonBackButton, IonButtons, IonBadge, ToastController, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, trashOutline } from 'ionicons/icons';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-appeals',
  templateUrl: './admin-appeals.page.html',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonButton, IonIcon, IonBackButton, IonButtons, IonBadge],
})
export class AdminAppealsPage implements OnInit {
  private adminService = inject(AdminService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  
  appeals = signal<any[]>([]);

  constructor() {
    addIcons({ checkmarkCircleOutline, trashOutline });
  }

  ngOnInit() {
    this.loadAppeals();
  }

  loadAppeals() {
    this.adminService.getAppeals().subscribe(res => this.appeals.set(res));
  }

  approveAppeal(userId: number) {
    this.adminService.enableUser(userId).subscribe({
      next: () => {
        this.showToast('User enabled and appeal approved.');
        this.loadAppeals();
      },
      error: (err) => this.showToast(err.error?.detail || 'Error enabling user', 'danger')
    });
  }

  // 🔥 BAGONG FUNCTION PARA SA DELETE
  async confirmDelete(appeal: any) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Appeal',
      message: `Are you sure you want to delete the appeal from ${appeal.user_name}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Delete', 
          role: 'destructive', 
          handler: () => this.deleteAppeal(appeal.id) 
        }
      ]
    });
    await alert.present();
  }

  deleteAppeal(id: number) {
    this.adminService.deleteAppeal(id).subscribe({
      next: () => {
        this.appeals.update(a => a.filter(appeal => appeal.id !== id));
        this.showToast('Appeal deleted', 'success');
      },
      error: (err) => this.showToast(err.error?.detail || 'Error deleting appeal', 'danger')
    });
  }

  async showToast(msg: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color });
    await toast.present();
  }
}