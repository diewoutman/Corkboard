import { Component } from '@angular/core';
import { Auth } from './core/auth';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(readonly auth: Auth) {}

  logout() {
    this.auth.logout();
    window.location.href = '/login';
  }
}
