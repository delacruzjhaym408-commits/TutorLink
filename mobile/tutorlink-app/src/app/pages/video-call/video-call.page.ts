import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton } from '@ionic/angular';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-video-call',
  templateUrl: './video-call.page.html',
  styleUrls: ['./video-call.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton]
})
export class VideoCallPage implements OnInit {
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);

  roomName = '';
  jitsiUrl = signal<SafeResourceUrl | null>(null);

  ngOnInit() {
    // 🔥 Kukunin natin ang roomName sa URL route (e.g. /video-call/TutorLink-Chat-12)
    this.roomName = this.route.snapshot.paramMap.get('roomName') || 'default-room';
    
    // Gumagamit tayo ng Jitsi Meet public server (libre at walang API key)
    const url = `https://meet.jit.si/${this.roomName}`;
    this.jitsiUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
  }
}