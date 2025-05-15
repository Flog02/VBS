import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonText, IonSearchbar,
  IonSelect, IonSelectOption, IonChip, IonLabel, IonInfiniteScroll,
  IonInfiniteScrollContent, IonBadge, IonModal
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  filterOutline, gridOutline, listOutline, closeCircleOutline, 
  funnelOutline, arrowUpOutline, arrowDownOutline, cartOutline } from 'ionicons/icons';

import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ProductFilterComponent, FilterOptions } from '../../shared/components/product-filter/product-filter.component';
import { ChatbotPage } from 'src/app/shared/components/chatbot/chatbot.page';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-products',
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton,
    IonButton, IonIcon, IonGrid, IonRow, IonCol, IonText, IonSearchbar,
    IonSelect, IonSelectOption, IonChip, IonLabel, IonInfiniteScroll,
    IonInfiniteScrollContent, IonBadge, IonModal,
    HeaderComponent, FooterComponent, ProductCardComponent, LoadingSpinnerComponent,
    EmptyStateComponent, ProductFilterComponent, ChatbotPage
  ]
})
export class ProductsPage implements OnInit {
  @ViewChild('filterModal') filterModal!: IonModal;
  
  products: Product[] = [];
  isLoading = true;
  searchTerm = '';
  category: string | null = null;
  sortBy = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  viewMode = 'grid'; // 'grid' or 'list'
  
  // Pagination
  lastVisible: any = null;
  moreProductsAvailable = true;
  loadingMore = false;
  
  // Filter options
  filterApplied = false;
  activeFilters: FilterOptions = {
    categories: [],
    brands: [],
    priceRange: { min: 0, max: 5000 },
    rating: 0,
    availability: false
  };
  
  // Available filter options (would typically come from API)
  availableCategories = [
    { id: 'mobile', name: 'Mobile Phones' },
    { id: 'tv', name: 'TV & Services' },
    { id: 'wearables', name: 'Wearables' },
    { id: 'accessories', name: 'Accessories' },
    { id: 'audio', name: 'Audio' },
    { id: 'computers', name: 'Computers' }
  ];
  
  availableBrands = [
    { id: 'apple', name: 'Apple' },
    { id: 'samsung', name: 'Samsung' },
    { id: 'google', name: 'Google' },
    { id: 'sony', name: 'Sony' },
    { id: 'lg', name: 'LG' },
    { id: 'xiaomi', name: 'Xiaomi' },
    { id: 'huawei', name: 'Huawei' },
    { id: 'microsoft', name: 'Microsoft' }
  ];
  
  constructor(
    private productService: ProductService,
    private cartService: CartService,
    public router: Router,
    private route: ActivatedRoute
  ) {
    addIcons({funnelOutline,closeCircleOutline,cartOutline,filterOutline,gridOutline,listOutline,arrowUpOutline,arrowDownOutline});
  }
  
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.searchTerm = params['search'] || '';
      this.category = params['category'] || null;
      
      // Reset pagination
      this.lastVisible = null;
      this.moreProductsAvailable = true;
      
      // Reset filters if navigating to a new category
      if (params['category'] && this.activeFilters.categories.length > 0 
          && !this.activeFilters.categories.includes(params['category'])) {
        this.resetFilters();
        this.activeFilters.categories = [params['category']];
        this.filterApplied = true;
      }
      
      // Load products
      this.loadProducts();
    });
  }
  
  loadProducts(event?: any) {
    if (this.searchTerm) {
      // Search for products
      this.isLoading = true;
      this.productService.searchProducts(this.searchTerm).subscribe(
        products => {
          this.products = this.applyFilters(products);
          this.isLoading = false;
          this.moreProductsAvailable = false; // No pagination for search results
          
          if (event) {
            event.target.complete();
          }
        },
        error => {
          console.error('Error searching products:', error);
          this.isLoading = false;
          if (event) {
            event.target.complete();
          }
        }
      );
    } else {
      // Load products with pagination
      if (event) {
        this.loadingMore = true;
      } else {
        this.isLoading = true;
        this.products = [];
      }
      
      this.productService.getProducts(
        this.category ?? undefined, 
        this.sortBy, 
        this.sortDirection, 
        10, 
        this.lastVisible// Continuation of src/app/features/products/products.page.ts
      ).subscribe(
        result => {
          const newProducts = this.applyFilters(result.products);
          
          if (event) {
            this.products = [...this.products, ...newProducts];
            this.loadingMore = false;
            event.target.complete();
          } else {
            this.products = newProducts;
            this.isLoading = false;
          }
          
          this.lastVisible = result.lastVisible;
          this.moreProductsAvailable = result.products.length === 10;
        },
        error => {
          console.error('Error loading products:', error);
          this.isLoading = false;
          this.loadingMore = false;
          if (event) {
            event.target.complete();
          }
        }
      );
    }
  }
  
  applyFilters(products: Product[]): Product[] {
    if (!this.filterApplied) {
      return products;
    }
    
    return products.filter(product => {
      // Filter by categories
      if (this.activeFilters.categories.length > 0 
          && !this.activeFilters.categories.includes(product.category)) {
        return false;
      }
      
      // Filter by brands
      if (this.activeFilters.brands.length > 0 
          && !this.activeFilters.brands.includes(product.brand.toLowerCase())) {
        return false;
      }
      
      // Filter by price range
      const price = product.salePrice || product.price;
      if (price < this.activeFilters.priceRange.min || price > this.activeFilters.priceRange.max) {
        return false;
      }
      
      // Filter by rating
      if (this.activeFilters.rating > 0 && product.rating < this.activeFilters.rating) {
        return false;
      }
      
      // Filter by availability
      if (this.activeFilters.availability && product.stock <= 0) {
        return false;
      }
      
      return true;
    });
  }
  
  changeSortBy(event: Event) {
    const select = event.target as HTMLIonSelectElement;
    this.sortBy = select.value;
    this.resetAndReloadProducts();
  }
  
  toggleSortDirection() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.resetAndReloadProducts();
  }
  
  toggleViewMode() {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }
  
  onFilterChange(filters: FilterOptions) {
    this.activeFilters = filters;
    this.filterApplied = true;
    this.resetAndReloadProducts();
    this.closeFilterModal();
  }
  
  resetFilters() {
    this.activeFilters = {
      categories: [],
      brands: [],
      priceRange: { min: 0, max: 5000 },
      rating: 0,
      availability: false
    };
    this.filterApplied = false;
    this.resetAndReloadProducts();
  }
  
  removeFilter(type: string, value?: string) {
    switch (type) {
      case 'category':
        if (value) {
          this.activeFilters.categories = this.activeFilters.categories.filter((c: string) => c !== value);
        }
        break;
      case 'brand':
        if (value) {
          this.activeFilters.brands = this.activeFilters.brands.filter((b: string) => b !== value);
        }
        break;
      case 'price':
        this.activeFilters.priceRange = { min: 0, max: 5000 };
        break;
      case 'rating':
        this.activeFilters.rating = 0;
        break;
      case 'availability':
        this.activeFilters.availability = false;
        break;
      case 'all':
        this.resetFilters();
        return;
    }
    
    this.filterApplied = this.hasActiveFilters();
    this.resetAndReloadProducts();
  }
  
  hasActiveFilters(): boolean {
    return (
      this.activeFilters.categories.length > 0 ||
      this.activeFilters.brands.length > 0 ||
      this.activeFilters.rating > 0 ||
      this.activeFilters.availability ||
      this.activeFilters.priceRange.min > 0 ||
      this.activeFilters.priceRange.max < 5000
    );
  }
  
  resetAndReloadProducts() {
    this.lastVisible = null;
    this.moreProductsAvailable = true;
    this.loadProducts();
  }
  
  onSearch(event: Event) {
    const searchbar = event.target as HTMLIonSearchbarElement;
    this.searchTerm = searchbar.value || '';
    this.resetAndReloadProducts();
  }
  
  addToCart(product: Product) {
    this.cartService.addToCart(product.id).subscribe(
      () => {
        // Success notification would be added here
      },
      error => {
        console.error('Error adding to cart:', error);
        // Error notification would be added here
      }
    );
  }
  
  openFilterModal() {
    this.filterModal.present();
  }
  
  closeFilterModal() {
    this.filterModal.dismiss();
  }
  
  getCategoryName(categoryId: string): string {
    const category = this.availableCategories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  }
  
  getBrandName(brandId: string): string {
    const brand = this.availableBrands.find(b => b.id === brandId);
    return brand ? brand.name : brandId;
  }
}