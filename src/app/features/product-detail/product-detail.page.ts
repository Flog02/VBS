import { Component, OnInit, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonText, IonBadge, IonChip,
  IonLabel, IonSegment, IonSegmentButton,
  IonAccordionGroup, IonAccordion, IonItem
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
export class ProductDetailPage implements OnInit, AfterViewInit {
  @ViewChild('productSlides') swiperElement: ElementRef | undefined;
  private swiper: Swiper | undefined;
  
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
    private authService: AuthService
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
    
    this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
    });
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
          this.wishlistService.isInWishlist(productId).subscribe(isInWishlist => {
            this.isInWishlist = isInWishlist;
          });
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
  
  addToCart() {
    if (!this.product) return;
    
    if (!this.isLoggedIn) {
      this.router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: `/products/${this.product.id}` } 
      });
      return;
    }
    
    // Add to cart with specified quantity
    for (let i = 0; i < this.quantity; i++) {
      this.cartService.addToCart(this.product.id).subscribe(
        () => {
          if (i === this.quantity - 1) {
            // Success notification would be added here
          }
        },
        error => {
          console.error('Error adding to cart:', error);
          // Error notification would be added here
        }
      );
    }
  }
  
  buyNow() {
    this.addToCart();
    this.router.navigate(['/cart']);
  }
  
  toggleWishlist() {
    if (!this.product) return;
    
    if (!this.isLoggedIn) {
      this.router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: `/products/${this.product.id}` } 
      });
      return;
    }
    
    this.wishlistService.toggleWishlistItem(this.product.id).subscribe(
      () => {
        this.isInWishlist = !this.isInWishlist;
      },
      error => {
        console.error('Error toggling wishlist:', error);
      }
    );
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
      
      // Show notification (would be replaced with a proper notification system)
      alert('Link copied to clipboard');
    }
  }
  
  getDiscountPercentage(): number {
    if (!this.product) return 0;
    
    if (this.product.salePrice && this.product.price > this.product.salePrice) {
      return Math.round(((this.product.price - this.product.salePrice) / this.product.price) * 100);
    }
    return 0;
  }
  
  addRelatedToCart(product: Product) {
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
  

}