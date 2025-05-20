// src/app/features/admin/order-management/order-management.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, 
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, 
  IonSelect, IonSelectOption, IonSearchbar, IonBadge, 
  IonInfiniteScroll, IonInfiniteScrollContent, IonSkeletonText,
  IonChip
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  searchOutline, filterOutline, arrowDownOutline, arrowUpOutline, eyeOutline
} from 'ionicons/icons';

import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../core/models/order.model';

@Component({
  selector: 'app-order-management',
  templateUrl: './order-management.page.html',
  styleUrls: ['./order-management.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonButton, IonIcon,
    IonSelect, IonSelectOption, IonSearchbar,
    HeaderComponent, LoadingSpinnerComponent, EmptyStateComponent
]
})
export class OrderManagementPage implements OnInit {
  orders: Order[] = [];
  isLoading = true;
  
  // Filtering
  selectedStatus = '';
  searchTerm = '';
  
  // Status filter options
  statusOptions = [
    { value: '', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'ready-for-pickup', label: 'Ready for Pickup' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];
  
  constructor(
    private orderService: OrderService,
    private router: Router
  ) {
    addIcons({
      searchOutline, filterOutline, arrowDownOutline, arrowUpOutline, eyeOutline
    });
  }
  
  ngOnInit() {
    this.loadOrders();
  }
  
  loadOrders() {
    this.isLoading = true;
    
    this.orderService.getAllOrders(this.selectedStatus).subscribe(
      orders => {
        // Apply search filter if needed
        if (this.searchTerm) {
          const searchLower = this.searchTerm.toLowerCase();
          this.orders = orders.filter(order => 
            order.id.toLowerCase().includes(searchLower) ||
            this.formatDate(order.createdAt).toLowerCase().includes(searchLower)
          );
        } else {
          this.orders = orders;
        }
        
        this.isLoading = false;
      },
      error => {
        console.error('Error loading orders:', error);
        this.isLoading = false;
      }
    );
  }
  
  onStatusChange(event: any) {
    this.selectedStatus = event.detail.value;
    this.loadOrders();
  }
  
  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    this.loadOrders();
  }
  
  viewOrder(orderId: string) {
    this.router.navigate(['/admin/orders', orderId]);
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
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }
}