import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthUser, RegisterData, TokenResponse } from '../models/user.model';

const TOKEN_KEY = 'access_token';
const API_BASE_URL = 'https://tutorlink-api-9lcu.onrender.com'; 

@Injectable({ providedIn: 'root' })
export class SessionService {
  private http = inject(HttpClient);
  
  public currentUser = signal<AuthUser | null>(null);
  public user = this.currentUser.asReadonly();

  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private saveToken(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      const user = this.currentUser();
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
    } catch {}
  }

  private removeToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('user');
    } catch {}
  }

  // 🔥 MAS MATIBAY NA CHECK PARA SA "STAY LOGGED IN"
  isLoggedIn(): boolean {
    return this.currentUser() !== null || this.getToken() !== null;
  }

  async login(email: string, password: string): Promise<void> {
    const body = new HttpParams()
      .set('username', email.trim())
      .set('password', password);
      
    const response = await firstValueFrom(
      this.http.post<TokenResponse>(`${API_BASE_URL}/auth/login`, body),
    );
    this.currentUser.set(response.user);
    this.saveToken(response.access_token);
  }

  async register(data: RegisterData): Promise<void> {
    await firstValueFrom(
      this.http.post<AuthUser>(`${API_BASE_URL}/auth/register`, data),
    );
  }

  logout() {
    this.removeToken();
    this.currentUser.set(null);
  }

  async restore(): Promise<void> {
    // Kung may current user na sa memory, o walang token, wag nang mag-restore
    if (this.currentUser() !== null || this.getToken() === null) {
      return;
    }
    try {
      const user = await firstValueFrom(
        this.http.get<AuthUser>(`${API_BASE_URL}/users/me`),
      );
      this.currentUser.set(user);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      // 🔥 KUNG EXPIRED O INVALID ANG TOKEN, I-LOGOUT
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        this.removeToken();
        this.currentUser.set(null);
      }
    }
  }

  // 🔥 BAGONG METHOD PARA SA AUTO-REFRESH NG ROLE
  async refreshUser(): Promise<void> {
    try {
      const user = await firstValueFrom(
        this.http.get<AuthUser>(`${API_BASE_URL}/users/me`)
      );
      this.currentUser.set(user);
      localStorage.setItem('user', JSON.stringify(user));
      console.log('🔥 User refreshed:', user.role);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }
}