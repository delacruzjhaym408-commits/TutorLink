import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonInput,
  IonTextarea, IonText, IonBackButton, IonButtons, IonSpinner, IonIcon
} from '@ionic/angular';
import { Camera } from '@capacitor/camera';
import { addIcons } from 'ionicons';
import { cameraOutline, closeCircleOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';

import { TutorPost, TutorPostService } from '../../services/tutor-post.service';
import { apiErrorMessage } from '../../utils/api-error';
import { API_BASE_URL } from '../../config';

@Component({
  selector: 'app-edit-post',
  templateUrl: './edit-post.page.html',
  styleUrls: ['./edit-post.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonInput,
    IonTextarea, IonText, IonBackButton, IonButtons, IonSpinner, IonIcon, ReactiveFormsModule,
  ],
})
export class EditPostPage implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private tutorPostService = inject(TutorPostService);
  private cdr = inject(ChangeDetectorRef);

  postId = 0;
  loading = signal(true);
  submitting = signal(false);
  uploadingImages = signal(false);
  errorMessage = signal('');
  
  // Dito natin ise-save ang mga permanenteng URL mula sa server
  uploadedImageUrls = signal<string[]>([]); 

  form = this.fb.nonNullable.group({
    subject: ['', [Validators.required, Validators.minLength(2)]],
    hourly_rate: [0, [Validators.required, Validators.min(1)]],
    session_rate: [0], // <-- IDINAGDAG
    education_level: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });

  constructor() {
    addIcons({ cameraOutline, closeCircleOutline });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.postId = Number(id);
      this.loadPost();
    } else {
      this.errorMessage.set('Post ID not found');
      this.loading.set(false);
    }
  }

  private loadPost() {
    this.tutorPostService.getPostById(this.postId).subscribe({
      next: (post) => {
        this.form.patchValue({
          subject: post.subject,
          hourly_rate: Number(post.hourly_rate),
          session_rate: post.session_rate ? Number(post.session_rate) : 0, // <-- IDINAGDAG
          education_level: post.education_level,
          description: post.description || '',
        });
        
        // I-load ang mga existing images
        if (post.post_pictures) {
          try {
            this.uploadedImageUrls.set(JSON.parse(post.post_pictures));
          } catch (e) {}
        }

        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading post:', err);
        this.errorMessage.set('Could not load the post.');
        this.loading.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  showError(name: 'subject' | 'hourly_rate' | 'education_level'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  // IDINAGDAG: Para pumili at mag-upload ng bagong pictures
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
          currentUrls.push(res.url);
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
          .updatePost(this.postId, {
            subject: value.subject.trim(),
            hourly_rate: Number(value.hourly_rate),
            session_rate: value.session_rate ? Number(value.session_rate) : undefined, // <-- IDINAGDAG
            education_level: value.education_level.trim(),
            description: value.description?.trim() || null,
            post_pictures: imagesJson, // <-- IDINAGDAG
          })
          .subscribe({
            next: () => resolve(),
            error: (err) => reject(err),
          });
      });
      this.router.navigateByUrl('/profile', { replaceUrl: true });
    } catch (error) {
      this.errorMessage.set(
        apiErrorMessage(error, 'Could not update the post. Please try again.'),
      );
    } finally {
      this.submitting.set(false);
    }
  }
}