import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config';
import { AdminApplication, AdminStats } from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  getApplications(): Promise<AdminApplication[]> {
    return firstValueFrom(
      this.http.get<AdminApplication[]>(`${API_BASE_URL}/admin/applications`),
    );
  }

  getStats(): Promise<AdminStats> {
    return firstValueFrom(this.http.get<AdminStats>(`${API_BASE_URL}/admin/stats`));
  }

  async approve(id: number): Promise<void> {
    await firstValueFrom(
      this.http.post(`${API_BASE_URL}/admin/applications/${id}/approve`, {}),
    );
  }

  async reject(id: number, remarks: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${API_BASE_URL}/admin/applications/${id}/reject`, { remarks }),
    );
  }
}