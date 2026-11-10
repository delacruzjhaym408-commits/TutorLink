import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiService {
  // Default nating nakikita ang tab bar
  showTabBar = signal(true);
}