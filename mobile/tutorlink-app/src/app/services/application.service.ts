import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config';
import {
  TutorApplication,
  TutorApplicationCreate,
} from '../models/application.model';
import { AuthUser } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private http = inject(HttpClient);

  // Ang application ng kasalukuyang user (null kung wala pa)
  getMyApplication(): Promise<TutorApplication | null> {
    return firstValueFrom(
      this.http.get<TutorApplication | null>(`${API_BASE_URL}/tutor-applications/me`),
    );
  }

  submit(data: TutorApplicationCreate): Promise<TutorApplication> {
    return firstValueFrom(
      this.http.post<TutorApplication>(`${API_BASE_URL}/tutor-applications`, data),
    );
  }

  // Laging itinatanong sa server para makita agad ang pag-apruba ng admin
  async isApprovedTutor(): Promise<boolean> {
    try {
      const user = await firstValueFrom(
        this.http.get<AuthUser>(`${API_BASE_URL}/users/me`),
      );
      return user.is_approved_tutor;
    } catch {
      return false;
    }
  }
}