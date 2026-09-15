import { Component, OnInit } from '@angular/core';
import { Auth } from './core/auth';
import { DueSummary } from './core/due-summary';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  dueTodayCount = 0;

  constructor(
    readonly auth: Auth,
    private readonly dueSummary: DueSummary,
  ) {}

  ngOnInit() {
    if (this.auth.hasFamily()) {
      this.dueSummary.dueTodayCount().subscribe((count) => (this.dueTodayCount = count));
    }
  }

  logout() {
    this.auth.logout();
    window.location.href = '/login';
  }
}
