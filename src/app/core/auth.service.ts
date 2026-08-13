import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';

export type UserRole = 'editor' | 'demo';
export interface SessionUser {
  name: string;
  role: UserRole;
  canEdit: boolean;
}
interface AuthResponse {
  token: string;
  user: SessionUser;
}
interface SessionResponse {
  user: SessionUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'ttca_session';
  private readonly userKey = 'ttca_user';
  private readonly currentUser = signal<SessionUser | null>(this.restoreUser());
  private sessionValidated = false;
  private apiWarmRequested = false;
  readonly user = this.currentUser.asReadonly();
  readonly authenticated = computed(() => !!this.currentUser() && !!this.token);

  constructor(private readonly http: HttpClient) {}

  get token(): string | null {
    return sessionStorage.getItem(this.tokenKey);
  }

  login(password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/login', { password })
      .pipe(tap((response) => this.save(response, true)));
  }

  enterDemo(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/demo', {})
      .pipe(tap((response) => this.save(response, true)));
  }

  warmApi(): void {
    if (this.apiWarmRequested) return;
    this.apiWarmRequested = true;
    this.http
      .get('/api/health')
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  validateSession(): Observable<boolean> {
    if (!this.token) {
      this.logout();
      return of(false);
    }

    if (this.sessionValidated && this.currentUser()) return of(true);

    return this.http.get<SessionResponse>('/api/auth/me').pipe(
      tap(({ user }) => {
        this.saveUser(user);
        this.sessionValidated = true;
      }),
      map(() => true),
      catchError(() => {
        this.logout();
        return of(false);
      }),
    );
  }

  logout(): void {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
    this.currentUser.set(null);
    this.sessionValidated = false;
  }

  private save(response: AuthResponse, validated: boolean): void {
    sessionStorage.setItem(this.tokenKey, response.token);
    this.saveUser(response.user);
    this.sessionValidated = validated;
  }

  private saveUser(user: SessionUser): void {
    sessionStorage.setItem(this.userKey, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private restoreUser(): SessionUser | null {
    try {
      return JSON.parse(sessionStorage.getItem(this.userKey) ?? 'null');
    } catch {
      return null;
    }
  }
}
