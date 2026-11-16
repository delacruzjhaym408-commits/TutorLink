import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
  IonLabel, IonAvatar, IonButton, IonIcon, IonBackButton, IonButtons,
  AlertController, ToastController, IonSpinner, IonSearchbar,
  IonRefresher, IonRefresherContent, IonBadge
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trashOutline, banOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { AdminService } from '../../services/admin.service';
import { API_BASE_URL } from '../../config';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.page.html',
  styleUrls: ['./admin-users.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
    IonLabel, IonAvatar, IonButton, IonIcon, IonBackButton, IonButtons,
    IonSpinner, IonSearchbar, IonRefresher, IonRefresherContent, IonBadge
  ],
})
export class AdminUsersPage implements OnInit {
  private adminService = inject(AdminService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  users = signal<any[]>([]);
  loading = signal(true);
  searchQuery = signal('');

  constructor() {
    addIcons({ trashOutline, banOutline, checkmarkCircleOutline });
  }

  ngOnInit() {
    this.loadUsers();
  }

  doRefresh(event: any) {
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.cdr.detectChanges();
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      }
    });
  }

  loadUsers() {
    this.loading.set(true);
    this.adminService.getUsers().subscribe(users => {
      this.users.set(users);
      this.loading.set(false);
      this.cdr.detectChanges();
    });
  }

  get filteredUsers() {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.users();
    
    return this.users().filter(user => 
      user.full_name.toLowerCase().includes(query) || 
      user.email.toLowerCase().includes(query)
    );
  }

  onSearchChange(event: any) {
    this.searchQuery.set(event.detail.value || '');
  }

  getProfilePictureUrl(pic: string | null | undefined): string {
    if (!pic) return 'https://ionicframework.com/docs/img/demos/avatar.svg';
    if (pic.startsWith('/uploads/')) return `${API_BASE_URL}${pic}`;
    if (!pic.startsWith('http')) return `${API_BASE_URL}/uploads/${pic}`;
    if (pic.includes('localhost')) return pic.replace(/http:\/\/localhost:\d+/, API_BASE_URL);
    return pic;
  }

  // 🔥 DISABLE USER LOGIC
  async confirmDisable(user: any) {
    const alert = await this.alertCtrl.create({
      header: 'Disable User',
      message: `Are you sure you want to disable ${user.full_name}?`,
      inputs: [
        {
          name: 'reason',
          type: 'text',
          placeholder: 'Reason for disabling (required)',
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Disable', 
          role: 'destructive', 
          handler: (data) => {
            if (!data.reason || !data.reason.trim()) {
              this.showToast('Reason is required to disable a user', 'warning');
              return false; // Prevent closing
            }
            this.disableUser(user.id, data.reason);
            return true;
          } 
        }
      ]
    });
    await alert.present();
  }

  disableUser(id: number, reason: string) {
    this.adminService.disableUser(id, reason).subscribe({
      next: (updatedUser) => {
        // Update list locally
        this.users.update(u => u.map(user => user.id === id ? { ...user, ...updatedUser } : user));
        this.cdr.detectChanges();
        this.showToast('User disabled successfully', 'success');
      },
      error: (err) => {
        this.showToast(err.error?.detail || 'Error disabling user', 'danger');
      }
    });
  }

  // 🔥 ENABLE USER LOGIC
  async confirmEnable(user: any) {
    const alert = await this.alertCtrl.create({
      header: 'Enable User',
      message: `Are you sure you want to enable ${user.full_name}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Enable', role: 'primary', handler: () => this.enableUser(user.id) }
      ]
    });
    await alert.present();
  }

  enableUser(id: number) {
    this.adminService.enableUser(id).subscribe({
      next: (updatedUser) => {
        this.users.update(u => u.map(user => user.id === id ? { ...user, ...updatedUser } : user));
        this.cdr.detectChanges();
        this.showToast('User enabled successfully', 'success');
      },
      error: (err) => {
        this.showToast(err.error?.detail || 'Error enabling user', 'danger');
      }
    });
  }

  async confirmDelete(user: any) {
    const alert = await this.alertCtrl.create({
      header: 'Delete User',
      message: `Are you sure you want to delete ${user.full_name}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => this.deleteUser(user.id) }
      ]
    });
    await alert.present();
  }

  deleteUser(id: number) {
    this.adminService.deleteUser(id).subscribe({
      next: () => {
        this.users.update(u => u.filter(user => user.id !== id));
        this.cdr.detectChanges();
        this.showToast('User deleted', 'success');
      },
      error: (err) => {
        this.showToast(err.error?.detail || 'Error deleting user', 'danger');
      }
    });
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color });
    await toast.present();
  }
}