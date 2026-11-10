import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config';

export interface Lesson {
  id: number;
  tutor_id: number;
  gc_name: string;
  description: string | null;
  photo: string | null;
  gcash_number: string | null; // <-- IDINAGDAG
  monthly_rate: number | null; // <-- IDINAGDAG
  next_meeting_date: string | null;
  next_meeting_time: string | null;
  created_at: string;
}

export interface Enrollment {
  id: number;
  student_id: number;
  lesson_id: number;
  status: string;
  payment_status: string;
  payment_proof: string | null;
  payment_reference: string | null;
  rejection_reason: string | null; // <-- IDINAGDAG
  enrolled_at: string;
  last_read_at: string | null;
  unread_count: number;
  lesson: Lesson;
}

export interface LessonMessage {
  id: number;
  lesson_id: number;
  sender_id: number;
  sender_name: string;
  sender_picture: string | null;
  content: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class LessonService {
  private apiUrl = `${API_BASE_URL}`;
  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  createLesson(data: any): Observable<Lesson> {
    return this.http.post<Lesson>(`${this.apiUrl}/lessons`, data, { headers: this.getAuthHeaders() });
  }

  getTutorLessons(tutorId: number): Observable<Lesson[]> {
    return this.http.get<Lesson[]>(`${this.apiUrl}/tutors/${tutorId}/lessons`, { headers: this.getAuthHeaders() });
  }

  getMyEnrollments(): Observable<Enrollment[]> {
    return this.http.get<Enrollment[]>(`${this.apiUrl}/enrollments/my`, { headers: this.getAuthHeaders() });
  }

  applyWithPayment(data: any): Observable<Enrollment> {
    return this.http.post<Enrollment>(`${this.apiUrl}/enrollments/apply-payment`, data, { headers: this.getAuthHeaders() });
  }

  approvePayment(lessonId: number, studentId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/enrollments/${lessonId}/approve/${studentId}`, {}, { headers: this.getAuthHeaders() });
  }

  rejectPayment(lessonId: number, studentId: number, reason: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/enrollments/${lessonId}/reject/${studentId}`, { reason }, { headers: this.getAuthHeaders() });
  }

  getMessages(lessonId: number): Observable<LessonMessage[]> {
    return this.http.get<LessonMessage[]>(`${this.apiUrl}/lessons/${lessonId}/messages`, { headers: this.getAuthHeaders() });
  }

  sendMessage(lessonId: number, content: string): Observable<LessonMessage> {
    return this.http.post<LessonMessage>(`${this.apiUrl}/lessons/${lessonId}/messages`, { content }, { headers: this.getAuthHeaders() });
  }

  updateLesson(lessonId: number, data: any): Observable<Lesson> {
    return this.http.put<Lesson>(`${this.apiUrl}/lessons/${lessonId}`, data, { headers: this.getAuthHeaders() });
  }

  leaveLesson(lessonId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/enrollments/${lessonId}`, { headers: this.getAuthHeaders() });
  }

  markAsRead(lessonId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/enrollments/${lessonId}/read`, {}, { headers: this.getAuthHeaders() });
  }

  getLessonMembers(lessonId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/lessons/${lessonId}/members`, { headers: this.getAuthHeaders() });
  }

  kickMember(lessonId: number, studentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/lessons/${lessonId}/kick/${studentId}`, { headers: this.getAuthHeaders() });
  }

  getTutorStudents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/lessons/tutor/students`, { headers: this.getAuthHeaders() });
  }
}