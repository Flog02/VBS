//src/app/features/product-detail/product-detail.page.ts

import { Component, OnInit, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonText, IonBadge, IonChip,
  IonLabel, IonSegment, IonSegmentButton,
  IonAccordionGroup, IonAccordion, IonItem,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  cartOutline, heartOutline, heart, informationCircleOutline,
  starOutline, shareOutline, cubeOutline, chevronForwardOutline
} from 'ionicons/icons';

import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { Product3dViewerComponent } from '../../shared/components/product-3d-viewer/product-3d-viewer.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { Product, ProductSpecification } from '../../core/models/product.model';
import { ChatbotPage } from 'src/app/shared/components/chatbot/chatbot.page';
import { register } from 'swiper/element/bundle';
import { Swiper } from 'swiper';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.page.html',
  styleUrls: ['./product-detail.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    RouterModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonButton, IonIcon, IonGrid, IonRow, IonCol, IonText, IonBadge, IonChip,
    IonLabel, IonSegment, IonSegmentButton,
    IonAccordionGroup, IonAccordion, IonItem,
    HeaderComponent, FooterComponent, LoadingSpinnerComponent, 
    Product3dViewerComponent, ProductCardComponent, ChatbotPage
  ]
})
export class ProductDetailPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('productSlides') swiperElement: ElementRef | undefined;
  private swiper: Swiper | undefined;
  private subscriptions: Subscription[] = [];
  
  // Add activeSlideIndex property
  activeSlideIndex = 0;
  
  product: Product | null = null;
  isLoading = true;
  quantity = 1;
  selectedSegment = 'details';
  isInWishlist = false;
  isLoggedIn = false;
  relatedProducts: Product[] = [];
  loadingRelated = false;
  
  // Slider options
  slideOpts = {
    slidesPerView: 1,
    spaceBetween: 0,
    zoom: true,
    pagination: true,
    on: {
      slideChange: () => {
        if (this.swiper) {
          this.activeSlideIndex = this.swiper.activeIndex;
        }
      }
    }
  };
  
  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private wishlistService: WishlistService,
    private authService: AuthService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {
    // Register Swiper custom elements
    register();
    
    addIcons({ 
      cartOutline, heartOutline, heart, informationCircleOutline,
      starOutline, shareOutline, cubeOutline, chevronForwardOutline
    });
  }
  
  ngOnInit() {
    this.loadProduct();
    
    // Subscribe to auth state
    const authSub = this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
      this.cdr.detectChanges();
    });
    this.subscriptions.push(authSub);
  }
  
  ngAfterViewInit() {
    // Initialize Swiper after view is initialized
    setTimeout(() => {
      if (this.swiperElement?.nativeElement) {
        this.swiper = this.swiperElement.nativeElement.swiper;
        
        // Listen for Swiper events
        this.swiperElement.nativeElement.addEventListener('swiper-slide-change', () => {
          if (this.swiper) {
            this.activeSlideIndex = this.swiper.activeIndex;
          }
        });
      }
    }, 500); // Small delay to ensure Swiper is properly initialized
  }
  
  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  // Add slideTo method
  slideTo(index: number) {
    if (this.swiper) {
      this.swiper.slideTo(index);
    }
  }
  
  /**
   * Safely get product specifications with proper typing
   */
  getProductSpecifications(): ProductSpecification {
    if (this.product && this.product.specifications) {
      return this.product.specifications;
    }
    return {};
  }

  /**
   * Convert specification value to an object for keyvalue pipe
   */
  getSpecificationDetails(value: any): { [key: string]: string } {
    if (typeof value === 'object' && value !== null) {
      return value as { [key: string]: string };
    }
    return {};
  }

  /**
   * Check if a value is an object
   */
  isObject(val: any): boolean {
    return typeof val === 'object' && val !== null;
  }
  
  loadProduct() {
    this.isLoading = true;
    const productId = this.route.snapshot.paramMap.get('id');
    
    if (!productId) {
      this.router.navigate(['/products']);
      return;
    }
    
    this.productService.getProductById(productId).subscribe(
      product => {
        this.product = product;
        this.isLoading = false;
        
        // Check if product is in wishlist
        if (this.isLoggedIn) {
          const wishlistSub = this.wishlistService.isInWishlist(productId).subscribe(isInWishlist => {
            console.log(`Product ${productId} wishlist status:`, isInWishlist);
            this.isInWishlist = isInWishlist;
            this.cdr.detectChanges();
          });
          this.subscriptions.push(wishlistSub);
        }
        
        // Load related products
        this.loadRelatedProducts(product.category);
      },
      error => {
        console.error('Error loading product:', error);
        this.isLoading = false;
        this.router.navigate(['/products']);
      }
    );
  }
  
  loadRelatedProducts(category: string) {
    this.loadingRelated = true;
    this.productService.getProducts(category, 'createdAt', 'desc', 4).subscribe(
      result => {
        // Filter out current product and limit to max 4 products
        this.relatedProducts = result.products
          .filter(p => p.id !== this.product?.id)
          .slice(0, 4);
        this.loadingRelated = false;
      },
      error => {
        console.error('Error loading related products:', error);
        this.loadingRelated = false;
      }
    );
  }
  
  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
  }
  
  decreaseQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }
  
  increaseQuantity() {
    if (this.product && this.quantity < this.product.stock) {
      this.quantity++;
    }
  }
  
  async addToCart() {
    if (!this.product) return;
    
    if (!this.isLoggedIn) {
      this.router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: `/products/${this.product.id}` } 
      });
      return;
    }
    
    if (this.product.stock <= 0) {
      await this.showToast('❌ Product out of stock', 'danger');
      return;
    }
    
    try {
      // Add to cart with specified quantity
      for (let i = 0; i < this.quantity; i++) {
        await this.cartService.addToCart(this.product.id).toPromise();
      }
      
      await this.showToast(`✅ Added ${this.quantity} item(s) to cart!`, 'success');
    } catch (error) {
      console.error('Error adding to cart:', error);
      await this.showToast('❌ Error adding to cart', 'danger');
    }
  }
  
  buyNow() {
    this.addToCart();
    this.router.navigate(['/cart']);
  }
  
  async toggleWishlist() {
    if (!this.product) return;
    
    console.log('Toggle wishlist clicked for product:', this.product.id);
    console.log('Current wishlist status before toggle:', this.isInWishlist);
    
    if (!this.isLoggedIn) {
      this.router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: `/products/${this.product.id}` } 
      });
      return;
    }
    
    // Store the current state to show accurate message
    const wasInWishlist = this.isInWishlist;
    
    try {
      // Call the toggle service
      await this.wishlistService.toggleWishlistItem(this.product.id).toPromise();
      
      // Wait a moment for the service to update
      setTimeout(() => {
        // Check the new state from the service
        const checkStateSub = this.wishlistService.isInWishlist(this.product!.id).subscribe(newState => {
          console.log('New wishlist status after toggle:', newState);
          this.isInWishlist = newState;
          this.cdr.detectChanges();
          
          // Show accurate toast based on actual state change
          if (wasInWishlist && !newState) {
            // Was in wishlist, now removed
            this.showToast('💔 Removed from wishlist', 'medium');
          } else if (!wasInWishlist && newState) {
            // Was not in wishlist, now added
            this.showToast('💖 Added to wishlist!', 'success');
          } else if (wasInWishlist && newState) {
            // Was already in wishlist, still there (shouldn't happen)
            this.showToast('💖 Already in wishlist', 'medium');
          } else {
            // Fallback message
            this.showToast(newState ? '💖 Added to wishlist!' : '💔 Removed from wishlist', newState ? 'success' : 'medium');
          }
        });
        
        // Unsubscribe immediately after getting the value
        setTimeout(() => checkStateSub.unsubscribe(), 100);
      }, 100);
      
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      await this.showToast('❌ Error updating wishlist', 'danger');
    }
  }
  
  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
  
  shareProduct() {
    if (!this.product) return;
    
    if (navigator.share) {
      navigator.share({
        title: this.product.name,
        text: `Check out this ${this.product.name} on VBS Electronics`,
        url: window.location.href
      })
      .catch(error => console.log('Error sharing:', error));
    } else {
      // Fallback for browsers that don't support the Web Share API
      // Could show a modal with share options or copy link to clipboard
      const tempInput = document.createElement('input');
      document.body.appendChild(tempInput);
      tempInput.value = window.location.href;
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      
      // Show notification
      this.showToast('🔗 Link copied to clipboard', 'success');
    }
  }
  
  getDiscountPercentage(): number {
    if (!this.product) return 0;
    
    if (this.product.salePrice && this.product.price > this.product.salePrice) {
      return Math.round(((this.product.price - this.product.salePrice) / this.product.price) * 100);
    }
    return 0;
  }
  
  async addRelatedToCart(product: Product) {
    try {
      await this.cartService.addToCart(product.id).toPromise();
      await this.showToast('✅ Added to cart!', 'success');
    } catch (error) {
      console.error('Error adding to cart:', error);
      await this.showToast('❌ Error adding to cart', 'danger');
    }
  }
  
  // Helper method to get heart icon name
  getHeartIcon(): string {
    return this.isInWishlist ? 'heart' : 'heart-outline';
  }
  
  // Helper method to get wishlist button text
  getWishlistButtonText(): string {
    return this.isInWishlist ? 'Added to Wishlist' : 'Add to Wishlist';
  }
  
  // Helper method to get wishlist button color
  getWishlistButtonColor(): string {
    return this.isInWishlist ? 'danger' : 'medium';
  }
}