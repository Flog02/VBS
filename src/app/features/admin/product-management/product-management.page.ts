import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, 
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, 
  IonSelect, IonSelectOption, IonSearchbar, IonBadge, 
  IonInfiniteScroll, IonInfiniteScrollContent, IonSkeletonText,
  IonChip, IonAlert
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, trashOutline, createOutline, searchOutline, 
  filterOutline, arrowDownOutline, arrowUpOutline, ellipsisVerticalOutline, arrowBackOutline } from 'ionicons/icons';

import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-product-management',
  templateUrl: './product-management.page.html',
  styleUrls: ['./product-management.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonButton, IonIcon,
    IonSelect, IonSelectOption, IonSearchbar, IonBadge,
    IonInfiniteScroll, IonInfiniteScrollContent,
    IonAlert,
    HeaderComponent, FooterComponent, LoadingSpinnerComponent, EmptyStateComponent
  ]
})
export class ProductManagementPage implements OnInit {
  products: Product[] = [];
  isLoading = true;
  totalProducts = 0;
  
  // Pagination
  pageSize = 10;
  lastVisible: any = null;
  noMoreProducts = false;
  
  // Filtering and Sorting
  searchTerm = '';
  selectedCategory = '';
  sortField = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // Delete confirmation
  showDeleteAlert = false;
  productToDelete: Product | null = null;
  
  // Available categories
  categories = [
    { id: '', name: 'All Categories' },
    { id: 'mobile', name: 'Mobile Phones' },
    { id: 'tv', name: 'TV & Services' },
    { id: 'wearables', name: 'Wearables' },
    { id: 'accessories', name: 'Accessories' },
    { id: 'audio', name: 'Audio' },
    { id: 'computers', name: 'Computers' }
  ];
  
  constructor(
    private productService: ProductService,
    private router: Router
  ) {
    addIcons({arrowBackOutline,addOutline,createOutline,trashOutline,searchOutline,filterOutline,arrowDownOutline,arrowUpOutline,ellipsisVerticalOutline});
  }
  
  ngOnInit() {
    console.log('ProductManagementPage initialized, loading products');
    this.loadProducts();
  }
  
  ionViewWillEnter() {
    console.log('ionViewWillEnter: Reloading products');
    this.loadProducts();
  }
  
  deleteAlertButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
      handler: () => {
        this.cancelDelete();
      }
    },
    {
      text: 'Delete',
      role: 'destructive',
      handler: () => {
        this.deleteProduct();
      }
    }
  ];
  
  loadProducts(event?: any) {
    console.log('Loading products...');
    if (!event) {
      this.isLoading = true;
      this.products = [];
      this.lastVisible = null;
    }
    
    console.log('Calling productService.getProducts with params:', {
      category: this.selectedCategory,
      sortField: this.sortField,
      sortDirection: this.sortDirection,
      pageSize: this.pageSize,
      lastVisible: this.lastVisible
    });
    
    this.productService.getProducts(
      this.selectedCategory,
      this.sortField,
      this.sortDirection,
      this.pageSize,
      this.lastVisible
    ).subscribe({
      next: result => {
        console.log('Products loaded:', result);
        
        const newProducts = this.searchTerm 
          ? result.products.filter(p => 
              p.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
              p.description.toLowerCase().includes(this.searchTerm.toLowerCase())
            )
          : result.products;
        
        this.products = event ? [...this.products, ...newProducts] : newProducts;
        this.lastVisible = result.lastVisible;
        this.noMoreProducts = newProducts.length < this.pageSize;
        
        console.log('Processed products:', this.products.length);
        this.isLoading = false;
        
        if (event) {
          event.target.complete();
          if (this.noMoreProducts) {
            event.target.disabled = true;
          }
        }
      },
      error: error => {
        console.error('Error loading products:', error);
        this.isLoading = false;
        if (event) {
          event.target.complete();
        }
      }
    });
  }
  
  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    this.loadProducts();
  }
  
  onCategoryChange(event: any) {
    this.selectedCategory = event.detail.value;
    this.loadProducts();
  }
  
  changeSortField(field: string) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'desc';
    }
    
    this.loadProducts();
  }
  
  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return '';
    }
    
    return this.sortDirection === 'asc' ? 'arrow-up-outline' : 'arrow-down-outline';
  }
  
  editProduct(product: Product) {
    this.router.navigate(['/admin/products/edit', product.id]);
  }
  
  confirmDelete(product: Product) {
    this.productToDelete = product;
    this.showDeleteAlert = true;
  }
  
  deleteProduct() {
    if (!this.productToDelete) return;
    
    this.productService.deleteProduct(this.productToDelete.id).subscribe({
      next: () => {
        // Remove from local array
        this.products = this.products.filter(p => p.id !== this.productToDelete?.id);
        this.productToDelete = null;
        this.showDeleteAlert = false;
      },
      error: error => {
        console.error('Error deleting product:', error);
        this.showDeleteAlert = false;
      }
    });
  }
  
  cancelDelete() {
    this.productToDelete = null;
    this.showDeleteAlert = false;
  }
  
  createNewProduct() {
    this.router.navigate(['/admin/products/new']);
  }
  
  getCategoryName(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  }
  
  formatCurrency(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }
  
  formatDate(date: any): string {
    if (!date) return '';
    
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  }
  goBack() {
  this.router.navigate(['/admin']);
}
}