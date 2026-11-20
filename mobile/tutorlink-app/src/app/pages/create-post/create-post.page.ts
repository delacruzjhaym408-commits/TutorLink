import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonInput,
  IonTextarea, IonText, IonBackButton, IonButtons, IonSpinner, IonIcon,
  IonSelect, IonSelectOption
} from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
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
    IonSelect, IonSelectOption
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
  qrImage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    subject: ['', [Validators.required, Validators.minLength(2)]],
    hourly_rate: [0, [Validators.required, Validators.min(1)]],
    education_level: ['', [Validators.required, Validators.minLength(2)]],
    gcash_number: ['', [Validators.pattern(/^\d{0,11}$/)]],
    delivery_mode: ['online'],
    meeting_link: [''],   // 🔥 IDINAGDAG
    location: [''],       // 🔥 IDINAGDAG
    description: ['']
  });

  constructor() {
    addIcons({ cameraOutline, closeCircleOutline, close });
  }

  ngOnInit() {
    setTimeout(() => this.loading.set(false), 500);
  }

  showError(name: 'subject' | 'hourly_rate' | 'education_level' | 'gcash_number'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  onGcashInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^0-9]/g, '');
    value = value.substring(0, 11);
    input.value = value;
    this.form.controls.gcash_number.setValue(value);
  }

  async pickAndUploadImages() {
    try {
      const images = await Camera.pickImages({ quality: 80, limit: 5 });
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

  async pickQrImage() {
    try {
      const image = await Camera.getPhoto({ quality: 90, allowEditing: true, resultType: CameraResultType.DataUrl, source: CameraSource.Photos });
      if (image.dataUrl) this.qrImage.set(image.dataUrl);
    } catch (e) {}
  }

// Sa loob ng onSubmit() function:
  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // 🔥 BAGONG VALIDATION: Dapat may thumbnail
    if (this.uploadedImageUrls().length === 0) {
      this.errorMessage.set('Please upload at least one post picture (thumbnail).');
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
      // 🔥 I-ENSURE NA JSON ARRAY ANG IPAPASA
      const imagesJson = JSON.stringify(this.uploadedImageUrls()); 

      await new Promise<void>((resolve, reject) => {
        this.tutorPostService
          .createPost({
            subject: value.subject.trim(),
            hourly_rate: Number(value.hourly_rate),
            education_level: value.education_level.trim(),
            gcash_number: value.gcash_number?.trim() || null,
            delivery_mode: value.delivery_mode,
            meeting_link: value.meeting_link?.trim() || null,
            location: value.location?.trim() || null,
            description: value.description?.trim() || null,
            post_pictures: imagesJson,
            tutor_picture: null,
            gcash_qr_code: this.qrImage()
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