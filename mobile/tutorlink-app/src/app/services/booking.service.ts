import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config';
import { Booking, BookingCreate } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private http = inject(HttpClient);

  getMyBookings(): Promise<Booking[]> {
    return firstValueFrom(this.http.get<Booking[]>(`${API_BASE_URL}/bookings/me`));
  }

  createBooking(data: BookingCreate): Promise<Booking> {
    return firstValueFrom(this.http.post<Booking>(`${API_BASE_URL}/bookings`, data));
  }

  async cancelBooking(id: number): Promise<void> {
    await firstValueFrom(
      this.http.post(`${API_BASE_URL}/bookings/${id}/cancel`, {}),
    );
  }
}