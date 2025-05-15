import { Component, OnInit } from '@angular/core';
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
  IonSearchbar,
  IonMenu,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonAvatar,
  IonChip
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  cartOutline, 
  personOutline, 
  heartOutline, 
  searchOutline,
  homeOutline,
  gridOutline,
  locationOutline,
  chatbubbleOutline,
  logOutOutline,
  settingsOutline, bagOutline, logInOutline } from 'ionicons/icons';

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
    IonSearchbar,
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
  searchTerm = '';
  currentUser: User | null = null;
  cartItemsCount = 0;
  wishlistItemsCount = 0;
  isAdmin = false;

  constructor(
    public router: Router,
    private authService: AuthService,
    private cartService: CartService,
    private wishlistService: WishlistService
  ) {
    addIcons({heartOutline,cartOutline,personOutline,homeOutline,gridOutline,locationOutline,chatbubbleOutline,bagOutline,settingsOutline,logOutOutline,logInOutline,searchOutline});
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

  onSearch() {
    if (this.searchTerm.trim()) {
      this.router.navigate(['/products'], { 
        queryParams: { search: this.searchTerm } 
      });
      this.searchTerm = '';
    }
  }

  navigateToAuth() {
    if (this.currentUser) {
      this.router.navigate(['/profile']);
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/']);
    });
  }

  goToAdmin() {
    this.router.navigate(['/admin']);
  }
}