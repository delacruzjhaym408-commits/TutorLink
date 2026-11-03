import { ApplicationStatus, AvailabilitySlot } from './application.model';
import { Subject } from './tutor.model';

export interface AdminApplication {
  id: number;
  applicant_name: string;
  applicant_email: string;
  qualifications: string;
  bio: string | null;
  hourly_rate: number;
  subjects: Subject[];
  availability: AvailabilitySlot[];
  status: ApplicationStatus;
  admin_remarks: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface AdminStats {
  total_users: number;
  approved_tutors: number;
  pending_applications: number;
  total_bookings: number;
}