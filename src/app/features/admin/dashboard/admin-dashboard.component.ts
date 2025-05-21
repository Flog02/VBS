import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cubeOutline,
  cartOutline,
  peopleOutline,
  analyticsOutline,
  settingsOutline,
  addOutline
} from 'ionicons/icons';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonBadge
  ],
  template: `
    <ion-content>
      <div class="admin-container">
        <h1>Admin Dashboard</h1>
        <p>Welcome to the VBS Admin Dashboard. Manage your store from here.</p>
        
        <ion-grid>
          <ion-row>
            <!-- Product Management Card -->
            <ion-col size="12" size-md="6" size-lg="4">
              <ion-card>
                <ion-card-header>
                  <ion-card-title>
                    <ion-icon name="cube-outline"></ion-icon>
                    Product Management
                  </ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <p>Manage your store products, update inventory, and add new items.</p>
                  <div class="card-stats">
                    <span class="stat-item">
                      <ion-badge color="primary">{{productCount}}</ion-badge> Products
                    </span>
                  </div>
                  <div class="card-actions">
                    <ion-button expand="block" (click)="goToProducts()">
                      Manage Products
                    </ion-button>
                    <ion-button expand="block" fill="outline" (click)="createNewProduct()">
                      <ion-icon name="add-outline" slot="start"></ion-icon>
                      Add New Product
                    </ion-button>
                  </div>
                </ion-card-content>
              </ion-card>
            </ion-col>
            
            <!-- Orders Card -->
            <ion-col size="12" size-md="6" size-lg="4">
              <ion-card>
                <ion-card-header>
                  <ion-card-title>
                    <ion-icon name="cart-outline"></ion-icon>
                    Orders
                  </ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <p>View and manage customer orders and track shipments.</p>
                  <div class="card-stats">
                    <span class="stat-item">
                      <ion-badge color="warning">0</ion-badge> Pending
                    </span>
                    <span class="stat-item">
                      <ion-badge color="success">0</ion-badge> Completed
                    </span>
                  </div>
                  <div class="card-actions">
                    <ion-button expand="block" disabled>
                      Manage Orders
                    </ion-button>
                  </div>
                </ion-card-content>
              </ion-card>
            </ion-col>
            
            <!-- Customers Card -->
            <ion-col size="12" size-md="6" size-lg="4">
              <ion-card>
                <ion-card-header>
                  <ion-card-title>
                    <ion-icon name="people-outline"></ion-icon>
                    Customers
                  </ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <p>View and manage customer accounts and information.</p>
                  <div class="card-stats">
                    <span class="stat-item">
                      <ion-badge color="primary">0</ion-badge> Customers
                    </span>
                  </div>
                  <div class="card-actions">
                    <ion-button expand="block" disabled>
                      Manage Customers
                    </ion-button>
                  </div>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>
    </ion-content>
  `,
  styles: [`
    .admin-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    p {
      color: var(--ion-color-medium);
      margin-bottom: 24px;
    }
    
    ion-card {
      margin-bottom: 20px;
      border-radius: 8px;
    }
    
    ion-card-title {
      display: flex;
      align-items: center;
      font-size: 18px;
      
      ion-icon {
        margin-right: 8px;
        font-size: 20px;
      }
    }
    
    .card-stats {
      display: flex;
      margin: 16px 0;
      flex-wrap: wrap;
      gap: 12px;
    }
    
    .stat-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .card-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  productCount = 0;
  
  constructor(
    private router: Router,
    private productService: ProductService
  ) {
    addIcons({
      cubeOutline,
      cartOutline,
      peopleOutline,
      analyticsOutline,
      settingsOutline,
      addOutline
    });
  }
  
  ngOnInit() {
    this.loadProductCount();
  }
  
  loadProductCount() {
    this.productService.getProducts().subscribe({
      next: (result) => {
        this.productCount = result.products.length;
      },
      error: (error) => {
        console.error('Error loading product count:', error);
        this.productCount = 0;
      }
    });
  }
  
  goToProducts() {
    this.router.navigate(['/admin/products']);
  }
  
  createNewProduct() {
    this.router.navigate(['/admin/products/new']);
  }
}