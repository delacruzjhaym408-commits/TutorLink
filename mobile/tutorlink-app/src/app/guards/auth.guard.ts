import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionService } from '../services/session.service';

// Naka-login lang ang pinapapasok. Ang iba ay dadalhin sa Login.
export const authGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);

  await session.restore();
  return session.isLoggedIn() ? true : router.createUrlTree(['/login']);
};