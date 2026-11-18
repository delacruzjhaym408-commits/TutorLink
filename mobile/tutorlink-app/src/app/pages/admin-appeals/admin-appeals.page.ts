import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, 
  IonLabel, IonButton, IonIcon, IonBackButton, IonButtons, IonBadge, 
  ToastController, AlertController, IonSegment, IonSegmentButton 
} from '@ionic/angular';
import { addIcons } from 'ionicons';
// Added documentTextOutline to fix the missing icon error
import { checkmarkCircleOutline, trashOutline, closeCircleOutline, documentTextOutline } from 'ionicons/icons';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-appeals',
  templateUrl: './admin-appeals.page.html',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, 
    IonList, IonItem, IonLabel, IonButton, IonIcon, IonBackButton, IonButtons, 
    IonBadge, IonSegment, IonSegmentButton
  ],
})
export class AdminAppealsPage implements OnInit {
  private adminService = inject(AdminService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  
  appeals = signal<any[]>([]);
  activeTab = signal<string>('pending');

  constructor() {
    // Registered the new icon here
    addIcons({ checkmarkCircleOutline, trashOutline, closeCircleOutline, documentTextOutline });
  }

  ngOnInit() {
    this.loadAppeals();
  }

  loadAppeals() {
    this.adminService.getAppeals().subscribe(res => this.appeals.set(res));
  }

  onTabChange(event: any) {
    const val = event.detail.value;
    if (typeof val === 'string') {
      this.activeTab.set(val);
    }
  }

  getFilteredAppeals() {
    return this.appeals().filter(a => a.status === this.activeTab());
  }

  approveAppeal(appealId: number) {
    this.adminService.approveAppeal(appealId).subscribe({
      next: () => {
        this.showToast('User enabled and appeal approved.');
        this.loadAppeals();
      },
      error: (err) => this.showToast(err.error?.detail || 'Error enabling user', 'danger')
    });
  }

  rejectAppeal(appealId: number) {
    this.adminService.rejectAppeal(appealId).subscribe({
      next: () => {
        this.showToast('Appeal rejected.');
        this.loadAppeals();
      },
      error: (err) => this.showToast(err.error?.detail || 'Error rejecting appeal', 'danger')
    });
  }

  async confirmDelete(appeal: any) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Appeal',
      message: `Are you sure you want to delete the appeal from ${appeal.user_name}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => this.deleteAppeal(appeal.id) }
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