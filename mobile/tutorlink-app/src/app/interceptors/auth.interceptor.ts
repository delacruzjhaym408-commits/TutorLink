import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_BASE_URL } from '../config';
import { SessionService } from '../services/session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const router = inject(Router);

  // Sa sarili nating API lang ipinapadala ang token, hindi sa ibang website
  if (!req.url.startsWith(API_BASE_URL)) {
    return next(req);
  }

  const token = session.getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      const isLoginCall = req.url.endsWith('/auth/login');
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        token &&
        !isLoginCall
      ) {
        // Hindi na valid o nag-expire na ang token
        session.logout();
        router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};