import { HttpErrorResponse } from '@angular/common/http';

// Ginagawang mensaheng mababasa ng user ang error mula sa API
export function apiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Cannot connect to the server. Make sure the backend is running.';
    }
    const detail = error.error?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
    // 422 mula sa FastAPI: listahan ng mga error sa isinumiteng datos
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') {
      return String(detail[0].msg).replace(/^Value error, /, '');
    }
  }
  return fallback;
}