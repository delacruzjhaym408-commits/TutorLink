import { Subject } from './tutor.model';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface AvailabilitySlot {
  day_of_week: string;
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
}

export interface TutorApplication {
  id: number;
  status: ApplicationStatus;
  qualifications: string;
  bio: string | null;
  hourly_rate: number;
  subjects: Subject[];
  availability: AvailabilitySlot[];
  admin_remarks: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface TutorApplicationCreate {
  qualifications: string;
  bio: string | null;
  hourly_rate: number;
  subject_ids: number[];
  availability: AvailabilitySlot[];
}

export const APPLICATION_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Pending review',
  approved:'Approved',
  rejected: 'Rejected',
};

export const APPLICATION_COLORS: Record<ApplicationStatus, string> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};