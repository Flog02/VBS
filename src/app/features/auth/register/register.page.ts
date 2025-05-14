// src/app/features/auth/register/register.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonCheckbox, IonSpinner, IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  lockClosedOutline, mailOutline, eyeOutline, eyeOffOutline, personOutline
} from 'ionicons/icons';

import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { AuthService } from '../../../core/services/auth.service';

// Custom validator for password matching
function passwordMatchValidator(form: FormGroup) {
  const password = form.get('password')?.value;
  const confirmPassword = form.get('confirmPassword')?.value;
  
  if (password !== confirmPassword) {
    form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
  } else {
    form.get('confirmPassword')?.setErrors(null);
  }
  
  return null;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonInput, IonCheckbox, IonSpinner, IonText,
    HeaderComponent, FooterComponent
  ]
})
export class RegisterPage implements OnInit {
  registerForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  errorMessage = '';
  
  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ 
      lockClosedOutline, mailOutline, eyeOutline, eyeOffOutline, personOutline
    });
  }
  
  ngOnInit() {
    this.createForm();
    
    // Redirect if already logged in
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.router.navigate(['/']);
      }
    });
  }
  
  createForm() {
    this.registerForm = this.formBuilder.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      termsAccepted: [false, Validators.requiredTrue]
    }, { validator: passwordMatchValidator });
  }
  
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
  
  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
  
  onSubmit() {
    if (this.registerForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.registerForm.controls).forEach(key => {
        const control = this.registerForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    const { displayName, email, password } = this.registerForm.value;
    
    this.authService.register(email, password, displayName).subscribe(
      () => {
        this.isLoading = false;
        this.router.navigate(['/']);
      },
      error => {
        this.isLoading = false;
        
        // Handle specific error cases
        if (error.code === 'auth/email-already-in-use') {
          this.errorMessage = 'This email is already in use. Please use a different email or try logging in.';
        } else if (error.code === 'auth/weak-password') {
          this.errorMessage = 'The password is too weak. Please choose a stronger password.';
        } else {
          this.errorMessage = 'An error occurred during registration. Please try again.';
        }
        
        console.error('Registration error:', error);
      }
    );
  }
  
  // Convenience getter for easy access to form fields
  get f() { return this.registerForm.controls; }
}