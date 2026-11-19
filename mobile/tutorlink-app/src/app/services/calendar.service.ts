import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config'; // Change this if your config path is different.

export interface TutorAvailability {
  id?: number;
  tutor_id?: number;
  day_of_week: string | null;
  specific_date?: string | null; 
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

export interface SessionBooking {
  id?: number;
  tutor_id: number;
  student_id?: number;
  subject: string;
  session_date: string; // format: YYYY-MM-DD
  start_time: string;
  end_time: string;
  total_amount?: number;
  status?: string;
  payment_status?: string;
  payment_proof?: string | null; 
  payment_reference?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private http = inject(HttpClient);
  private apiUrl = `${API_BASE_URL}/calendar`;

private getHeaders() {
  const token = localStorage.getItem('access_token'); // 🔥 FIX:Must be access_token
  return new HttpHeaders({
    'Authorization': `Bearer ${token}`
  });
}

  // Tutor: Set availability
  setAvailability(data: TutorAvailability): Observable<TutorAvailability> {
    return this.http.post<TutorAvailability>(`${this.apiUrl}/availability`, data, { headers: this.getHeaders() });
  }

  // Student: View tutor availability
  getTutorAvailability(tutorId: number): Observable<TutorAvailability[]> {
    return this.http.get<TutorAvailability[]>(`${this.apiUrl}/availability/${tutorId}`, { headers: this.getHeaders() });
  }

  // Student: Book a 1v1 session
  bookSession(data: SessionBooking): Observable<SessionBooking> {
    return this.http.post<SessionBooking>(`${this.apiUrl}/book`, data, { headers: this.getHeaders() });
  }

  // Shared: View my sessions (Tutor or Student)
  getMySessions(): Observable<SessionBooking[]> {
    return this.http.get<SessionBooking[]>(`${this.apiUrl}/my-sessions`, { headers: this.getHeaders() });
  }

  // Shared: Update the session status
  updateSessionStatus(sessionId: number, status: string, paymentStatus?: string): Observable<SessionBooking> {
    const body: any = { status };
    if (paymentStatus) body.payment_status = paymentStatus;
    
    return this.http.patch<SessionBooking>(`${this.apiUrl}/session/${sessionId}/status`, body, { headers: this.getHeaders() });
  }

    // 🔥 Kunin ang mga booked dates
  getTutorBookedDates(tutorId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/booked-dates/${tutorId}`, { headers: this.getHeaders() });
  }

    // Shared: Get the sessions for the tutor
  getTutorSessions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tutor-sessions`, { headers: this.getHeaders() });
  }
}