import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, chatbubbleOutline, personOutline, settingsOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet],
})
export class TabsPage {
  constructor() {
    addIcons({ homeOutline, chatbubbleOutline, personOutline, settingsOutline });
  }
}