// src/app/features/wishlist/wishlist.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, IonText, IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  heartOutline, trashOutline, cartOutline, eyeOutline
} from 'ionicons/icons';

import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { WishlistService } from '../../core/services/wishlist.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-wishlist',
  templateUrl: './wishlist.page.html',
  styleUrls: ['./wishlist.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, 
    IonCardTitle, IonCardContent, IonText, IonBadge,
    HeaderComponent, FooterComponent, LoadingSpinnerComponent, 
    EmptyStateComponent, ProductCardComponent
  ]
})
export class WishlistPage implements OnInit {
  wishlistProducts: Product[] = [];
  isLoading = true;
  
  constructor(
    private wishlistService: WishlistService,
    private cartService: CartService,
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ 
      heartOutline, trashOutline, cartOutline, eyeOutline
    });
  }
  
  ngOnInit() {
    this.loadWishlist();
  }
  
  loadWishlist() {
    this.isLoading = true;
    
    this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      if (!isLoggedIn) {
        this.isLoading = false;
        this.router.navigate(['/auth/login'], { 
          queryParams: { returnUrl: '/wishlist' } 
        });
        return;
      }
      
      this.wishlistService.wishlistProducts$.subscribe(
        products => {
          this.wishlistProducts = products;
          this.isLoading = false;
        },
        error => {
          console.error('Error loading wishlist:', error);
          this.isLoading = false;
        }
      );
    });
  }
  
  removeFromWishlist(product: Product) {
    this.wishlistService.toggleWishlistItem(product.id).subscribe(
      () => {
        // Will be updated automatically through wishlistProducts$ observable
      },
      error => {
        console.error('Error removing from wishlist:', error);
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
      }
    );
  }
  
  clearWishlist() {
    this.wishlistService.clearWishlist().subscribe(
      () => {
        // Will be updated automatically
      },
      error => {
        console.error('Error clearing wishlist:', error);
      }
    );
  }
  
  continueShopping() {
    this.router.navigate(['/products']);
  }
  
  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }
}