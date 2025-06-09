import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, 
  IonSelect, IonSelectOption, IonBadge, IonAlert,
  IonList, IonListHeader, IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, printOutline, mailOutline, 
  checkmarkCircleOutline, closeCircleOutline
} from 'ionicons/icons';

import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { OrderService } from '../../../core/services/order.service';
import { AdminService } from '../../../core/services/admin.service';
import { Order } from '../../../core/models/order.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.page.html',
  styleUrls: ['./order-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent,
    IonSelect, IonSelectOption, IonBadge, IonAlert,
    IonText,
    HeaderComponent, LoadingSpinnerComponent
]
})
export class OrderDetailPage implements OnInit {
  order: Order | null = null;
  customer: User | null = null;
  isLoading = true;
  
  // Status update
  selectedStatus: Order['status'] = 'pending';
  showStatusAlert = false;
  
  // Available status options for dropdown
  statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'ready-for-pickup', label: 'Ready for Pickup' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private adminService: AdminService
  ) {
    addIcons({arrowBackOutline,printOutline,mailOutline,checkmarkCircleOutline,closeCircleOutline});
  }
  
  ngOnInit() {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) {
      this.router.navigate(['/admin/orders']);
      return;
    }
    
    this.loadOrder(orderId);
  }
  
  loadOrder(orderId: string) {
    this.isLoading = true;
    
    this.orderService.getOrderById(orderId).subscribe(
      order => {
        this.order = order;
        this.selectedStatus = order.status;
        
        // Load customer details
        this.adminService.getUserById(order.userId).subscribe(
          user => {
            this.customer = user;
            this.isLoading = false;
          },
          error => {
            console.error('Error loading customer:', error);
            this.isLoading = false;
          }
        );
      },
      error => {
        console.error('Error loading order:', error);
        this.isLoading = false;
        this.router.navigate(['/admin/orders']);
      }
    );
  }
  
  confirmStatusUpdate() {
    if (!this.order || this.selectedStatus === this.order.status) return;
    
    this.showStatusAlert = true;
  }
  
  updateOrderStatus() {
    if (!this.order) return;
    
    this.orderService.updateOrderStatus(this.order.id, this.selectedStatus).subscribe(
      () => {
        // Update local order object
        this.order = {
          ...this.order!,
          status: this.selectedStatus,
          updatedAt: new Date()
        };
        
        this.showStatusAlert = false;
      },
      error => {
        console.error('Error updating order status:', error);
        this.showStatusAlert = false;
      }
    );
  }
  
  cancelStatusUpdate() {
    if (this.order) {
      this.selectedStatus = this.order.status;
    }
    this.showStatusAlert = false;
  }
  // Add this property to your component class
statusUpdateAlertButtons = [
  {
    text: 'Cancel',
    role: 'cancel',
    handler: () => {
      this.cancelStatusUpdate();
    }
  },
  {
    text: 'Update',
    handler: () => {
      this.updateOrderStatus();
    }
  }
];

  
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
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }

  
}