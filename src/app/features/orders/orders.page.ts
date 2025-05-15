// src/app/features/orders/orders.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonItem, IonLabel, IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  cartOutline, eyeOutline, bagOutline, arrowForwardOutline,
  ellipsisHorizontalOutline
} from 'ionicons/icons';

import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { Order } from '../../core/models/order.model';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.page.html',
  styleUrls: ['./orders.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonItem, IonLabel, IonBadge,
    HeaderComponent, FooterComponent, LoadingSpinnerComponent, EmptyStateComponent
  ]
})
export class OrdersPage implements OnInit {
  orders: Order[] = [];
  isLoading = true;
  
  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ 
      cartOutline, eyeOutline, bagOutline, arrowForwardOutline,
      ellipsisHorizontalOutline
    });
  }
  
  ngOnInit() {
    this.loadOrders();
  }
  
  loadOrders() {
    this.isLoading = true;
    
    this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      if (!isLoggedIn) {
        this.isLoading = false;
        this.router.navigate(['/auth/login'], { 
          queryParams: { returnUrl: '/orders' } 
        });
        return;
      }
      
      this.orderService.getOrdersByUser().subscribe(
        orders => {
          this.orders = orders;
          this.isLoading = false;
        },
        error => {
          console.error('Error loading orders:', error);
          this.isLoading = false;
        }
      );
    });
  }
  
  viewOrderDetails(orderId: string) {
    this.router.navigate(['/orders', orderId]);
  }
  
  getStatusClass(status: Order['status']): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'shipped':
        return 'status-shipped';
      case 'ready-for-pickup':
        return 'status-ready';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
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
    return d.toLocaleDateString();
  }
}