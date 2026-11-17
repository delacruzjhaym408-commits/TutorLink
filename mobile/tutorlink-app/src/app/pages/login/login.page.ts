import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton, IonContent, IonInput, IonText, IonIcon, IonSpinner, IonTextarea
} from '@ionic/angular';
import { schoolOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { SessionService } from '../../services/session.service';
import { apiErrorMessage } from '../../utils/api-error';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonTextarea, FormsModule, 
    IonContent, IonInput, IonButton, IonText, IonIcon, IonSpinner,
    ReactiveFormsModule, RouterLink
  ],
})
export class LoginPage implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private session = inject(SessionService);
  private adminService = inject(AdminService);
  
  isDisabled = signal(false);
  appealReason = '';
  disabledEmail = '';
  disabledReason = signal('');
  submitting = signal(false);
  errorMessage = signal('');

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    addIcons({ schoolOutline });
  }

  async ngOnInit() {
    await this.session.restore();
    if (this.session.isLoggedIn()) {
      const user = this.session.user();
      if (user?.role === 'admin') {
        await this.router.navigateByUrl('/admin/dashboard', { replaceUrl: true });
      } else {
        await this.router.navigateByUrl('/home', { replaceUrl: true });
      }
    }
  }

  showError(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');
    this.isDisabled.set(false);

    try {
      const { email, password } = this.form.getRawValue();
      await this.session.login(email, password);
      
      const user = this.session.user();
      if (user?.role === 'admin') {
        await this.router.navigateByUrl('/admin/dashboard', { replaceUrl: true });
      } else {
        await this.router.navigateByUrl('/home', { replaceUrl: true });
      }
      
    } catch (error: any) {
      // 🔥 CHECK IF ACCOUNT IS DISABLED
      if (error?.error?.detail?.code === 'account_disabled') {
        this.disabledEmail = this.form.getRawValue().email;
        this.disabledReason.set(error.error.detail.reason || 'Your account has been disabled by the Admin.');
        this.isDisabled.set(true);
      } else {
        this.errorMessage.set(apiErrorMessage(error, 'Could not log in. Please try again.'));
      }
    } finally {
      this.submitting.set(false);
    }
  }

  async sendAppeal() {
    if (!this.appealReason.trim()) return;
    
    this.submitting.set(true);
    this.adminService.submitAppeal(this.disabledEmail, this.appealReason).subscribe({
      next: async () => {
        this.submitting.set(false);
        this.isDisabled.set(false);
        this.appealReason = '';
        this.errorMessage.set('Appeal sent successfully! Admin will review it.');
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to send appeal.');
      }
    });
  }
}