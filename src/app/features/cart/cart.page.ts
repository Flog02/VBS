// src/app/features/cart/cart.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonItem, IonLabel, IonInput,
  IonThumbnail, IonSelect, IonSelectOption, IonList, IonAlert
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  trashOutline, addOutline, removeOutline, cartOutline, arrowForwardOutline
} from 'ionicons/icons';

import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { Cart, CartItem } from '../../core/models/cart.model';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonButton, IonIcon, IonGrid, IonRow, IonCol, IonItem, IonLabel, IonInput,
    IonThumbnail, IonSelect, IonSelectOption, IonList, IonAlert,
    HeaderComponent, FooterComponent, LoadingSpinnerComponent, EmptyStateComponent
  ]
})
export class CartPage implements OnInit {
  cart: Cart | null = null;
  isLoading = true;
  quantities: number[] = Array.from({ length: 10 }, (_, i) => i + 1);
  
  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ 
      trashOutline, addOutline, removeOutline, cartOutline, arrowForwardOutline
    });
  }
  
  ngOnInit() {
    this.loadCart();
  }
  
  loadCart() {
    this.isLoading = true;
    
    this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      if (!isLoggedIn) {
        this.isLoading = false;
        this.router.navigate(['/auth/login'], { 
          queryParams: { returnUrl: '/cart' } 
        });
        return;
      }
      
      this.cartService.cart$.subscribe(
        cart => {
          this.cart = cart;
          this.isLoading = false;
        },
        error => {
          console.error('Error loading cart:', error);
          this.isLoading = false;
        }
      );
    });
  }
  
  updateQuantity(item: CartItem, newQuantity: number) {
    this.cartService.updateCartItemQuantity(item.productId, newQuantity).subscribe(
      () => {
        // Success, cart will update automatically via the cart$ observable
      },
      error => {
        console.error('Error updating quantity:', error);
        // Display error message
      }
    );
  }
  
  decreaseQuantity(item: CartItem) {
    if (item.quantity > 1) {
      this.updateQuantity(item, item.quantity - 1);
    }
  }
  
  increaseQuantity(item: CartItem) {
    if (item.quantity < item.stock) {
      this.updateQuantity(item, item.quantity + 1);
    }
  }
  
  removeItem(item: CartItem) {
    this.cartService.removeFromCart(item.productId).subscribe(
      () => {
        // Success, cart will update automatically
      },
      error => {
        console.error('Error removing item:', error);
      }
    );
  }
  
  clearCart() {
    this.cartService.clearCart().subscribe(
      () => {
        // Success, cart will update automatically
      },
      error => {
        console.error('Error clearing cart:', error);
      }
    );
  }
  
  proceedToCheckout() {
    if (!this.cart || this.cart.items.length === 0) {
      return;
    }
    
    this.router.navigate(['/checkout']);
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