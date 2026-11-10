import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage) },
  { path: 'home', canActivate: [authGuard], loadComponent: () => import('./home/home.page').then((m) => m.HomePage) },
  { path: 'create-post', canActivate: [authGuard], loadComponent: () => import('./pages/create-post/create-post.page').then((m) => m.CreatePostPage) },
  { path: 'tutor-details/:id', canActivate: [authGuard], loadComponent: () => import('./pages/tutor-details/tutor-details.page').then((m) => m.TutorDetailsPage) },
  { path: 'edit-post/:id', canActivate: [authGuard], loadComponent: () => import('./pages/edit-post/edit-post.page').then((m) => m.EditPostPage) },
  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage) },
  { path: 'messages', canActivate: [authGuard], loadComponent: () => import('./pages/messages/messages.page').then((m) => m.MessagesPage) },
  { path: 'chat/:id', canActivate: [authGuard], loadComponent: () => import('./pages/chat/chat.page').then((m) => m.ChatPage) },
  { path: 'my-lesson', canActivate: [authGuard], loadComponent: () => import('./pages/my-lesson/my-lesson.page').then((m) => m.MyLessonPage) },
  { path: 'settings', canActivate: [authGuard], loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage) },
  { path: 'lesson-chat/:id', canActivate: [authGuard], loadComponent: () => import('./pages/lesson-chat/lesson-chat.page').then((m) => m.LessonChatPage) },

  // IDINAGDAG: RUTA PARA SA MY REVIEWS
  { path: 'my-reviews', canActivate: [authGuard], loadComponent: () => import('./pages/my-reviews/my-reviews.page').then((m) => m.MyReviewsPage) },

  // ============ ADMIN ROUTES ============
  { path: 'admin/dashboard', canActivate: [authGuard, adminGuard], loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.page').then((m) => m.AdminDashboardPage) },
  { path: 'admin/users', canActivate: [authGuard, adminGuard], loadComponent: () => import('./pages/admin-users/admin-users.page').then((m) => m.AdminUsersPage) },
  { path: 'admin/posts', canActivate: [authGuard, adminGuard], loadComponent: () => import('./pages/admin-posts/admin-posts.page').then((m) => m.AdminPostsPage) },
  { path: 'admin/reports', canActivate: [authGuard, adminGuard], loadComponent: () => import('./pages/admin-reports/admin-reports.page').then((m) => m.AdminReportsPage) },
  { path: 'admin-chat', canActivate: [authGuard], loadComponent: () => import('./pages/admin-chat/admin-chat.page').then((m) => m.AdminChatPage) },
  {
    path: 'video-call/:roomName',
    loadComponent: () => import('./pages/video-call/video-call.page').then( m => m.VideoCallPage)
  },
];