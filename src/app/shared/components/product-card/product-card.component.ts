// src/app/shared/components/product-card/product-card.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
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
  AnimationController
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
export class ProductCardComponent implements OnInit {
  @Input() product!: Product;
  @Output() addToCartClicked = new EventEmitter<Product>();
  
  isInWishlist = false;
  isLoggedIn = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private cartService: CartService,
    private wishlistService: WishlistService,
    private animationCtrl: AnimationController
  ) {
    addIcons({ 
      cartOutline, 
      heartOutline, 
      heart, 
      eyeOutline 
    });
  }

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
      
      if (isLoggedIn) {
        this.wishlistService.isInWishlist(this.product.id).subscribe(isInWishlist => {
          this.isInWishlist = isInWishlist;
        });
      }
    });
  }

  navigateToProduct() {
    this.router.navigate(['/products', this.product.id]);
  }

  addToCart(event: Event) {
    event.stopPropagation();
    
    if (this.product.stock <= 0) {
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
      this.cartService.addToCart(this.product.id).subscribe(
        () => {
          // Success notification would be added here
        },
        error => {
          console.error('Error adding to cart:', error);
          // Error notification would be added here
        }
      );
    } else {
      this.router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: `/products/${this.product.id}` } 
      });
    }
  }

  toggleWishlist(event: Event) {
    event.stopPropagation();
    
    if (!this.isLoggedIn) {
      this.router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: `/products/${this.product.id}` } 
      });
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
          { offset: 0.5, transform: 'scale(1.2)' },
          { offset: 1, transform: 'scale(1)' }
        ]);
        
      animation.play();
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

  getDiscountPercentage(): number {
    if (this.product.salePrice && this.product.price > this.product.salePrice) {
      return Math.round(((this.product.price - this.product.salePrice) / this.product.price) * 100);
    }
    return 0;
  }
}