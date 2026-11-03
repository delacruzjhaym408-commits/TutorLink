import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config';
import { IncomingBooking } from '../models/incoming-booking.model';

@Injectable({ providedIn: 'root' })
export class TutorBookingService {
  private http = inject(HttpClient);

  getIncoming(): Promise<IncomingBooking[]> {
    return firstValueFrom(
      this.http.get<IncomingBooking[]>(`${API_BASE_URL}/bookings/incoming`),
    );
  }

  async accept(id: number): Promise<void> {
    await firstValueFrom(this.http.post(`${API_BASE_URL}/bookings/${id}/accept`, {}));
  }

  async reject(id: number): Promise<void> {
    await firstValueFrom(this.http.post(`${API_BASE_URL}/bookings/${id}/reject`, {}));
  }

  async complete(id: number): Promise<void> {
    await firstValueFrom(this.http.post(`${API_BASE_URL}/bookings/${id}/complete`, {}));
  }
}