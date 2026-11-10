import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private ws: WebSocket | null = null;
  private messageSubject = new Subject<any>();
  
  public messages$ = this.messageSubject.asObservable();
  public isConnected = signal(false);
  private reconnectInterval: any;

  connect() {
    const token = localStorage.getItem('access_token'); 
    const userJson = localStorage.getItem('user');
    
    if (!token || !userJson) return;

    // Kung nakabukas na, wag nang mag-connect ulit
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    // I-clear muna ang lumang connection kung meron
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(`ws://localhost:8000:8000/ws?token=${token}`);

    this.ws.onopen = () => {
      console.log('🟢 WebSocket Connected');
      this.isConnected.set(true);
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
      }
    };

    this.ws.onclose = () => {
      console.log('🔴 WebSocket Disconnected');
      this.isConnected.set(false);
      this.attemptReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageSubject.next(data);
      } catch (e) {
        console.error('Invalid WebSocket data', e);
      }
    };
  }

  // IDINAGDAG: Mas matibay na reconnect logic
  private attemptReconnect() {
    if (this.reconnectInterval) return; // Wag mag-doble
    
    this.reconnectInterval = setInterval(() => {
      console.log('🔄 Attempting to reconnect...');
      this.connect();
    }, 3000);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }
}