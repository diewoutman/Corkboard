import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../core/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  mode: 'login' | 'register' = 'login';
  email = '';
  password = '';
  errorMessage: string | null = null;
  submitting = false;

  constructor(
    private readonly auth: Auth,
    private readonly router: Router,
  ) {}

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
        this.errorMessage =
          err?.error?.title ?? err?.error?.detail ?? 'Something went wrong. Please try again.';
      },
    });
  }
}
