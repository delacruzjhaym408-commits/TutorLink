import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonInput,
  IonTextarea, IonText, IonBackButton, IonButtons, IonSpinner, IonIcon
} from '@ionic/angular';
import { Camera } from '@capacitor/camera';
import { addIcons } from 'ionicons';
import { cameraOutline, closeCircleOutline, close } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';

import { TutorPostService } from '../../services/tutor-post.service';
import { apiErrorMessage } from '../../utils/api-error';
import { API_BASE_URL } from '../../config';

@Component({
  selector: 'app-create-post',
  templateUrl: './create-post.page.html',
  styleUrls: ['./create-post.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonInput,
    IonTextarea, IonText, IonBackButton, IonButtons, IonSpinner, IonIcon, ReactiveFormsModule,
  ],
})
export class CreatePostPage implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private tutorPostService = inject(TutorPostService);
  private cdr = inject(ChangeDetectorRef);

  loading = signal(true);
  submitting = signal(false);
  uploadingImages = signal(false);
  errorMessage = signal('');
  
  uploadedImageUrls = signal<string[]>([]); 

  form = this.fb.nonNullable.group({
    subject: ['', [Validators.required, Validators.minLength(2)]],
    hourly_rate: [0, [Validators.required, Validators.min(1)]],
    session_rate: [0],
    education_level: ['', [Validators.required, Validators.minLength(2)]],
    gcash_number: [''], // 🔥 IDINAGDAG
    description: ['']
  });

  constructor() {
    addIcons({ cameraOutline, closeCircleOutline, close });
  }

  ngOnInit() {
    setTimeout(() => this.loading.set(false), 500);
  }

  showError(name: 'subject' | 'hourly_rate' | 'education_level'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  async pickAndUploadImages() {
    try {
      const images = await Camera.pickImages({
        quality: 80,
        limit: 5,
      });

      if (images.photos.length === 0) return;

      this.uploadingImages.set(true);
      const currentUrls = this.uploadedImageUrls();

      for (const img of images.photos) {
        if (img.webPath) {
          const response = await fetch(img.webPath);
          const blob = await response.blob();
          const file = new File([blob], `image_${Date.now()}.jpeg`, { type: 'image/jpeg' });

          const res = await firstValueFrom(this.tutorPostService.uploadPostImage(file));
          
          let fullUrl = res.url;
          if (fullUrl.startsWith('/uploads/')) {
            fullUrl = `${API_BASE_URL}${fullUrl}`;
          }
          
          currentUrls.push(fullUrl); 
        }
      }

      this.uploadedImageUrls.set(currentUrls);
      this.uploadingImages.set(false);
    } catch (e) {
      console.log('Camera cancelled or upload error', e);
      this.uploadingImages.set(false);
    }
  }

  removeImage(index: number) {
    const current = this.uploadedImageUrls();
    current.splice(index, 1);
    this.uploadedImageUrls.set([...current]);
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.uploadingImages()) {
      this.errorMessage.set('Please wait for the images to finish uploading.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');
    try {
      const value = this.form.getRawValue();
      
      const imagesJson = this.uploadedImageUrls().length > 0 
        ? JSON.stringify(this.uploadedImageUrls()) 
        : null;

      await new Promise<void>((resolve, reject) => {
        this.tutorPostService
          .createPost({
            subject: value.subject.trim(),
            hourly_rate: Number(value.hourly_rate),
            session_rate: value.session_rate ? Number(value.session_rate) : undefined,
            education_level: value.education_level.trim(),
            gcash_number: value.gcash_number?.trim() || null, // 🔥 IDINAGDAG
            description: value.description?.trim() || null,
            post_pictures: imagesJson,
            tutor_picture: null
          })
          .subscribe({
            next: () => resolve(),
            error: (err) => reject(err),
          });
      });
      this.router.navigateByUrl('/profile', { replaceUrl: true });
    } catch (error) {
      this.errorMessage.set(
        apiErrorMessage(error, 'Could not create the post. Please try again.'),
      );
    } finally {
      this.submitting.set(false);
    }
  }
}