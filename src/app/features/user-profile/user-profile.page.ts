// src/app/features/user-profile/user-profile.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonTabs, 
  IonTabBar, IonTabButton, IonBadge, IonSegment, IonSegmentButton,
  IonSpinner, IonText, IonAlert
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  personOutline, mailOutline, lockClosedOutline, callOutline, 
  homeOutline, locationOutline, saveOutline, logOutOutline,
  cartOutline, bagOutline, starOutline, heartOutline
} from 'ionicons/icons';

import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { User } from '../../core/models/user.model';
import { Order } from '../../core/models/order.model';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.page.html',
  styleUrls: ['./user-profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, 
    IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonTabs, 
    IonTabBar, IonTabButton, IonBadge, IonSegment, IonSegmentButton,
    IonSpinner, IonText, IonAlert,
    HeaderComponent, FooterComponent, LoadingSpinnerComponent, EmptyStateComponent
  ]
})
export class UserProfilePage implements OnInit {
  selectedSegment = 'profile';
  user: User | null = null;
  isLoading = true;
  isSaving = false;
  successMessage = '';
  errorMessage = '';
  
  // Profile form
  profileForm!: FormGroup;
  
  // Password change form
  passwordForm!: FormGroup;
  showOldPassword = false;
  showNewPassword = false;
  
  // Order history
  orders: Order[] = [];
  isLoadingOrders = false;
  
  // Logout confirmation
  showLogoutAlert = false;
  
  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private orderService: OrderService,
    private wishlistService: WishlistService,
    private router: Router
  ) {
    addIcons({ 
      personOutline, mailOutline, lockClosedOutline, callOutline, 
      homeOutline, locationOutline, saveOutline, logOutOutline,
      cartOutline, bagOutline, starOutline, heartOutline
    });
  }
  
  ngOnInit() {
    this.createForms();
    this.loadUserProfile();
  }
  
  createForms() {
    // Profile form
    this.profileForm = this.formBuilder.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      email: [{ value: '', disabled: true }],
      phoneNumber: [''],
      address: this.formBuilder.group({
        street: [''],
        city: [''],
        state: [''],
        zip: [''],
        country: ['']
      })
    });
    
    // Password change form
    this.passwordForm = this.formBuilder.group({
      oldPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }
  
  // Custom validator for password matching
  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (newPassword !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    } else {
      form.get('confirmPassword')?.setErrors(null);
    }
    
    return null;
  }
  
  loadUserProfile() {
    this.isLoading = true;
    
    this.authService.currentUser$.subscribe(
      user => {
        this.user = user;
        
        if (user) {
          // Populate profile form
          this.profileForm.patchValue({
            displayName: user.displayName || '',
            email: user.email,
            phoneNumber: user.phoneNumber || '',
            address: {
              street: user.address?.street || '',
              city: user.address?.city || '',
              state: user.address?.state || '',
              zip: user.address?.zip || '',
              country: user.address?.country || ''
            }
          });
        } else {
          // If not logged in, redirect to login
          this.router.navigate(['/auth/login']);
        }
        
        this.isLoading = false;
      },
      error => {
        console.error('Error loading user profile:', error);
        this.isLoading = false;
      }
    );
  }
  
  loadOrderHistory() {
    if (this.selectedSegment !== 'orders') return;
    
    this.isLoadingOrders = true;
    
    this.orderService.getOrdersByUser().subscribe(
      orders => {
        this.orders = orders;
        this.isLoadingOrders = false;
      },
      error => {
        console.error('Error loading orders:', error);
        this.isLoadingOrders = false;
      }
    );
  }
  
  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
    
    // Clear messages when switching tabs
    this.successMessage = '';
    this.errorMessage = '';
    
    if (this.selectedSegment === 'orders') {
      this.loadOrderHistory();
    }
  }
  
  updateProfile() {
    if (this.profileForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.profileForm.controls).forEach(key => {
        const control = this.profileForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    
    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';
    
    const profileData = {
      displayName: this.profileForm.value.displayName,
      phoneNumber: this.profileForm.value.phoneNumber,
      address: this.profileForm.value.address
    };
    
    this.authService.updateUserProfile(profileData).subscribe(
      () => {
        this.isSaving = false;
        this.successMessage = 'Profile updated successfully';
      },
      error => {
        console.error('Error updating profile:', error);
        this.isSaving = false;
        this.errorMessage = 'An error occurred while updating your profile. Please try again.';
      }
    );
  }
  
  changePassword() {
    if (this.passwordForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.passwordForm.controls).forEach(key => {
        const control = this.passwordForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    
    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';
    
    // In a real app, you would call a service to change the password
    // For demo purposes, we'll just show a success message
    setTimeout(() => {
      this.isSaving = false;
      this.successMessage = 'Password changed successfully';
      this.passwordForm.reset();
    }, 1500);
  }
  
  confirmLogout() {
    this.showLogoutAlert = true;
  }
  
  logout() {
    this.authService.logout().subscribe();
  }
  
  cancelLogout() {
    this.showLogoutAlert = false;
  }
  
  toggleOldPasswordVisibility() {
    this.showOldPassword = !this.showOldPassword;
  }
  
  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }
  
  // Convenience getters for easy access to form fields
  get pf() { return this.profileForm.controls; }
  get passf() { return this.passwordForm.controls; }
  get addressControls() { return (this.profileForm.get('address') as FormGroup).controls; }
  
  formatDate(date: any): string {
    if (!date) return '';
    
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  }
  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  getOrderStatusClass(status: Order['status']): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'shipped':
        return 'status-shipped';
      case 'ready-for-pickup':
        return 'status-ready';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }
}