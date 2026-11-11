import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SessionService } from '../../services/session.service';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonCard,
  IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonAvatar,
  IonSpinner, IonNote, IonButtons, IonList, IonItem, IonLabel, 
  MenuController, AlertController, ToastController, IonBackButton, 
  IonMenu,  IonRefresher, IonRefresherContent
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  star,personOutline, mailOutline, callOutline, createOutline, trashOutline, 
  addOutline, starOutline, logOutOutline, chatbubbleOutline, bookOutline, 
  settingsOutline, menuOutline, homeOutline, shieldCheckmarkOutline,
  documentTextOutline // 🔥 IDINAGDAG PARA SA PROFILE PAGE
} from 'ionicons/icons';
import { TutorPost, TutorPostService } from '../../services/tutor-post.service';
import { AuthUser } from '../../models/user.model';
import { API_BASE_URL } from '../../config';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
    IonCardContent, IonAvatar, IonSpinner, IonNote, IonButtons, IonList, IonItem, IonLabel, IonBackButton,IonMenu, IonRefresher, IonRefresherContent
  ],
})
export class ProfilePage implements OnInit {
  private tutorPostService = inject(TutorPostService);
  private session = inject(SessionService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  public menuController = inject(MenuController);

  user = signal<AuthUser | null>(null);
  myPosts = signal<TutorPost[]>([]);
  loading = signal(false);

  constructor() {
    addIcons({ 
      personOutline, mailOutline, callOutline, createOutline, trashOutline, 
      addOutline, starOutline, logOutOutline, chatbubbleOutline, bookOutline, 
      settingsOutline, menuOutline, homeOutline, shieldCheckmarkOutline,
      documentTextOutline, star,
    });
  }

  async ngOnInit() {
    this.user.set(this.session.user() || this.getUserFromStorage());
    await this.loadMyPosts();
  }

  private getUserFromStorage(): AuthUser | null {
    const userJson = localStorage.getItem('user');
    if (userJson) { try { return JSON.parse(userJson); } catch { return null; } }
    return null;
  }

  async loadMyPosts() {
    this.loading.set(true);
    this.cdr.detectChanges();
    this.tutorPostService.getMyPosts().subscribe({
      next: (posts) => { this.myPosts.set(posts); this.loading.set(false); this.cdr.detectChanges(); },
      error: (err) => { this.loading.set(false); this.cdr.detectChanges(); },
    });
  }

  // 🔥 LINIS: Tinanggal ang redundant na IP replace logic
  parseImages(jsonString: string | null | undefined): string[] {
    if (!jsonString) return [];
    try {
      const images = JSON.parse(jsonString);
      return images.map((img: string) => {
        if (!img) return img;
        
        // Kung filename lang, idagdag ang /uploads/
        if (!img.startsWith('http') && !img.startsWith('/')) {
          return `${API_BASE_URL}/uploads/${img}`;
        }
        // Kung relative path, idagdag ang API_BASE_URL
        if (img.startsWith('/uploads/')) {
          return `${API_BASE_URL}${img}`;
        }
        return img;
      });
    } catch (e) {
      return [];
    }
  }

  getProfilePictureUrl(): string {
    const pic = this.user()?.profile_picture;
    if (!pic) return 'https://ionicframework.com/docs/img/demos/avatar.svg';
    
    if (pic.startsWith('/uploads/')) {
      return `${API_BASE_URL}${pic}`;
    }
    if (!pic.startsWith('http')) {
      return `${API_BASE_URL}/uploads/${pic}`;
    }
    return pic;
  }

  getDescriptionPictureUrl(): string | null {
    const pic = this.user()?.description_picture;
    if (!pic) return null;
    
    if (pic.startsWith('/uploads/')) {
      return `${API_BASE_URL}${pic}`;
    }
    if (!pic.startsWith('http')) {
      return `${API_BASE_URL}/uploads/${pic}`;
    }
    return pic;
  }

  async openMenu() {
    await this.menuController.open();
  }

  goToCreatePost() { this.router.navigate(['/create-post']); }
  goToEditPost(post: TutorPost) { this.router.navigate(['/edit-post', post.id]); }
  
  goToMyReviews() { this.router.navigate(['/my-reviews']); }

  goToAdminChat() {
    this.router.navigate(['/admin-chat']);
  }

  logout() {
    this.menuController.close();
    this.session.logout();
    this.router.navigate(['/login']);
  }

  async confirmDeletePost(post: TutorPost) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Post',
      message: `Are you sure you want to delete "${post.subject}"?`,
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Delete', role: 'destructive', handler: () => this.deletePost(post) }],
    });
    await alert.present();
  }

    doRefresh(event: any) {
    this.user.set(this.session.user() || this.getUserFromStorage());
    this.tutorPostService.getMyPosts().subscribe({
      next: (posts) => {
        this.myPosts.set(posts);
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      }
    });
  }

  private deletePost(post: TutorPost) {
    this.tutorPostService.deletePost(post.id).subscribe({
      next: async () => {
        this.myPosts.update((posts) => posts.filter((p) => p.id !== post.id));
        this.cdr.detectChanges();
        const toast = await this.toastCtrl.create({ message: 'Post deleted', duration: 2000, color: 'success' });
        await toast.present();
      },
      error: async () => {
        const toast = await this.toastCtrl.create({ message: 'Error deleting post', duration: 2000, color: 'danger' });
        await toast.present();
      },
    });
  }
}