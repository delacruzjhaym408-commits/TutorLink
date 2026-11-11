import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  sender_picture: string | null;
  content: string;
  created_at: string;
  post_id?: number | null;
  post_subject?: string | null;
  post_picture?: string | null;
}

export interface StartConversationOptions {
  initialMessage?: string;
  postId?: number;
  postSubject?: string;
  postPicture?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private http = inject(HttpClient);
  private apiUrl = 'https://tutorlink-api-9lcu.onrender.com';

  getMyConversations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/conversations`);
  }

  // 🔥 IDINAGDAG PARA SA RATING RESTRICTION
  checkConversation(otherUserId: number): Observable<{ exists: boolean, conversation_id: number | null }> {
    return this.http.get<{ exists: boolean, conversation_id: number | null }>(`${this.apiUrl}/conversations/check/${otherUserId}`);
  }

  startConversation(participantId: number, opts?: StartConversationOptions): Observable<any> {
    const body: any = { participant_id: participantId };
    if (opts?.initialMessage) body.initial_message = opts.initialMessage;
    if (opts?.postId) body.post_id = opts.postId;
    if (opts?.postSubject) body.post_subject = opts.postSubject;
    if (opts?.postPicture) body.post_picture = opts.postPicture;
    return this.http.post<any>(`${this.apiUrl}/conversations`, body);
  }

  getMessages(conversationId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/conversations/${conversationId}/messages`);
  }

  sendMessage(conversationId: number, content: string): Observable<Message> {
    return this.http.post<Message>(
      `${this.apiUrl}/conversations/${conversationId}/messages`,
      { content }
    );
  }

  markAsRead(conversationId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/conversations/${conversationId}/read`, {});
  }

  deleteConversation(conversationId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/conversations/${conversationId}`);
  }
}