import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = API_BASE_URL;

  private getHeaders() {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // Users
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/users`, { headers: this.getHeaders() });
  }

  disableUser(userId: number, reason: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/users/${userId}/disable`, { reason }, { headers: this.getHeaders() });
  }

  enableUser(userId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/users/${userId}/enable`, {}, { headers: this.getHeaders() });
  }

  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/users/${userId}`, { headers: this.getHeaders() });
  }

  // Posts
  getPosts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/posts`, { headers: this.getHeaders() });
  }

  deletePost(postId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/posts/${postId}`, { headers: this.getHeaders() });
  }

    // Posts Disable/Enable
  disablePost(postId: number, reason: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/posts/${postId}/disable`, { reason }, { headers: this.getHeaders() });
  }

  enablePost(postId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/posts/${postId}/enable`, {}, { headers: this.getHeaders() });
  }

  // Lessons Disable/Enable
  getLessons(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/lessons/all`, { headers: this.getHeaders() });
  }

  disableLesson(lessonId: number, reason: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/lessons/${lessonId}/disable`, { reason }, { headers: this.getHeaders() });
  }

  enableLesson(lessonId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/lessons/${lessonId}/enable`, {}, { headers: this.getHeaders() });
  }

  // Reports
  getReports(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reports`, { headers: this.getHeaders() });
  }

  resolveReport(reportId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/reports/${reportId}/resolve`, {}, { headers: this.getHeaders() });
  }

  sendAdminMessage(userId: number, message: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin-messages`, { user_id: userId, message }, { headers: this.getHeaders() });
  }

  submitAppeal(email: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin-messages/appeal`, { email, reason });
  }

  triggerAutoDisable(): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/trigger-automatic-disable`, {}, { headers: this.getHeaders() });
  }

  getAppeals(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin-messages/appeals`, { headers: this.getHeaders() });
  }
}