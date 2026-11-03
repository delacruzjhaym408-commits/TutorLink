import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonText,
} from '@ionic/angular';

import { SessionService } from '../../services/session.service';
import { apiErrorMessage } from '../../utils/api-error';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [IonContent, IonInput, IonButton, IonText, ReactiveFormsModule, RouterLink],
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

  // Kung naka-login pa (may natitirang token), huwag nang ipakita ang Login
  async ngOnInit() {
    await this.session.restore();
    if (this.session.isLoggedIn()) {
      await this.goToStart();
    }
  }

  showError(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  private goToStart() {
    return this.router.navigateByUrl(this.session.isAdmin() ? '/admin' : '/home', {
      replaceUrl: true,
    });
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
      await this.goToStart();
    } catch (error) {
      this.errorMessage.set(apiErrorMessage(error, 'Could not log in. Please try again.'));
    } finally {
      this.submitting.set(false);
    }
  }
}