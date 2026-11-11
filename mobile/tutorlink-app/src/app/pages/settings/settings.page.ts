import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonInput,
  IonTextarea, IonText, IonButtons, IonBackButton, IonIcon, 
  ToastController, IonMenu, IonAvatar, MenuController, IonSpinner,
  IonList, IonItem, IonLabel, IonRefresher, IonRefresherContent
} from '@ionic/angular';
import { personOutline, callOutline, lockClosedOutline, cameraOutline, menuOutline, homeOutline, chatbubbleOutline, bookOutline, settingsOutline, logOutOutline, mailOutline, cashOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Router } from '@angular/router';

import { SessionService } from '../../services/session.service';
import { API_BASE_URL } from '../../config';
import { AuthUser } from '../../models/user.model';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, IonHeader, IonToolbar, IonTitle,
    IonContent, IonButton, IonInput, IonTextarea, IonText, IonButtons,
    IonBackButton, IonIcon, IonMenu, IonAvatar, IonSpinner,
    IonList, IonItem, IonLabel, IonRefresher, IonRefresherContent
  ],
})
export class SettingsPage implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private session = inject(SessionService);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);
  public menuController = inject(MenuController);

  submitting = signal(false);
  errorMessage = signal('');
  user = signal<AuthUser | null>(null);
  selectedImage = signal<string | null>(null);
  selectedDescImage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    phone_number: [''],
    description: [''],
    gcash_number: [''],
    current_password: [''],
    new_password: [''],
    confirm_new_password: [''],
  });

  constructor() {
    addIcons({ personOutline, callOutline, lockClosedOutline, cameraOutline, menuOutline, homeOutline, chatbubbleOutline, bookOutline, settingsOutline, logOutOutline, mailOutline, cashOutline });
  }

  ngOnInit() {
    const currentUser = this.session.user();
    if (currentUser) {
    this.user.set(currentUser);
      
      // IDINAGDAG: I-convert ang path para lumabas ang image preview
      this.selectedImage.set(this.getFullImageUrl(currentUser.profile_picture));
      this.selectedDescImage.set(this.getFullImageUrl(currentUser.description_picture));
      
      this.form.patchValue({
        full_name: currentUser.full_name,
        phone_number: currentUser.phone_number || '',
        description: currentUser.description || '',
        gcash_number: currentUser.gcash_number || '',
      });
    }
  }

    doRefresh(event: any) {
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    
    this.http.get<AuthUser>(`${API_BASE_URL}/users/me`, { headers }).subscribe({
      next: (user) => {
        this.user.set(user);
        this.session.currentUser.set(user);
        localStorage.setItem('user', JSON.stringify(user));
        
        this.selectedImage.set(this.getFullImageUrl(user.profile_picture));
        this.selectedDescImage.set(this.getFullImageUrl(user.description_picture));
        
        this.form.patchValue({
          full_name: user.full_name,
          phone_number: user.phone_number || '',
          description: user.description || '',
          gcash_number: user.gcash_number || '',
        });
        
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      }
    });
  }

  // IDINAGDAG: Function para mag-convert ng path to full URL
  getFullImageUrl(pic: string | null | undefined): string | null {
  if (!pic) return null;
  if (pic.startsWith('/uploads/')) {
    return `${API_BASE_URL}${pic}`;
  }
  if (!pic.startsWith('http')) {
    return `${API_BASE_URL}/uploads/${pic}`;
  }
  
  // 🔥 AYUSIN: Palitan ang lumang localhost sa API_BASE_URL
  if (pic.includes('localhost')) {
    return pic.replace(/http:\/\/localhost:\d+/, API_BASE_URL);
  }
  return pic;
}

  async openMenu() { await this.menuController.open('main-menu'); }

  async pickImage() {
    try {
      const image = await Camera.getPhoto({ quality: 90, allowEditing: true, resultType: CameraResultType.DataUrl, source: CameraSource.Photos });
      if (image.dataUrl) this.selectedImage.set(image.dataUrl);
    } catch (e) {}
  }

  async pickDescImage() {
    try {
      const image = await Camera.getPhoto({ quality: 90, allowEditing: true, resultType: CameraResultType.DataUrl, source: CameraSource.Photos });
      if (image.dataUrl) this.selectedDescImage.set(image.dataUrl);
    } catch (e) {}
  }

  showError(name: 'full_name'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  async onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    if (value.new_password && value.new_password !== value.confirm_new_password) {
      this.errorMessage.set('New passwords do not match.');
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    const formData = new FormData();
    formData.append('full_name', value.full_name.trim());
    formData.append('phone_number', value.phone_number?.trim() || '');
    formData.append('description', value.description?.trim() || '');
    formData.append('gcash_number', value.gcash_number?.trim() || '');
    
    if (value.new_password) {
      formData.append('current_password', value.current_password);
      formData.append('new_password', value.new_password);
    }
    const img = this.selectedImage();
    if (img && img.startsWith('data:image')) { formData.append('profile_picture', this.dataURItoBlob(img), 'profile.jpg'); }
    const descImg = this.selectedDescImage();
    if (descImg && descImg.startsWith('data:image')) { formData.append('description_picture', this.dataURItoBlob(descImg), 'description.jpg'); }

    this.http.put<AuthUser>(`${API_BASE_URL}/users/me`, formData, { headers }).subscribe({
      next: async (updatedUser) => {
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.session.currentUser.set(updatedUser);
        this.user.set(updatedUser);
        
        // I-refresh ang preview pagkatapos ng update
        this.selectedImage.set(this.getFullImageUrl(updatedUser.profile_picture));
        this.selectedDescImage.set(this.getFullImageUrl(updatedUser.description_picture));

        const toast = await this.toastCtrl.create({ message: 'Profile updated!', duration: 2000, color: 'success' });
        await toast.present();
        this.submitting.set(false);
        this.form.patchValue({ current_password: '', new_password: '', confirm_new_password: '' });
      },
      error: async (err) => {
        this.errorMessage.set(err.error?.detail || 'Could not update profile.');
        this.submitting.set(false);
      },
    });
  }

  dataURItoBlob(dataURI: string) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: mimeString });
  }

  logout() { this.menuController.close('main-menu'); this.session.logout(); this.router.navigate(['/login']); }
}