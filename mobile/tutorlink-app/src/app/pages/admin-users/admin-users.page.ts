import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
  IonLabel, IonAvatar, IonButton, IonIcon, IonBackButton, IonButtons,
  AlertController, ToastController, IonSpinner, IonSearchbar
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trashOutline } from 'ionicons/icons';
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
    IonSpinner, IonSearchbar
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
    addIcons({ trashOutline });
  }

  ngOnInit() {
    this.loadUsers();
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
    
    if (pic.startsWith('/uploads/')) {
      return `${API_BASE_URL}${pic}`;
    }
    
    if (pic.includes('localhost:8000')) {
      return pic.replace('localhost:8000', 'localhost:8000');
    }
    
    if (!pic.startsWith('http')) {
      return `${API_BASE_URL}/uploads/${pic}`;
    }
    
    return pic;
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
      next: async () => {
        this.users.update(u => u.filter(user => user.id !== id));
        this.cdr.detectChanges();
        const toast = await this.toastCtrl.create({ message: 'User deleted', duration: 2000, color: 'success' });
        await toast.present();
      },
      error: async (err) => {
        console.error('Delete User Error:', err);
        const toast = await this.toastCtrl.create({ 
          message: err.error?.detail || 'Error deleting user. Please try again.', 
          duration: 3000, 
          color: 'danger' 
        });
        await toast.present();
      }
    });
  }
}