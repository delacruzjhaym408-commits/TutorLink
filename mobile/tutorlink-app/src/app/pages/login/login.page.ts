import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton, IonContent, IonInput, IonText, IonIcon, IonSpinner
} from '@ionic/angular';
import { schoolOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons'; // 🔥 IDINAGDAG
import { SessionService } from '../../services/session.service';
import { apiErrorMessage } from '../../utils/api-error';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonInput, IonButton, IonText, IonIcon, IonSpinner,
    ReactiveFormsModule, RouterLink
  ],
})
export class LoginPage implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private session = inject(SessionService);

  submitting = signal(false);
  errorMessage = signal('');

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    // 🔥 IDINAGDAG: Ito ang kulang para gumana ang icon
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
    try {
      const { email, password } = this.form.getRawValue();
      await this.session.login(email, password);
      
      const user = this.session.user();
      if (user?.role === 'admin') {
        await this.router.navigateByUrl('/admin/dashboard', { replaceUrl: true });
      } else {
        await this.router.navigateByUrl('/home', { replaceUrl: true });
      }
      
    } catch (error) {
      this.errorMessage.set(
        apiErrorMessage(error, 'Could not log in. Please try again.'),
      );
    } finally {
      this.submitting.set(false);
    }
  }
}