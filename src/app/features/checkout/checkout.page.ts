// src/app/features/checkout/checkout.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonRadio, 
  IonRadioGroup, IonSelect, IonSelectOption, IonList, IonCheckbox, 
  IonListHeader, IonText, IonSpinner, IonAlert
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  cardOutline, cashOutline, locationOutline, homeOutline, 
  checkmarkCircleOutline, arrowForwardOutline, chevronForwardOutline
} from 'ionicons/icons';

import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { StoreLocationService } from '../../core/services/store-location.service';
import { Cart } from '../../core/models/cart.model';
import { User } from '../../core/models/user.model';
import { StoreLocation } from '../../core/models/store-location.model';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.page.html',
  styleUrls: ['./checkout.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, 
    IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonRadio, 
    IonRadioGroup, IonSelect, IonSelectOption, IonList, IonCheckbox, 
    IonListHeader, IonText, IonSpinner, IonAlert,
    HeaderComponent, FooterComponent, LoadingSpinnerComponent
  ]
})
export class CheckoutPage implements OnInit {
  checkoutForm!: FormGroup;
  isLoading = true;
  cart: Cart | null = null;
  user: User | null = null;
  storeLocations: StoreLocation[] = [];
  isProcessing = false;
  showSuccessAlert = false;
  orderNumber = '';
  
  // Countries for dropdown
  countries = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IT', name: 'Italy' },
    { code: 'ES', name: 'Spain' },
    { code: 'JP', name: 'Japan' },
    { code: 'CN', name: 'China' }
  ];
  
  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private cartService: CartService,
    private orderService: OrderService,
    private storeLocationService: StoreLocationService,
    private router: Router
  ) {
    addIcons({ 
      cardOutline, cashOutline, locationOutline, homeOutline, 
      checkmarkCircleOutline, arrowForwardOutline, chevronForwardOutline
    });
  }
  
  ngOnInit() {
    this.createForm();
    this.loadData();
  }
  
  createForm() {
    this.checkoutForm = this.formBuilder.group({
      // Delivery Method
      deliveryMethod: ['shipping', Validators.required],
      storeLocation: [''],
      
      // Shipping Address
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zip: ['', Validators.required],
      country: ['US', Validators.required],
      
      // Payment Method
      paymentMethod: ['credit_card', Validators.required],
      
      // Credit Card Details
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
      cardName: ['', Validators.required],
      expiryMonth: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
      expiryYear: ['', [Validators.required, Validators.pattern(/^\d{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
      
      // Terms
      termsAccepted: [false, Validators.requiredTrue]
    });
    
    // Add conditional validation
    this.checkoutForm.get('deliveryMethod')?.valueChanges.subscribe(method => {
      if (method === 'pickup') {
        this.checkoutForm.get('storeLocation')?.setValidators([Validators.required]);
        
        // Remove validators from shipping fields
        this.checkoutForm.get('address')?.clearValidators();
        this.checkoutForm.get('city')?.clearValidators();
        this.checkoutForm.get('state')?.clearValidators();
        this.checkoutForm.get('zip')?.clearValidators();
        this.checkoutForm.get('country')?.clearValidators();
      } else {
        this.checkoutForm.get('storeLocation')?.clearValidators();
        
        // Add validators to shipping fields
        this.checkoutForm.get('address')?.setValidators([Validators.required]);
        this.checkoutForm.get('city')?.setValidators([Validators.required]);
        this.checkoutForm.get('state')?.setValidators([Validators.required]);
        this.checkoutForm.get('zip')?.setValidators([Validators.required]);
        this.checkoutForm.get('country')?.setValidators([Validators.required]);
      }
      
      // Update validators
      this.checkoutForm.get('storeLocation')?.updateValueAndValidity();
      this.checkoutForm.get('address')?.updateValueAndValidity();
      this.checkoutForm.get('city')?.updateValueAndValidity();
      this.checkoutForm.get('state')?.updateValueAndValidity();
      this.checkoutForm.get('zip')?.updateValueAndValidity();
      this.checkoutForm.get('country')?.updateValueAndValidity();
    });
    
    this.checkoutForm.get('paymentMethod')?.valueChanges.subscribe(method => {
      if (method === 'credit_card') {
        this.checkoutForm.get('cardNumber')?.setValidators([Validators.required, Validators.pattern(/^\d{16}$/)]);
        this.checkoutForm.get('cardName')?.setValidators([Validators.required]);
        this.checkoutForm.get('expiryMonth')?.setValidators([Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]);
        this.checkoutForm.get('expiryYear')?.setValidators([Validators.required, Validators.pattern(/^\d{2}$/)]);
        this.checkoutForm.get('cvv')?.setValidators([Validators.required, Validators.pattern(/^\d{3,4}$/)]);
      } else {
        this.checkoutForm.get('cardNumber')?.clearValidators();
        this.checkoutForm.get('cardName')?.clearValidators();
        this.checkoutForm.get('expiryMonth')?.clearValidators();
        this.checkoutForm.get('expiryYear')?.clearValidators();
        this.checkoutForm.get('cvv')?.clearValidators();
      }
      
      // Update validators
      this.checkoutForm.get('cardNumber')?.updateValueAndValidity();
      this.checkoutForm.get('cardName')?.updateValueAndValidity();
      this.checkoutForm.get('expiryMonth')?.updateValueAndValidity();
      this.checkoutForm.get('expiryYear')?.updateValueAndValidity();
      this.checkoutForm.get('cvv')?.updateValueAndValidity();
    });
  }
  
  loadData() {
    this.isLoading = true;
    
    // Load user data
    this.authService.currentUser$.subscribe(
      user => {
        this.user = user;
        
        if (user) {
          // Populate form with user data
          this.checkoutForm.patchValue({
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            email: user.email || '',
            phone: user.phoneNumber || '',
            
            // Address if available
            address: user.address?.street || '',
            city: user.address?.city || '',
            state: user.address?.state || '',
            zip: user.address?.zip || '',
            country: user.address?.country || 'US'
          });
        } else {
          // Redirect to login if not logged in
          this.router.navigate(['/auth/login'], { 
            queryParams: { returnUrl: '/checkout' } 
          });
        }
      }
    );
    
    // Load cart data
    this.cartService.cart$.subscribe(
      cart => {
        this.cart = cart;
        
        if (!cart || cart.items.length === 0) {
          // Redirect to cart if empty
          this.router.navigate(['/cart']);
        }
        
        this.isLoading = false;
      },
      error => {
        console.error('Error loading cart:', error);
        this.isLoading = false;
      }
    );
    
    // Load store locations
    this.storeLocationService.getStoreLocations().subscribe(
        // Continuation of src/app/features/checkout/checkout.page.ts
      locations => {
        this.storeLocations = locations;
        
        // Set default store location if available
        if (locations.length > 0) {
          this.checkoutForm.patchValue({
            storeLocation: locations[0].id
          });
        }
      },
      error => {
        console.error('Error loading store locations:', error);
      }
    );
  }
  
  onSubmit() {
    if (this.checkoutForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.checkoutForm.controls).forEach(key => {
        const control = this.checkoutForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    
    this.isProcessing = true;
    
    const formData = this.checkoutForm.value;
    const isPickup = formData.deliveryMethod === 'pickup';
    
    // Create shipping address object if not pickup
    const shippingAddress = !isPickup ? {
      street: formData.address,
      city: formData.city,
      state: formData.state,
      zip: formData.zip,
      country: formData.country
    } : undefined;
    
    // Process order
    this.orderService.createOrder(
      formData.paymentMethod,
      isPickup,
      isPickup ? formData.storeLocation : undefined,
      shippingAddress
    ).subscribe(
      orderId => {
        this.isProcessing = false;
        this.orderNumber = orderId;
        this.showSuccessAlert = true;
      },
      error => {
        console.error('Error creating order:', error);
        this.isProcessing = false;
        // Show error message
        alert('There was an error processing your order. Please try again.');
      }
    );
  }
  
  getStoreLocationName(id: string): string {
    const store = this.storeLocations.find(s => s.id === id);
    return store ? store.name : '';
  }
  
  getTaxAmount(): number {
    return (this.cart?.subtotal || 0) * 0.1; // 10% tax
  }
  
  getTotalAmount(): number {
    return (this.cart?.subtotal || 0) * 1.1; // Subtotal + 10% tax
  }
  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  navigateToOrderConfirmation() {
    this.router.navigate(['/orders', this.orderNumber]);
  }
  
  // Convenience getter for form fields
  get f() { return this.checkoutForm.controls; }
}