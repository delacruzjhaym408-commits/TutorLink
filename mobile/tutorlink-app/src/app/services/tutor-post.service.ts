import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config';

// 🔥 INTERFACE PARA SA TUTOR POST
export interface TutorPost {
  id: number;
  user_id: number;
  tutor_name?: string;
  tutor_picture?: string | null;
  tutor_description?: string | null;
  tutor_description_picture?: string | null;
  subject: string;
  hourly_rate: number;
  session_rate?: number | null;
  education_level: string;
  description?: string | null;
  post_pictures?: string | null;
  gcash_number?: string | null;
  gcash_qr_code?: string | null;
  delivery_mode?: string;
  meeting_link?: string | null;
  location?: string | null;
  rating: number;
  status: string;
  disabled_reason?: string | null;
  created_at: string;
  updated_at: string;
  learners_count?: number;
  total_reviews?: number;
  is_online?: boolean;
  last_seen_at?: string | null;
}

// 🔥 INTERFACE PARA SA CREATE POST
export interface TutorPostCreate {
  subject: string;
  hourly_rate: number;
  session_rate?: number | null;
  education_level: string;
  description?: string | null;
  tutor_picture?: string | null;
  post_pictures?: string | null;
  gcash_number?: string | null;
  gcash_qr_code?: string | null;
  delivery_mode?: string;
  meeting_link?: string | null;
  location?: string | null;
}

// 🔥 INTERFACE PARA SA UPDATE POST
export interface TutorPostUpdate {
  subject?: string;
  hourly_rate?: number;
  session_rate?: number | null;
  education_level?: string;
  description?: string | null;
  tutor_picture?: string | null;
  post_pictures?: string | null;
  gcash_number?: string | null;
  gcash_qr_code?: string | null;
  delivery_mode?: string;
  meeting_link?: string | null;
  location?: string | null;
}

@Injectable({ providedIn: 'root' })
export class TutorPostService {
  private http = inject(HttpClient);

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getAllPosts(search?: string): Observable<TutorPost[]> {
    let url = `${API_BASE_URL}/tutor-posts`;
    if (search) {
      url += `?search=${encodeURIComponent(search)}`;
    }
    return this.http.get<TutorPost[]>(url);
  }

  getPostById(id: number): Observable<TutorPost> {
    return this.http.get<TutorPost>(`${API_BASE_URL}/tutor-posts/${id}`);
  }

  getMyPosts(): Observable<TutorPost[]> {
    return this.http.get<TutorPost[]>(`${API_BASE_URL}/tutor-posts/me`, {
      headers: this.getAuthHeaders()
    });
  }

  createPost(data: TutorPostCreate): Observable<TutorPost> {
    return this.http.post<TutorPost>(`${API_BASE_URL}/tutor-posts`, data, {
      headers: this.getAuthHeaders()
    });
  }

  updatePost(id: number, data: TutorPostUpdate): Observable<TutorPost> {
    return this.http.put<TutorPost>(`${API_BASE_URL}/tutor-posts/${id}`, data, {
      headers: this.getAuthHeaders()
    });
  }

  deletePost(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/tutor-posts/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // 🔥 INAYOS: Dapat `/uploads` lang, walang `/post-image`
  uploadPostImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(
      `${API_BASE_URL}/uploads`, 
      formData,
      { headers: this.getAuthHeaders() }
    );
  }

  getTutorGallery(userId: number): Observable<{ images: string[] }> {
    return this.http.get<{ images: string[] }>(
      `${API_BASE_URL}/tutor-posts/user/${userId}/gallery`
    );
  }

  getTutorRatingStats(userId: number): Observable<{ average: number; total_reviews: number }> {
    return this.http.get<{ average: number; total_reviews: number }>(
      `${API_BASE_URL}/reviews/tutor/${userId}/stats`
    );
  }

  canReviewTutor(tutorId: number): Observable<{ allowed: boolean; reason: string; source: string | null }> {
    return this.http.get<{ allowed: boolean; reason: string; source: string | null }>(
      `${API_BASE_URL}/reviews/can-review/${tutorId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  getMyReviews(): Observable<any[]> {
    return this.http.get<any[]>(`${API_BASE_URL}/reviews/my-reviews`, {
      headers: this.getAuthHeaders()
    });
  }
}