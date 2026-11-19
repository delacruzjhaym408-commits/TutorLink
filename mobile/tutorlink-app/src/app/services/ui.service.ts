import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiService {
  // We see the tab bar by default.
  showTabBar = signal(true);
}