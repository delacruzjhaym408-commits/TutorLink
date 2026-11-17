import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonAvatar, IonSpinner, IonButtons, IonBackButton, IonCard,
  IonCardContent, IonList, IonItem, IonLabel, IonBadge, MenuController,
  IonMenu, IonMenuToggle
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  star, schoolOutline, chatbubbleEllipsesOutline, 
  personOutline, homeOutline, chatbubbleOutline, bookOutline,
  settingsOutline, logOutOutline, menuOutline, cashOutline, 
  documentTextOutline, chevronForwardOutline
} from 'ionicons/icons';
import { TutorPost, TutorPostService } from '../../services/tutor-post.service';
import { MessageService } from '../../services/message.service';
import { SessionService } from '../../services/session.service';
import { API_BASE_URL } from '../../config';

@Component({
  selector: 'app-post-details',
  templateUrl: './post-details.page.html',
  styleUrls: ['./post-details.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonAvatar, IonSpinner, IonButtons, IonBackButton, IonCard, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonMenu, IonMenuToggle
  ],
})
export class PostDetailsPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tutorPostService = inject(TutorPostService);
  private messageService = inject(MessageService);
  private session = inject(SessionService);
  private cdr = inject(ChangeDetectorRef);
  public menuController = inject(MenuController);

  post = signal<TutorPost | null>(null);
  tutorPosts = signal<TutorPost[]>([]); 
  loading = signal(true);
  errorMessage = signal('');

  constructor() {
    addIcons({
      star, schoolOutline, chatbubbleEllipsesOutline, 
      personOutline, homeOutline, chatbubbleOutline, bookOutline,
      settingsOutline, logOutOutline, menuOutline, cashOutline, 
      documentTextOutline, chevronForwardOutline
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadPost(Number(id));
    else { this.errorMessage.set('Post ID not found'); this.loading.set(false); }
  }

  private loadPost(id: number) {
    this.tutorPostService.getPostById(id).subscribe({
      next: (post) => {
        this.post.set(post);
        this.loadTutorPosts(post.user_id);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage.set('Could not load post details.');
        this.loading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  private loadTutorPosts(userId: number) {
    this.tutorPostService.getAllPosts().subscribe({
      next: (posts) => {
        let filtered = posts.filter(p => p.user_id === userId && p.status === 'published');
        
        // 🔥 I-SORT: Yung kasalukuyang pinindot na post, gawing pang-una
        const currentPostId = this.post()?.id;
        if (currentPostId) {
          filtered.sort((a, b) => {
            if (a.id === currentPostId) return -1;
            if (b.id === currentPostId) return 1;
            return 0;
          });
        }

        this.tutorPosts.set(filtered);
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

  // 🔥 INAYOS: May applyNow parameter na para dumiretso sa Apply Modal
  goToTutorDetails(postId: number, applyNow: boolean = false) {
    if (applyNow) {
      this.router.navigate(['/tutor-details', postId], { queryParams: { apply: 'true' } });
    } else {
      this.router.navigate(['/tutor-details', postId]);
    }
  }

  async goToMessages() {
    const currentPost = this.post();
    if (!currentPost) return;
    
    this.messageService.startConversation(currentPost.user_id, {
      initialMessage: `Hi! I'm interested in your ${currentPost.subject} post.`,
      postId: currentPost.id, postSubject: currentPost.subject, postPicture: null
    }).subscribe({
      next: (conv: any) => this.router.navigate(['/chat', conv.id]),
      error: () => alert('You cannot message yourself.')
    });
  }

  goToHome() { this.menuController.close('main-menu'); this.router.navigate(['/home']); }
  goToProfile() { this.menuController.close('main-menu'); this.router.navigate(['/profile']); }
  goToMessagesPage() { this.menuController.close('main-menu'); this.router.navigate(['/messages']); }
  goToMyLesson() { this.menuController.close('main-menu'); this.router.navigate(['/my-lesson']); }
  goToSettings() { this.menuController.close('main-menu'); this.router.navigate(['/settings']); }
  logout() { this.menuController.close('main-menu'); this.session.logout(); this.router.navigate(['/login']); }
}