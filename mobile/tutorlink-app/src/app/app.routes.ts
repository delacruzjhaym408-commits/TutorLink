import { Routes } from '@angular/router';

import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';
import { tutorGuard } from './guards/tutor.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'tutors',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/tutors/tutors.page').then((m) => m.TutorsPage),
  },
  {
    path: 'tutors/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/tutor-profile/tutor-profile.page').then(
        (m) => m.TutorProfilePage,
      ),
  },
  {
    path: 'book/:tutorId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/booking-request/booking-request.page').then(
        (m) => m.BookingRequestPage,
      ),
  },
  {
    path: 'my-bookings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/my-bookings/my-bookings.page').then(
        (m) => m.MyBookingsPage,
      ),
  },
  {
    path: 'apply-tutor',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/apply-tutor/apply-tutor.page').then(
        (m) => m.ApplyTutorPage,
      ),
  },
  {
    path: 'tutor-application',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/tutor-application/tutor-application.page').then(
        (m) => m.TutorApplicationPage,
      ),
  },
  {
    path: 'tutor-dashboard',
    canActivate: [authGuard, tutorGuard],
    loadComponent: () =>
      import('./pages/tutor-dashboard/tutor-dashboard.page').then(
        (m) => m.TutorDashboardPage,
      ),
  },
  {
    path: 'tutor-requests',
    canActivate: [authGuard, tutorGuard],
    loadComponent: () =>
      import('./pages/tutor-requests/tutor-requests.page').then(
        (m) => m.TutorRequestsPage,
      ),
  },
    {
    path: 'edit-tutor-profile',
    canActivate: [authGuard, tutorGuard],
    data: { mode: 'edit' },
    loadComponent: () =>
      import('./pages/apply-tutor/apply-tutor.page').then(
        (m) => m.ApplyTutorPage,
      ),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-dashboard/admin-dashboard.page').then(
        (m) => m.AdminDashboardPage,
      ),
  },
  {
    path: 'admin/applications',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-applications/admin-applications.page').then(
        (m) => m.AdminApplicationsPage,
      ),
  },
];