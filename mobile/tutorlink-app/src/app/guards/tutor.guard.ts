import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ApplicationService } from '../services/application.service';

// Pinapapasok lang ang aprubadong tutor. Ang iba ay dadalhin sa application status.
export const tutorGuard: CanActivateFn = async () => {
  const applicationService = inject(ApplicationService);
  const router = inject(Router);

  if (await applicationService.isApprovedTutor()) {
    return true;
  }
  return router.createUrlTree(['/tutor-application']);
};