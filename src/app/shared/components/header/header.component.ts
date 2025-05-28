// src/app/shared/components/header/header.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
   IonHeader,
   IonToolbar,
   IonTitle,
   IonButtons,
   IonButton,
   IonIcon,
   IonBadge,
  // IonSearchbar, // REMOVED - no longer needed
  IonMenu,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonAvatar,
  IonChip,
  MenuController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
   cartOutline,
   personOutline,
   heartOutline,
   // searchOutline, // REMOVED - no longer needed
  homeOutline,
  gridOutline,
  locationOutline,
  chatbubbleOutline,
  logOutOutline,
  settingsOutline,
   bagOutline,
   logInOutline
} from 'ionicons/icons';

import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonBadge,
    // IonSearchbar, // REMOVED
    IonMenu,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonAvatar,
    IonChip
  ]
})
export class HeaderComponent implements OnInit {
  // searchTerm = ''; // REMOVED - no longer needed
  currentUser: User | null = null;
  cartItemsCount = 0;
  wishlistItemsCount = 0;
  isAdmin = false;
  
  // Use inject pattern for MenuController
  private menuCtrl = inject(MenuController);

  constructor(
    public router: Router,
    private authService: AuthService,
    private cartService: CartService,
    private wishlistService: WishlistService
  ) {
    addIcons({
      heartOutline,
      cartOutline,
      personOutline,
      homeOutline,
      gridOutline,
      locationOutline,
      chatbubbleOutline,
      bagOutline,
      settingsOutline,
      logOutOutline,
      logInOutline
      // searchOutline // REMOVED
    });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = user?.role === 'admin';
    });

    this.cartService.cartItemsCount$.subscribe(count => {
      this.cartItemsCount = count;
    });

    this.wishlistService.wishlistItemsCount$.subscribe(count => {
      this.wishlistItemsCount = count;
    });
  }

  async navigateTo(path: string) {
    // Close the menu before navigation
    await this.menuCtrl.close();
    
    // Navigate to the specified path
    this.router.navigateByUrl(path);
  }

  // REMOVED: onSearch() method - no longer needed

  async navigateToAuth() {
    await this.menuCtrl.close();
    
    if (this.currentUser) {
      this.router.navigate(['/profile']);
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  async logout() {
    await this.menuCtrl.close();
    
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/']);
    });
  }

  async goToAdmin() {
    await this.menuCtrl.close();
    this.router.navigate(['/admin']);
  }
}