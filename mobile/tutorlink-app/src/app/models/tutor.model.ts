export interface Subject {
  id: number;
  name: string;
  description?: string | null;
}

export interface Availability {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export interface TutorSummary {
  id: number;
  full_name: string;
  hourly_rate: number;
  subjects: Subject[];
}

export interface TutorDetail extends TutorSummary {
  qualifications: string;
  bio?: string | null;
  availability: Availability[];
}

// Pangalan ng mga araw sa Filipino
export const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

// Ginagawang "4:00 PM" ang "16:00:00"
export function formatTime(value: string): string {
  const [hours, minutes] = value.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}