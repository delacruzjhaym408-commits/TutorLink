import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config';
import { TutorApplicationCreate } from '../models/application.model';
import { Subject, TutorDetail, TutorSummary } from '../models/tutor.model';

export interface TutorFilters {
  subjectId: number; // 0 = all subjects
  maxRate: number | null; // null = no limit
  day: string; // 'all' = any day
}

@Injectable({ providedIn: 'root' })
export class TutorService {
  private http = inject(HttpClient);

  getSubjects(): Promise<Subject[]> {
    return firstValueFrom(this.http.get<Subject[]>(`${API_BASE_URL}/subjects`));
  }

  getTutors(filters: TutorFilters): Promise<TutorSummary[]> {
    // Only the filters that have a value are sent to the API
    const params: Record<string, string | number> = {};
    if (filters.subjectId !== 0) {
      params['subject_id'] = filters.subjectId;
    }
    if (filters.maxRate !== null) {
      params['max_rate'] = filters.maxRate;
    }
    if (filters.day !== 'all') {
      params['day'] = filters.day;
    }
    return firstValueFrom(
      this.http.get<TutorSummary[]>(`${API_BASE_URL}/tutors`, { params }),
    );
  }

  async getTutor(id: number): Promise<TutorDetail | undefined> {
    try {
      return await firstValueFrom(
        this.http.get<TutorDetail>(`${API_BASE_URL}/tutors/${id}`),
      );
    } catch (error) {
      // 404 = tutor not found or not approved yet
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  // The logged-in tutor's own profile
  getMyProfile(): Promise<TutorDetail> {
    return firstValueFrom(
      this.http.get<TutorDetail>(`${API_BASE_URL}/tutor-profile/me`),
    );
  }

  updateMyProfile(data: TutorApplicationCreate): Promise<TutorDetail> {
    return firstValueFrom(
      this.http.put<TutorDetail>(`${API_BASE_URL}/tutor-profile/me`, data),
    );
  }
}