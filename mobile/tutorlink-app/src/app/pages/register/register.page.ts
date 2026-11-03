import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonText,
} from '@ionic/angular';

import { SessionService } from '../../services/session.service';
import { apiErrorMessage } from '../../utils/api-error';

// Sinusuri kung pareho ang password at ang confirm password
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  imports: [
    IonContent,
    IonInput,
    IonButton,
    IonText,
    IonSelect,
    IonSelectOption,
    ReactiveFormsModule,
    RouterLink,
  ],
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private session = inject(SessionService);

  submitting = signal(false);
  errorMessage = signal('');

  form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['student', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  showError(name: 'fullName' | 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  showMismatch(): boolean {
    return (
      this.form.hasError('mismatch') &&
      this.form.controls.confirmPassword.touched
    );
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');
    try {
      const value = this.form.getRawValue();
      await this.session.register({
        email: value.email.trim(),
        password: value.password,
        full_name: value.fullName.trim(),
        role: value.role as 'student' | 'parent',
      });
      // Pagkatapos magparehistro, awtomatiko na siyang ilo-login
      await this.session.login(value.email, value.password);
      await this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (error) {
      this.errorMessage.set(
        apiErrorMessage(error, 'Could not create the account. Please try again.'),
      );
    } finally {
      this.submitting.set(false);
    }
  }
}