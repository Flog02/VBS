// src/app/features/admin/dashboard/dashboard.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel,
  IonList, IonIcon, IonBadge, IonGrid, IonRow, IonCol, IonButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  personOutline, cartOutline, cubeOutline, chatbubbleOutline, 
  trendingUpOutline, alertCircleOutline, ellipseOutline, checkmarkCircleOutline, 
  arrowForwardOutline, addCircleOutline, peopleOutline, settingsOutline,
  syncOutline, airplaneOutline, archiveOutline, closeCircleOutline, 
  shieldOutline, timeOutline, serverOutline, cardOutline, mailOutline, cloudOutline
} from 'ionicons/icons';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AdminService } from '../../../core/services/admin.service';
import { Order } from '../../../core/models/order.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel,
    IonList, IonIcon, IonBadge, IonGrid, IonRow, IonCol, IonButton,
    HeaderComponent, FooterComponent, LoadingSpinnerComponent
  ]
})
export class DashboardPage implements OnInit {
  dashboardStats: any = null;
  isLoading = true;
  
  constructor(
    private adminService: AdminService,
    private router: Router
  ) {
    addIcons({
      personOutline, cartOutline, cubeOutline, chatbubbleOutline, arrowForwardOutline,
      addCircleOutline, settingsOutline, peopleOutline, trendingUpOutline, 
      alertCircleOutline, ellipseOutline, checkmarkCircleOutline, syncOutline,
      airplaneOutline, archiveOutline, closeCircleOutline, shieldOutline, timeOutline,
      serverOutline, cardOutline, mailOutline, cloudOutline
    });
  }
  
  ngOnInit() {
    this.loadDashboardStats();
  }
  
  loadDashboardStats() {
    this.isLoading = true;
    this.adminService.getDashboardStats().subscribe({
      next: (stats: any) => {
        this.dashboardStats = stats;
        console.log('Dashboard stats loaded:', stats);
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading dashboard stats:', error);
        this.isLoading = false;
      }
    });
  }

  // Navigation methods for clickable cards
  navigateToUsers() {
    this.router.navigate(['/admin/users']);
  }

  navigateToOrders() {
    this.router.navigate(['/admin/orders']);
  }

  navigateToProducts() {
    this.router.navigate(['/admin/products']);
  }

  navigateToChats() {
    this.router.navigate(['/admin/chats']);
  }

  // Navigate to specific order with return context
  navigateToOrder(orderId: string) {
    this.router.navigate(['/admin/orders', orderId], {
      queryParams: { returnTo: 'dashboard' }
    });
  }

  // Navigate to orders filtered by status
  navigateToOrdersByStatus(status: string) {
    this.router.navigate(['/admin/orders'], {
      queryParams: { status: status, returnTo: 'dashboard' }
    });
  }
  
  getStatusClass(status: Order['status']): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'processing': return 'status-processing';
      case 'shipped': return 'status-shipped';
      case 'ready-for-pickup': return 'status-ready';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }
  
  getStatusIcon(status: Order['status']): string {
    switch (status) {
      case 'pending': return 'ellipse-outline';
      case 'processing': return 'sync-outline';
      case 'shipped': return 'airplane-outline';
      case 'ready-for-pickup': return 'archive-outline';
      case 'completed': return 'checkmark-circle-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'ellipse-outline';
    }
  }
  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  formatDate(date: any): string {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }
}