import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, inject } from '@angular/core';

/**
 * An <img> whose source is only reachable through the app's own authenticated API
 * (a recipe photo, say) — a plain `src` wouldn't carry the auth interceptor's Bearer
 * token, so this fetches it via HttpClient as a blob first and points the <img> at an
 * object URL instead. Revokes that URL on every src change and on destroy.
 */
@Component({
  selector: 'app-auth-image',
  standalone: true,
  imports: [CommonModule],
  template: `<img *ngIf="objectUrl" [src]="objectUrl" [class]="imgClass" [alt]="alt" />`,
})
export class AuthImageComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) src!: string;
  @Input() imgClass = '';
  @Input() alt = '';

  objectUrl: string | null = null;

  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private requestedSrc: string | null = null;

  ngOnChanges() {
    if (this.src === this.requestedSrc) return;
    this.requestedSrc = this.src;
    this.revoke();

    this.http.get(this.src, { responseType: 'blob' }).subscribe((blob) => {
      if (this.requestedSrc !== this.src) return; // src changed again before this one landed
      this.objectUrl = URL.createObjectURL(blob);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    this.revoke();
  }

  private revoke() {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
