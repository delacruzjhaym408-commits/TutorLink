import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  // Trigger para i-refresh ang badges sa AppComponent
  private refreshBadgesSource = new BehaviorSubject<void>(undefined);
  refreshBadges$ = this.refreshBadgesSource.asObservable();

  // Function na tatawagin natin para i-refresh ang badges
  triggerRefreshBadges() {
    this.refreshBadgesSource.next();
  }
}