import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService, SessionUser } from './auth.service';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  const editor: SessionUser = { name: 'Keeper', role: 'editor', canEdit: true };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('does not revalidate a session immediately after successful login', () => {
    auth.login('secret').subscribe();
    http.expectOne('/api/auth/login').flush({ token: 'signed-token', user: editor });

    let valid = false;
    auth.validateSession().subscribe((result) => (valid = result));

    expect(valid).toBe(true);
    http.expectNone('/api/auth/me');
  });

  it('warms the API at most once without requiring database health', () => {
    auth.warmApi();
    auth.warmApi();
    expect(auth.apiWaking()).toBe(true);
    http.expectOne('/api/ready').flush(null, { status: 204, statusText: 'No Content' });
    expect(auth.apiReady()).toBe(true);
    expect(auth.apiWaking()).toBe(false);
    http.expectNone('/api/ready');
  });
});
