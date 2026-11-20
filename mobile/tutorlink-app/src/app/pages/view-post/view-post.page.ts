import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, 
  IonSpinner, IonButton, IonIcon, IonAvatar 
} from '@ionic/angular';
import { chatbubbleOutline, cashOutline, schoolOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { TutorPost, TutorPostService } from '../../services/tutor-post.service';
import { MessageService } from '../../services/message.service';
import { API_BASE_URL } from '../../config';

@Component({
  selector: 'app-view-post',
  templateUrl: './view-post.page.html',
  styleUrls: ['./view-post.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
    IonBackButton, IonSpinner, IonButton, IonIcon, IonAvatar
  ],
})
export class ViewPostPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private postService = inject(TutorPostService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  post = signal<TutorPost | null>(null);
  loading = signal(true);
  gallery = signal<string[]>([]);

  constructor() {
    addIcons({ chatbubbleOutline, cashOutline, schoolOutline });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPost(Number(id));
    }
  }

  loadPost(id: number) {
    this.postService.getPostById(id).subscribe({
      next: (data) => {
        this.post.set(data);
        if (data.post_pictures) {
          try {
            this.gallery.set(JSON.parse(data.post_pictures).map((img: string) => this.getImageUrl(img)));
          } catch (e) {
            this.gallery.set([]);
          }
        }
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  getImageUrl(pic: string | null | undefined): string {
    if (!pic) return 'https://ionicframework.com/docs/img/demos/avatar.svg';
    if (pic.includes('localhost') || pic.includes('127.0.0.1') || pic.match(/http:\/\/192\.168\.\d+\.\d+:\d+/)) {
      return pic.replace(/http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+/, API_BASE_URL);
    }
    if (pic.startsWith('/uploads/')) return `${API_BASE_URL}${pic}`;
    if (!pic.startsWith('http')) return `${API_BASE_URL}/uploads/${pic}`;
    return pic;
  }

  // 🔥 ITO ANG BAGONG FUNCTION PARA SA APPLY LESSON
  goToTutorDetailsWithApply() {
    const currentPost = this.post();
    if (!currentPost) return;

    // Pumunta sa tutor details page at i-trigger ang apply modal
    this.router.navigate(['/tutor-details', currentPost.id], { 
      queryParams: { apply: 'true' } 
    });
  }

  // (Optional) Kung gusto mo pang i-retain ang message function
  goToMessages() {
    const currentPost = this.post();
    if (!currentPost) return;
    
    const initialMessage = `Hi! I'm interested in your ${currentPost.subject} post.`;
    const thumbnail = this.gallery().length > 0 ? this.gallery()[0] : null;

    this.messageService.startConversation(currentPost.user_id, {
      initialMessage, 
      postId: currentPost.id, 
      postSubject: currentPost.subject, 
      postPicture: thumbnail,
    }).subscribe({
      next: (conv: any) => this.router.navigate(['/chat', conv.id]),
      error: () => alert('You cannot message yourself.')
    });
  }
}