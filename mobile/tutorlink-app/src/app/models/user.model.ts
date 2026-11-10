export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  phone_number: string | null;
  profile_picture: string | null;
  description: string | null;
  description_picture: string | null;
  gcash_number: string | null;
  role: 'student' | 'tutor' | 'admin';
  is_active: boolean;
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
  phone_number?: string | null;
}