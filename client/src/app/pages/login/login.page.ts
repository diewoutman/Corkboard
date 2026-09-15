import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
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
  /**
   * True when this Corkboard instance has no Family yet — frames this page as
   * step 1 of the first-run wizard, and is the ONLY time registration is
   * possible. Once a Family exists, self-registration is closed server-side
   * (AuthController.Register) — further accounts are created by the family's
   * Owner from the Family page instead, so there's no mode to toggle to here.
   */
  isFirstRun = false;
  email = '';
  password = '';
  errorMessage: string | null = null;
  submitting = false;

  /** Gates the dev-only "Seed test data & log in" button — mirrors the server's own Development-only gate on the endpoint it calls. */
  readonly isProduction = environment.production;

  constructor(
    private readonly auth: Auth,
    private readonly setup: Setup,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.setup.status().subscribe({
      next: (status) => {
        this.isFirstRun = !status.isConfigured;
        this.cdr.markForCheck();
      },
      // If the API is unreachable, fall back to an ordinary login screen rather
      // than crash — submit() will surface a clearer connection error anyway.
      error: () => {},
    });
  }

  submit() {
    if (!this.email || !this.password) return;

    this.submitting = true;
    this.errorMessage = null;

    const request$ = this.isFirstRun
      ? this.auth.register({ email: this.email, password: this.password })
      : this.auth.login({ email: this.email, password: this.password });

    request$.subscribe({
      next: (auth) => {
        this.submitting = false;
        this.router.navigateByUrl(auth.familyId ? '/home' : '/family-setup');
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = extractErrorMessage(err, 'Something went wrong. Please try again.');
        this.cdr.markForCheck();
      },
    });
  }

  /** Dev-only convenience — see Setup.seedDevData(). */
  seedAndLogIn() {
    this.submitting = true;
    this.errorMessage = null;

    this.setup.seedDevData().subscribe({
      next: (auth) => {
        this.auth.applyAuth(auth);
        this.submitting = false;
        this.router.navigateByUrl(auth.familyId ? '/home' : '/family-setup');
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = extractErrorMessage(err, 'Could not seed dev data.');
        this.cdr.markForCheck();
      },
    });
  }
}
