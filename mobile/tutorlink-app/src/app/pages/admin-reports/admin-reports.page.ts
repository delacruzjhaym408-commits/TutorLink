import { Component, OnInit, inject, signal, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
  IonLabel, IonButton, IonIcon, IonBackButton, IonButtons,
  ToastController, IonSpinner, IonBadge, AlertController,
  IonSegment, IonSegmentButton, IonModal, IonTextarea,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonAvatar, IonRefresher, IonRefresherContent
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, chatbubbleEllipsesOutline, flagOutline } from 'ionicons/icons';
import { AdminService } from '../../services/admin.service';
import { API_BASE_URL } from '../../config';

@Component({
  selector: 'app-admin-reports',
  templateUrl: './admin-reports.page.html',
  styleUrls: ['./admin-reports.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
    IonLabel, IonButton, IonIcon, IonBackButton, IonButtons, IonSpinner, IonBadge,
    IonSegment, IonSegmentButton, IonModal, IonTextarea,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonAvatar,  IonRefresher, IonRefresherContent
  ],
})
export class AdminReportsPage implements OnInit {
  @ViewChild('detailModal') detailModal!: IonModal;
  @ViewChild('messageModal') messageModal!: IonModal;

  private adminService = inject(AdminService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private cdr = inject(ChangeDetectorRef);

  reports = signal<any[]>([]);
  loading = signal(true);
  activeTab = signal<string>('post');
  
  selectedReport: any = null;
  warningMessage = '';

  constructor() {
    addIcons({ checkmarkCircleOutline, chatbubbleEllipsesOutline, flagOutline });
  }

  ngOnInit() {
    this.loadReports();
  }

  doRefresh(event: any) {
    this.adminService.getReports().subscribe({
      next: (reports) => {
        this.reports.set(reports);
        this.cdr.detectChanges();
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      }
    });
  }

  loadReports() {
    this.loading.set(true);
    this.adminService.getReports().subscribe(reports => {
      console.log("🔥 REPORTS FROM BACKEND:", reports); // I-check mo ito sa F12 Console
      this.reports.set(reports);
      this.loading.set(false);
      this.cdr.detectChanges();
    });
  }

  setActiveTab(tab: any) {
    this.activeTab.set(tab);
    this.cdr.detectChanges();
  }

  getFilteredReports(): any[] {
    if (this.activeTab() === 'post') {
      return this.reports().filter(r => r.reported_post_id);
    } else {
      return this.reports().filter(r => r.reported_user_id && !r.reported_post_id);
    }
  }

  openDetails(report: any) {
    this.selectedReport = report;
    this.detailModal.present();
  }

  openMessagePrompt(report: any) {
    this.selectedReport = report;
    this.warningMessage = `Warning regarding your recent ${report.reported_post_id ? 'post: ' + report.reported_post_subject : 'account'}\n\nReason: ${report.reason}`;
    this.messageModal.present();
  }

  sendWarningMessage() {
    if (!this.selectedReport || !this.warningMessage.trim()) return;

    console.log("🔥 SELECTED REPORT:", this.selectedReport); // I-check mo ito sa F12 Console

    let userId = this.selectedReport.reported_user_id;
    
    if (!userId && this.selectedReport.user_details && this.selectedReport.user_details.id) {
      userId = this.selectedReport.user_details.id;
    }
    
    if (!userId && this.selectedReport.post_details && this.selectedReport.post_details.user_id) {
      userId = this.selectedReport.post_details.user_id;
    }

    if (!userId) {
      this.showToast('Could not find user ID to warn.', 'danger');
      return;
    }

    this.adminService.sendAdminMessage(userId, this.warningMessage.trim()).subscribe({
      next: async () => {
        this.messageModal.dismiss();
        this.warningMessage = '';
        this.showToast('Warning message sent!', 'success');
      },
      error: async (err) => {
        this.showToast(err.error?.detail || 'Failed to send message.', 'danger');
      }
    });
  }

  getImageUrl(pic: string | null | undefined): string {
    if (!pic) return 'https://ionicframework.com/docs/img/demos/avatar.svg';
    
    let imageUrl: string = pic;

    if (imageUrl.startsWith('[')) {
      try {
        const parsed = JSON.parse(imageUrl);
        if (Array.isArray(parsed) && parsed.length > 0) {
          imageUrl = String(parsed[0]);
        }
      } catch {}
    }

    if (imageUrl.startsWith('/uploads/')) return `${API_BASE_URL}${imageUrl}`;
    if (!imageUrl.startsWith('http')) return `${API_BASE_URL}/uploads/${imageUrl}`;
    return imageUrl;
  }

  resolve(report: any) {
    this.adminService.resolveReport(report.id).subscribe({
      next: async () => {
        this.reports.update(r => r.map(rep => rep.id === report.id ? {...rep, status: 'resolved'} : rep));
        this.cdr.detectChanges();
        this.showToast('Report resolved', 'success');
      }
    });
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color });
    await toast.present();
  }
}