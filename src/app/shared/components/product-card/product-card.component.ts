// src/app/shared/components/product-card/product-card.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardSubtitle, 
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonText,
  AnimationController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  cartOutline, 
  heartOutline, 
  heart, 
  eyeOutline
} from 'ionicons/icons';
import { Product } from '../../../core/models/product.model';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { Subscription, combineLatest, of } from 'rxjs';
import { switchMap, distinctUntilChanged, tap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonText
  ]
})
export class ProductCardComponent implements OnInit, OnDestroy {
  @Input() product!: Product;
  @Output() addToCartClicked = new EventEmitter<Product>();
  
  isInWishlist = false;
  isLoggedIn = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private cartService: CartService,
    private wishlistService: WishlistService,
    private animationCtrl: AnimationController,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ 
      cartOutline, 
      heartOutline, 
      heart, 
      eyeOutline 
    });
  }

  ngOnInit() {
    // Fixed: Use combineLatest to properly handle auth and wishlist state
    const authAndWishlistSub = this.authService.isLoggedIn$.pipe(
      distinctUntilChanged(),
      switchMap(isLoggedIn => {
        this.isLoggedIn = isLoggedIn;
        
        if (isLoggedIn && this.product?.id) {
          // Return wishlist status observable
          return this.wishlistService.isInWishlist(this.product.id).pipe(
            distinctUntilChanged(),
            tap(isInWishlist => {
              console.log(`Product ${this.product.id} wishlist status:`, isInWishlist);
            })
          );
        } else {
          // Return false if not logged in
          return of(false);
        }
      }),
      catchError(error => {
        console.error('Error checking wishlist status:', error);
        return of(false);
      })
    ).subscribe(isInWishlist => {
      this.isInWishlist = isInWishlist;
      this.cdr.detectChanges();
    });
    
    this.subscriptions.push(authAndWishlistSub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  navigateToProduct() {
    this.router.navigate(['/products', this.product.id]);
  }

  async addToCart(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.product.stock <= 0) {
      await this.showToast('❌ Product out of stock', 'danger');
      return;
    }
    
    // Animated effect
    const target = event.target as HTMLElement;
    const button = target.closest('ion-button');
    
    if (button) {
      const animation = this.animationCtrl.create()
        .addElement(button)
        .duration(300)
        .keyframes([
          { offset: 0, transform: 'scale(1)' },
          { offset: 0.5, transform: 'scale(0.9)' },
          { offset: 1, transform: 'scale(1)' }
        ]);
        
      animation.play();
    }
    
    this.addToCartClicked.emit(this.product);
    
    if (this.isLoggedIn) {
      try {
        await this.cartService.addToCart(this.product.id).toPromise();
        await this.showToast('✅ Added to cart!', 'success');
      } catch (error) {
        console.error('Error adding to cart:', error);
        await this.showToast('❌ Error adding to cart', 'danger');
      }
    } else {
      this.router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: `/products/${this.product.id}` } 
      });
    }
  }

  async toggleWishlist(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Toggle wishlist clicked for product:', this.product.id);
    console.log('Current wishlist status before toggle:', this.isInWishlist);
    
    if (!this.isLoggedIn) {
      this.router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: `/products/${this.product.id}` } 
      });
      return;
    }
    
    // Store the current state for better UX
    const wasInWishlist = this.isInWishlist;
    
    // Optimistic update for better UX
    this.isInWishlist = !wasInWishlist;
    this.cdr.detectChanges();
    
    // Animated effect
    const target = event.target as HTMLElement;
    const button = target.closest('ion-button');
    
    if (button) {
      const animation = this.animationCtrl.create()
        .addElement(button)
        .duration(300)
        .keyframes([
          { offset: 0, transform: 'scale(1)' },
          { offset: 0.5, transform: 'scale(1.2)' },
          { offset: 1, transform: 'scale(1)' }
        ]);
        
      animation.play();
    }
    
    try {
      // Fixed: Properly handle the toggle operation
      await this.wishlistService.toggleWishlistItem(this.product.id).toPromise();
      
      // Show appropriate message based on the action
      if (wasInWishlist) {
        await this.showToast('💔 Removed from wishlist', 'medium');
      } else {
        await this.showToast('💖 Added to wishlist!', 'success');
      }
      
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      
      // Revert optimistic update on error
      this.isInWishlist = wasInWishlist;
      this.cdr.detectChanges();
      
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

  getDiscountPercentage(): number {
    if (this.product.salePrice && this.product.price > this.product.salePrice) {
      return Math.round(((this.product.price - this.product.salePrice) / this.product.price) * 100);
    }
    return 0;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }

  getHeartIcon(): string {
    return this.isInWishlist ? 'heart' : 'heart-outline';
  }

  getHeartColor(): string {
    return this.isInWishlist ? '#dc3545' : '#6c757d';
  }
}