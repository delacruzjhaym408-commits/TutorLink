import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionService } from '../services/session.service';

// Admin lang ang pinapapasok. Ang ordinaryong user ay dadalhin sa Home, ang hindi naka-login sa Login.
// Paalala: pampaganda lang ito ng UI. Ang backend ang tunay na humaharang sa mga hindi admin.
export const adminGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);

  await session.restore();
  if (session.isAdmin()) {
    return true;
  }
  return router.createUrlTree([session.isLoggedIn() ? '/home' : '/login']);
};