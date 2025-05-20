// src/app/features/orders/order-detail/order-detail.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonItem, IonLabel, IonBadge, IonList
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline, printOutline, receiptOutline, bagCheckOutline,
  locationOutline, timeOutline, cardOutline
} from 'ionicons/icons';

import { HeaderComponent } from 'src/app/shared/components/header/header.component';
import { FooterComponent } from 'src/app/shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from 'src/app/shared/components/loading-spinner/loading-spinner.component';
import { OrderService } from 'src/app/core/services/order.service';
import { Order } from 'src/app/core/models/order.model';
@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.page.html',
  styleUrls: ['./order-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonContent,
    IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonItem, IonLabel, IonBadge, IonList,
    HeaderComponent, LoadingSpinnerComponent
]
})
export class OrderDetailPage implements OnInit {
  order: Order | null = null;
  isLoading = true;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService
  ) {
    addIcons({ 
      arrowBackOutline, printOutline, receiptOutline, bagCheckOutline,
      locationOutline, timeOutline, cardOutline
    });
  }
  
  ngOnInit() {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) {
      this.router.navigate(['/orders']);
      return;
    }
    
    this.loadOrder(orderId);
  }
  
  loadOrder(orderId: string) {
    this.isLoading = true;
    
    this.orderService.getOrderById(orderId).subscribe(
      order => {
        this.order = order;
        this.isLoading = false;
      },
      error => {
        console.error('Error loading order:', error);
        this.isLoading = false;
        this.router.navigate(['/orders']);
      }
    );
  }
  
  printOrder() {
    window.print();
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
  
  getPaymentStatusClass(status: Order['paymentStatus']): string {
    switch (status) {
      case 'pending':
        return 'payment-pending';
      case 'paid':
        return 'payment-paid';
      case 'failed':
        return 'payment-failed';
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
    return d.toLocaleDateString() + ', ' + d.toLocaleTimeString();
  }
}