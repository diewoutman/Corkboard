import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

/** Requires a logged-in user; sends anonymous visitors to /login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  if (auth.isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/login']);
};

/** Requires a logged-in user who has set up (or joined) a Family; see FamiliesController. */
export const familyGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  if (!auth.hasFamily()) return router.createUrlTree(['/family-setup']);
  return true;
};
