import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../core/auth';
import { extractErrorMessage } from '../../core/http-error';
import { Setup } from '../../core/setup';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  mode: 'login' | 'register' = 'login';
  /** True when this Corkboard instance has no Family yet — frames this page as step 1 of the first-run wizard. */
  isFirstRun = false;
  email = '';
  password = '';
  errorMessage: string | null = null;
  submitting = false;

  constructor(
    private readonly auth: Auth,
    private readonly setup: Setup,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.setup.status().subscribe({
      next: (status) => {
        if (!status.isConfigured) {
          this.isFirstRun = true;
          this.mode = 'register';
        }
        this.cdr.markForCheck();
      },
      // If the API is unreachable, fall back to an ordinary login screen rather
      // than crash — submit() will surface a clearer connection error anyway.
      error: () => {},
    });
  }

  toggleMode() {
    this.mode = this.mode === 'login' ? 'register' : 'login';
    this.errorMessage = null;
  }

  submit() {
    if (!this.email || !this.password) return;

    this.submitting = true;
    this.errorMessage = null;

    const request$ =
      this.mode === 'login'
        ? this.auth.login({ email: this.email, password: this.password })
        : this.auth.register({ email: this.email, password: this.password });

    request$.subscribe({
      next: (auth) => {
        this.submitting = false;
        this.router.navigateByUrl(auth.familyId ? '/board' : '/family-setup');
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = extractErrorMessage(err, 'Something went wrong. Please try again.');
        this.cdr.markForCheck();
      },
    });
  }
}
