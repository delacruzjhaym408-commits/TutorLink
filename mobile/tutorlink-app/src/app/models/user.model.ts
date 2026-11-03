export type UserRole = 'student' | 'parent' | 'admin';

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_approved_tutor: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  role: 'student' | 'parent';
}