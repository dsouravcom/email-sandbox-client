import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { API_BASE_URL } from '../http/api-base-url';
import { User } from '../auth/auth-models';

export interface ProfileDetails {
  company: string;
  jobTitle: string;
  bio: string;
}
export interface AccountPreferences {
  theme: 'system' | 'light' | 'dark';
  timestampTimezone: 'local' | 'UTC';
  timestampFormat: 'medium' | 'short';
  autoMarkRead: boolean;
}
export const DEFAULT_PREFERENCES: AccountPreferences = {
  theme: 'system',
  timestampTimezone: 'local',
  timestampFormat: 'medium',
  autoMarkRead: true,
};
export interface AccountSession {
  id: string;
  current: boolean;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

@Service()
export class AccountApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/users/me`;
  get() {
    return this.http.get<User>(this.url);
  }
  update(name: string, profileDetails: ProfileDetails) {
    return this.http.patch<User>(this.url, { name, profileDetails });
  }
  preferences(preferences: AccountPreferences) {
    return this.http.patch<User>(`${this.url}/preferences`, preferences);
  }
  password(currentPassword: string, newPassword: string) {
    return this.http.post<void>(`${this.url}/password`, { currentPassword, newPassword });
  }
  sessions() {
    return this.http.get<AccountSession[]>(`${this.url}/sessions`);
  }
  revoke(id: string) {
    return this.http.delete<void>(`${this.url}/sessions/${id}`);
  }
  revokeOthers() {
    return this.http.delete<void>(`${this.url}/sessions/others`);
  }
}
