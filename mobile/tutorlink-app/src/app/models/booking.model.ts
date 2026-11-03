export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export interface Booking {
  id: number;
  tutor_profile_id: number;
  tutor_name: string;
  subject_id: number;
  subject_name: string;
  session_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  notes: string | null;
  status: BookingStatus;
  created_at: string;
}

export interface BookingCreate {
  tutor_profile_id: number;
  subject_id: number;
  session_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  cancelled: 'medium',
  completed: 'primary',
};

// Ginagawang "Lunes, Nobyembre 2, 2026" ang "2026-11-02"
export function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}