import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  const userJson = localStorage.getItem('user');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      // Check kung admin ang role
      if (user.role === 'admin') {
        return true;
      }
    } catch (e) {
      console.error('Error parsing user data', e);
    }
  }
  
  // Kung hindi admin, ibalik sa home
  console.warn('Access denied: Admin only');
  router.navigate(['/home']);
  return false;
};