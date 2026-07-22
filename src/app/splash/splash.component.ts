import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './splash.component.html',
  styleUrl: './splash.component.scss',
})
export class SplashComponent {
  password = '';
  readonly loading = signal(false);
  readonly error = signal('');

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {
    if (auth.authenticated()) void router.navigate(['/dashboard']);
  }

  signIn(): void {
    if (!this.password || this.loading()) return;
    this.run(this.auth.login(this.password));
  }

  tryDemo(): void {
    if (!this.loading()) this.run(this.auth.enterDemo());
  }

  private run(request: ReturnType<AuthService['enterDemo']>): void {
    this.error.set('');
    this.loading.set(true);
    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => void this.router.navigate(['/dashboard']),
      error: (error: HttpErrorResponse) =>
        this.error.set(
          error.error?.message ?? 'The archive could not be reached. Please try again.',
        ),
    });
  }
}
