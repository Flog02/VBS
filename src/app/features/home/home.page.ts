import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonBadge, IonText,
  IonSearchbar, AnimationController, IonItem, IonInput } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowForwardOutline, searchOutline, phonePortraitOutline, tvOutline,
  watchOutline, headsetOutline, laptopOutline, flashOutline, storefront,
  chevronForwardOutline, mailOutline, callOutline, cubeOutline, shieldCheckmarkOutline, storefrontOutline, constructOutline, carOutline, locationOutline } from 'ionicons/icons';

import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component'; // ADD THIS IMPORT
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ChatbotPage } from 'src/app/shared/components/chatbot/chatbot.page';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { StoreLocationService } from '../../core/services/store-location.service';
import { Product } from '../../core/models/product.model';
import { StoreLocation } from '../../core/models/store-location.model';
import { FormsModule } from '@angular/forms';
// Import Swiper core and required modules
import { register } from 'swiper/element/bundle';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    IonContent,
    IonButton, IonIcon,
    IonSearchbar, IonItem, IonInput,
    HeaderComponent, FooterComponent, ProductCardComponent, LoadingSpinnerComponent // ADD FooterComponent HERE
],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // Add this for Swiper custom elements
})
export class HomePage implements OnInit {
  featuredProducts: Product[] = [];
  latestProducts: Product[] = [];
  bestsellingProducts: Product[] = [];
  storeLocations: StoreLocation[] = [];
  
  isLoadingFeatured = true;
  isLoadingLatest = true;
  isLoadingBestselling = true;
  isLoadingStores = true;
  
  searchQuery = '';
  
  // Hero Slider Options (for Swiper)
  heroSlideOpts = {
    slidesPerView: 1,
    spaceBetween: 0,
    speed: 800,
    autoplay: {
      delay: 5000,
    },
    loop: true,
    pagination: {
      clickable: true,
    }
  };
  
  // Product Slider Options (for Swiper)
  productSlideOpts = {
    slidesPerView: 1,
    spaceBetween: 10,
    loop: false,
    breakpoints: {
      // when window width is >= 576px
      576: {
        slidesPerView: 2,
        spaceBetween: 20,
      },
      // when window width is >= 768px
      768: {
        slidesPerView: 3,
        spaceBetween: 20,
      },
      // when window width is >= 992px
      992: {
        slidesPerView: 4,
        spaceBetween: 20,
      },
    }
  };
  
  // Categories
  categories = [
    { id: 'mobile', name: 'Mobile Phones', icon: 'phone-portrait-outline', color: '#4CAF50' },
    { id: 'tv', name: 'TV & Services', icon: 'tv-outline', color: '#2196F3' },
    { id: 'wearables', name: 'Wearables', icon: 'watch-outline', color: '#9C27B0' },
    { id: 'accessories', name: 'Accessories', icon: 'headset-outline', color: '#FF9800' },
    { id: 'audio', name: 'Audio', icon: 'headset-outline', color: '#F44336' },
    { id: 'computers', name: 'Computers', icon: 'laptop-outline', color: '#00BCD4' },
    { id: 'deals', name: 'Flash Deals', icon: 'flash-outline', color: '#E91E63' },
    { id: 'all', name: 'All Products', icon: 'cube-outline', color: '#607D8B' }
  ];
  
  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private storeLocationService: StoreLocationService,
    private animationCtrl: AnimationController,
    public router: Router
  ) {
    // Register Swiper custom elements
    register();
    
    // Add Ionicons
    addIcons({arrowForwardOutline,chevronForwardOutline,cubeOutline,flashOutline,shieldCheckmarkOutline,headsetOutline,storefrontOutline,constructOutline,carOutline,locationOutline,mailOutline,callOutline,searchOutline,phonePortraitOutline,tvOutline,watchOutline,laptopOutline,storefront});
  }
  
  ngOnInit() {
    this.loadFeaturedProducts();
    this.loadLatestProducts();
    this.loadBestsellingProducts();
    this.loadStoreLocations();
  }
  
  loadFeaturedProducts() {
    this.isLoadingFeatured = true;
    this.productService.getFeaturedProducts(8).subscribe(
      products => {
        this.featuredProducts = products;
        this.isLoadingFeatured = false;
      },
      error => {
        console.error('Error loading featured products:', error);
        this.isLoadingFeatured = false;
      }
    );
  }
  
  loadLatestProducts() {
    this.isLoadingLatest = true;
    this.productService.getProducts(undefined, 'createdAt', 'desc', 8).subscribe(
      result => {
        this.latestProducts = result.products;
        this.isLoadingLatest = false;
      },
      error => {
        console.error('Error loading latest products:', error);
        this.isLoadingLatest = false;
      }
    );
  }
  
  loadBestsellingProducts() {
    // In a real app, you would have a dedicated endpoint for bestselling products
    // For now, we'll just simulate it by getting products sorted by rating
    this.isLoadingBestselling = true;
    this.productService.getProducts(undefined, 'rating', 'desc', 8).subscribe(
      result => {
        this.bestsellingProducts = result.products;
        this.isLoadingBestselling = false;
      },
      error => {
        console.error('Error loading bestselling products:', error);
        this.isLoadingBestselling = false;
      }
    );
  }
  
  loadStoreLocations() {
    this.isLoadingStores = true;
    this.storeLocationService.getStoreLocations().subscribe(
      locations => {
        this.storeLocations = locations;
        this.isLoadingStores = false;
      },
      error => {
        console.error('Error loading store locations:', error);
        this.isLoadingStores = false;
      }
    );
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
  
  onSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/products'], { 
        queryParams: { search: this.searchQuery } 
      });
    }
  }
  
  navigateToCategory(categoryId: string) {
    if (categoryId === 'all') {
      this.router.navigate(['/products']);
    } else {
      this.router.navigate(['/products'], { 
        queryParams: { category: categoryId } 
      });
    }
  }
  
  getCategoryColor(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.color : '#cccccc';
  }
  
  formatCurrency(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }
}