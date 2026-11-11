import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config';

export interface TutorPost {
  id: number;
  user_id: number;
  tutor_name?: string;
  tutor_picture: string | null;
  tutor_description: string | null;
  tutor_description_picture: string | null;
  tutor_gcash?: string | null;
  gcash_number?: string | null;
  subject: string;
  hourly_rate: number;
  session_rate?: number;
  education_level: string;
  description: string | null;
  post_pictures?: string | null;
  rating: number;
  status: string;
  created_at: string;
  updated_at: string;
  learners_count?: number;
  total_reviews?: number;
}

export interface TutorPostCreate {
  subject: string;
  hourly_rate: number;
  session_rate?: number;
  education_level: string;
  description?: string | null;
  tutor_picture?: string | null;
  post_pictures?: string | null;
  gcash_number?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class TutorPostService {
  private apiUrl = `${API_BASE_URL}/tutor-posts`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getAllPosts(search?: string): Observable<TutorPost[]> {
    let url = this.apiUrl;
    if (search && search.trim()) {
      url += `?search=${encodeURIComponent(search.trim())}`;
    }
    return this.http.get<TutorPost[]>(url);
  }

  getMyPosts(): Observable<TutorPost[]> {
    return this.http.get<TutorPost[]>(`${this.apiUrl}/me`, {
      headers: this.getAuthHeaders(),
    });
  }

  getPostById(id: number): Observable<TutorPost> {
    return this.http.get<TutorPost>(`${this.apiUrl}/${id}`);
  }

  createPost(data: TutorPostCreate): Observable<TutorPost> {
    return this.http.post<TutorPost>(this.apiUrl, data, {
      headers: this.getAuthHeaders(),
    });
  }

  updatePost(id: number, data: Partial<TutorPostCreate>): Observable<TutorPost> {
    return this.http.put<TutorPost>(`${this.apiUrl}/${id}`, data, {
      headers: this.getAuthHeaders(),
    });
  }

  deletePost(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  uploadPostImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${API_BASE_URL}/uploads`, formData, {
      headers: this.getAuthHeaders(),
    });
  }

  getTutorGallery(userId: number): Observable<{ images: string[] }> {
    return this.http.get<{ images: string[] }>(`${this.apiUrl}/user/${userId}/gallery`);
  }

  getTutorRatingStats(tutorId: number): Observable<{ average: number, total_reviews: number }> {
    return this.http.get<{ average: number, total_reviews: number }>(`${API_BASE_URL}/reviews/tutor/${tutorId}/stats`);
  }

  getMyReviews(): Observable<any[]> {
    return this.http.get<any[]>(`${API_BASE_URL}/reviews/my-reviews`, { headers: this.getAuthHeaders() });
  }
}