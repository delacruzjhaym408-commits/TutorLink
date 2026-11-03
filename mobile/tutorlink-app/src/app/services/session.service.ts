import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config';
import { AuthUser, RegisterData, TokenResponse } from '../models/user.model';

const TOKEN_KEY = 'tutorlink_token';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private http = inject(HttpClient);
  private currentUser = signal<AuthUser | null>(null);

  // Ang kasalukuyang naka-login na user (null kung wala)
  user = this.currentUser.asReadonly();

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
    } catch {
      // Hindi ma-save ang token; kailangang mag-login ulit sa susunod
    }
  }

  private removeToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Walang gagawin
    }
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  // Para lang sa pagpapakita ng UI. Ang backend ang tunay na nagsusuri ng role.
  isAdmin(): boolean {
    return this.currentUser()?.role === 'admin';
  }

  async login(email: string, password: string): Promise<void> {
    // Form data ang hinihingi ng backend (username at password)
    const body = new HttpParams().set('username', email.trim()).set('password', password);
    const response = await firstValueFrom(
      this.http.post<TokenResponse>(`${API_BASE_URL}/auth/login`, body),
    );
    this.saveToken(response.access_token);
    this.currentUser.set(response.user);
  }

  async register(data: RegisterData): Promise<void> {
    await firstValueFrom(this.http.post<AuthUser>(`${API_BASE_URL}/auth/register`, data));
  }

  logout() {
    this.removeToken();
    this.currentUser.set(null);
  }

  // Ibinabalik ang naka-login na user kung may natitirang token (halimbawa, pagkatapos mag-refresh)
  async restore(): Promise<void> {
    if (this.currentUser() !== null || this.getToken() === null) {
      return;
    }
    try {
      const user = await firstValueFrom(
        this.http.get<AuthUser>(`${API_BASE_URL}/users/me`),
      );
      this.currentUser.set(user);
    } catch (error) {
      // Kung hindi na valid ang token, burahin. Kung patay lang ang server, itago pa rin.
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.removeToken();
      }
    }
  }
}