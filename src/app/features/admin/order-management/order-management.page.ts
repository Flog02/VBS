import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
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
  searchOutline, filterOutline, arrowDownOutline, arrowUpOutline, eyeOutline, arrowBackOutline } from 'ionicons/icons';

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
    private router: Router,
        private activatedRoute: ActivatedRoute // Add this

  ) {
    addIcons({arrowBackOutline,eyeOutline,searchOutline,filterOutline,arrowDownOutline,arrowUpOutline});
  }
  
  // ngOnInit() {
  //   this.loadOrders();
  // }



  
  // loadOrders() {
  //   this.isLoading = true;
    
  //   this.orderService.getAllOrders(this.selectedStatus).subscribe(
  //     orders => {
  //       // Apply search filter if needed
  //       if (this.searchTerm) {
  //         const searchLower = this.searchTerm.toLowerCase();
  //         this.orders = orders.filter(order => 
  //           order.id.toLowerCase().includes(searchLower) ||
  //           this.formatDate(order.createdAt).toLowerCase().includes(searchLower)
  //         );
  //       } else {
  //         this.orders = orders;
  //       }
        
  //       this.isLoading = false;
  //     },
  //     error => {
  //       console.error('Error loading orders:', error);
  //       this.isLoading = false;
  //     }
  //   );
  // }
  







  // onStatusChange(event: any) {
  //   this.selectedStatus = event.detail.value;
  //   this.loadOrders();
  // }
  

ngOnInit() {
  // Check for query parameters first, then load orders
  this.activatedRoute.queryParams.subscribe(params => {
    // Only set selectedStatus if there's actually a status parameter
    if (params['status'] && params['status'].trim() !== '') {
      this.selectedStatus = params['status'];
      console.log('Filtering by status from URL:', this.selectedStatus);
    } else {
      // Reset to show all orders when no status parameter
      this.selectedStatus = '';
      console.log('No status filter, showing all orders');
    }
    this.loadOrders();
  });
}

// In your order-management.page.ts, replace the loadOrders method:

loadOrders() {
  this.isLoading = true;
  console.log('Loading orders with selectedStatus:', this.selectedStatus);
  
  // Always get all orders first, then filter client-side for reliability
  this.orderService.getAllOrders().subscribe({
    next: (allOrders) => {
      console.log('All orders from service:', allOrders.length);
      console.log('All orders statuses:', allOrders.map(o => ({ id: o.id.substring(0, 8), status: o.status })));
      
      let filteredOrders = allOrders;
      
      // Apply status filter on client side
      if (this.selectedStatus && this.selectedStatus.trim() !== '') {
        filteredOrders = allOrders.filter(order => {
          const matches = order.status === this.selectedStatus;
          if (!matches) {
            console.log(`❌ Filtering out order ${order.id.substring(0, 8)} - has status "${order.status}", expected "${this.selectedStatus}"`);
          } else {
            console.log(`✅ Including order ${order.id.substring(0, 8)} - status matches "${this.selectedStatus}"`);
          }
          return matches;
        });
        console.log(`🔍 Filtered ${allOrders.length} orders to ${filteredOrders.length} with status "${this.selectedStatus}"`);
      }
      
      // Apply search filter if needed
      if (this.searchTerm && this.searchTerm.trim() !== '') {
        const searchLower = this.searchTerm.toLowerCase();
        this.orders = filteredOrders.filter(order => 
          order.id.toLowerCase().includes(searchLower) ||
          this.formatDate(order.createdAt).toLowerCase().includes(searchLower)
        );
        console.log(`🔍 Search filtered to ${this.orders.length} orders`);
      } else {
        this.orders = filteredOrders;
      }
      
      this.isLoading = false;
      console.log('📋 Final orders to display:', this.orders.length);
      console.log('📋 Final orders details:', this.orders.map(o => ({ id: o.id.substring(0, 8), status: o.status })));
      
      // Verify no wrong status orders are showing
      if (this.selectedStatus && this.orders.some(order => order.status !== this.selectedStatus)) {
        console.error('🚨 CRITICAL ERROR: Orders with wrong status are still showing!');
      }
    },
    error: (error) => {
      console.error('❌ Error loading orders:', error);
      this.isLoading = false;
      this.orders = [];
    }
  });
}
// Make sure the dropdown change also works correctly
onStatusChange(event: any) {
  this.selectedStatus = event.detail.value || '';
  console.log('Status changed via dropdown to:', this.selectedStatus);
  
  // Update URL to reflect the filter
  if (this.selectedStatus && this.selectedStatus.trim() !== '') {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { status: this.selectedStatus },
      queryParamsHandling: 'merge'
    });
  } else {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { status: null },
      queryParamsHandling: 'merge'
    });
  }
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

  goBack() {
  this.router.navigate(['/admin']);
}
}