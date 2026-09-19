import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../core/auth';
import { Families } from '../../core/families';
import { extractErrorMessage } from '../../core/http-error';

@Component({
  selector: 'app-family-setup',
  templateUrl: './family-setup.page.html',
  styleUrls: ['./family-setup.page.scss'],
  standalone: false,
})
export class FamilySetupPage {
  name = '';
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  ownerDisplayName = '';
  ownerColor = '#4c6ef5';
  errorMessage: string | null = null;
  submitting = false;

  constructor(
    private readonly families: Families,
    private readonly auth: Auth,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  submit() {
    if (!this.name || !this.timeZone || !this.ownerDisplayName || !this.ownerColor) return;

    this.submitting = true;
    this.errorMessage = null;

    this.families
      .create({
        name: this.name,
        timeZone: this.timeZone,
        ownerDisplayName: this.ownerDisplayName,
        ownerColor: this.ownerColor,
      })
      .subscribe({
        next: (result) => {
          this.submitting = false;
          this.auth.applyAuth(result.authResponse);
          this.router.navigateByUrl('/add-members');
        },
        error: (err) => {
          this.submitting = false;
          this.errorMessage = extractErrorMessage(err, 'Something went wrong. Please try again.');
          this.cdr.markForCheck();
        },
      });
  }
}
