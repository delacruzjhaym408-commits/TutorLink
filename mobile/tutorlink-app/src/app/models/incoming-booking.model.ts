import { BookingStatus } from './booking.model';

// Booking request na natanggap ng tutor mula sa isang estudyante o magulang
export interface IncomingBooking {
  id: number;
  student_name: string;
  subject_name: string;
  session_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  notes: string | null;
  status: BookingStatus;
  created_at: string;
}