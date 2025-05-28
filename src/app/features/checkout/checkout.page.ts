// src/app/features/checkout/checkout.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
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
  checkmarkCircleOutline, arrowForwardOutline, chevronForwardOutline,
  personOutline, receiptOutline, informationCircleOutline,
  shieldCheckmarkOutline, timeOutline, logoPaypal, optionsOutline,
  carOutline
} from 'ionicons/icons';

import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { Cart } from '../../core/models/cart.model';
import { User } from '../../core/models/user.model';

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
export class CheckoutPage implements OnInit, OnDestroy {
  checkoutForm!: FormGroup;
  isLoading = true;
  cart: Cart | null = null;
  user: User | null = null;
  isProcessing = false;
  showSuccessAlert = false;
  showErrorAlert = false;
  orderNumber = '';
  errorMessage = '';
  
  private subscriptions: Subscription[] = [];
  
  // Delivery fee
  private deliveryFee = 5.99;
  
  // Countries for dropdown
  countries = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' }
  ];
  
  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private cartService: CartService,
    private orderService: OrderService,
    private router: Router
  ) {
    addIcons({ 
      cardOutline, cashOutline, locationOutline, homeOutline, 
      checkmarkCircleOutline, arrowForwardOutline, chevronForwardOutline,
      personOutline, receiptOutline, informationCircleOutline,
      shieldCheckmarkOutline, timeOutline, logoPaypal, optionsOutline,
      carOutline
    });
  }
  
  successAlertButtons = [
    {
      text: 'View Order',
      handler: () => {
        this.navigateToOrderConfirmation();
      }
    }
  ];

  errorAlertButtons = [
    {
      text: 'OK',
      handler: () => {
        this.showErrorAlert = false;
      }
    }
  ];
  
  ngOnInit() {
    this.createForm();
    this.loadData();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  createForm() {
    this.checkoutForm = this.formBuilder.group({
      // Delivery Method - Always Required
      deliveryMethod: ['pickup', Validators.required],
      
      // Contact Information - Always Required
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      
      // Delivery Address - Conditional
      address: [''],
      city: [''],
      state: [''],
      zip: [''],
      country: ['US'],
      
      // Payment Method - Always Required
      paymentMethod: ['credit_card', Validators.required],
      
      // Credit Card Details - Conditional
      cardNumber: [''],
      cardName: [''],
      expiryMonth: [''],
      expiryYear: [''],
      cvv: [''],
      
      // Terms - Always Required
      termsAccepted: [false, Validators.requiredTrue]
    });
    
    // Set up conditional validation for delivery method
    const deliveryMethodSub = this.checkoutForm.get('deliveryMethod')?.valueChanges.subscribe(method => {
      this.updateDeliveryValidation(method);
    });
    if (deliveryMethodSub) this.subscriptions.push(deliveryMethodSub);
    
    // Set up conditional validation for payment method
    const paymentMethodSub = this.checkoutForm.get('paymentMethod')?.valueChanges.subscribe(method => {
      this.updatePaymentValidation(method);
    });
    if (paymentMethodSub) this.subscriptions.push(paymentMethodSub);
  }

  private updateDeliveryValidation(method: string) {
    if (method === 'delivery') {
      // Add delivery address validators
      this.checkoutForm.get('address')?.setValidators([Validators.required]);
      this.checkoutForm.get('city')?.setValidators([Validators.required]);
      this.checkoutForm.get('state')?.setValidators([Validators.required]);
      this.checkoutForm.get('zip')?.setValidators([Validators.required]);
      this.checkoutForm.get('country')?.setValidators([Validators.required]);
      
      // If payment method is cash, switch to credit card (cash only for pickup)
      if (this.checkoutForm.get('paymentMethod')?.value === 'cash') {
        this.checkoutForm.patchValue({ paymentMethod: 'credit_card' });
      }
    } else {
      // Remove delivery address validators for pickup
      this.checkoutForm.get('address')?.clearValidators();
      this.checkoutForm.get('city')?.clearValidators();
      this.checkoutForm.get('state')?.clearValidators();
      this.checkoutForm.get('zip')?.clearValidators();
      this.checkoutForm.get('country')?.clearValidators();
    }
    
    // Update validity
    ['address', 'city', 'state', 'zip', 'country'].forEach(field => {
      this.checkoutForm.get(field)?.updateValueAndValidity();
    });
  }

  private updatePaymentValidation(method: string) {
    if (method === 'credit_card') {
      // Add credit card validators
      this.checkoutForm.get('cardNumber')?.setValidators([
        Validators.required, 
        Validators.pattern(/^\d{16}$/)
      ]);
      this.checkoutForm.get('cardName')?.setValidators([Validators.required]);
      this.checkoutForm.get('expiryMonth')?.setValidators([
        Validators.required, 
        Validators.pattern(/^(0[1-9]|1[0-2])$/)
      ]);
      this.checkoutForm.get('expiryYear')?.setValidators([
        Validators.required, 
        Validators.pattern(/^\d{2}$/)
      ]);
      this.checkoutForm.get('cvv')?.setValidators([
        Validators.required, 
        Validators.pattern(/^\d{3,4}$/)
      ]);
    } else {
      // Remove credit card validators for cash/paypal
      this.checkoutForm.get('cardNumber')?.clearValidators();
      this.checkoutForm.get('cardName')?.clearValidators();
      this.checkoutForm.get('expiryMonth')?.clearValidators();
      this.checkoutForm.get('expiryYear')?.clearValidators();
      this.checkoutForm.get('cvv')?.clearValidators();
    }
    
    // Update validity
    ['cardNumber', 'cardName', 'expiryMonth', 'expiryYear', 'cvv'].forEach(field => {
      this.checkoutForm.get(field)?.updateValueAndValidity();
    });
  }
  
  loadData() {
    this.isLoading = true;
    
    // Load user data
    const userSub = this.authService.currentUser$.subscribe({
      next: (user) => {
        this.user = user;
        
        if (user) {
          // Populate form with user data
          const nameParts = user.displayName?.split(' ') || [];
          this.checkoutForm.patchValue({
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
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
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.isLoading = false;
      }
    });
    this.subscriptions.push(userSub);
    
    // Load cart data
    const cartSub = this.cartService.cart$.subscribe({
      next: (cart) => {
        this.cart = cart;
        
        if (!cart || cart.items.length === 0) {
          // Redirect to cart if empty
          this.router.navigate(['/cart']);
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading cart:', error);
        this.isLoading = false;
        this.showError('Failed to load cart data. Please try again.');
      }
    });
    this.subscriptions.push(cartSub);
  }
  
  onSubmit() {
    if (this.checkoutForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      this.markFormGroupTouched(this.checkoutForm);
      return;
    }
    
    if (this.isProcessing) {
      return; // Prevent double submission
    }
    
    this.isProcessing = true;
    
    const formData = this.checkoutForm.value;
    const isPickup = formData.deliveryMethod === 'pickup';
    
    // Create shipping address object if delivery
    const shippingAddress = !isPickup ? {
      street: formData.address,
      city: formData.city,
      state: formData.state,
      zip: formData.zip,
      country: formData.country
    } : undefined;
    
    console.log('Submitting order with data:', {
      paymentMethod: formData.paymentMethod,
      isPickup,
      pickupLocation: isPickup ? 'vbs-main-store' : undefined,
      shippingAddress
    });
    
    // Create order
    const orderSub = this.orderService.createOrder(
      formData.paymentMethod,
      isPickup,
      isPickup ? 'vbs-main-store' : undefined,
      shippingAddress
    ).subscribe({
      next: (orderId) => {
        console.log('Order created successfully:', orderId);
        this.isProcessing = false;
        this.orderNumber = orderId;
        this.showSuccessAlert = true;
      },
      error: (error) => {
        console.error('Error creating order:', error);
        this.isProcessing = false;
        this.showError('There was an error processing your order. Please try again.');
      }
    });
    this.subscriptions.push(orderSub);
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private showError(message: string) {
    this.errorMessage = message;
    this.showErrorAlert = true;
  }
  
  getTaxAmount(): number {
    return (this.cart?.subtotal || 0) * 0.1; // 10% tax
  }
  
  getDeliveryFee(): number {
    const deliveryMethod = this.checkoutForm.get('deliveryMethod')?.value;
    return deliveryMethod === 'delivery' ? this.deliveryFee : 0;
  }
  
  getTotalAmount(): number {
    const subtotal = this.cart?.subtotal || 0;
    const tax = this.getTaxAmount();
    const delivery = this.getDeliveryFee();
    return subtotal + tax + delivery;
  }
  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  navigateToOrderConfirmation() {
    this.showSuccessAlert = false;
    this.router.navigate(['/orders', this.orderNumber]);
  }
  
  // Convenience getter for form fields
  get f() { return this.checkoutForm.controls; }
}