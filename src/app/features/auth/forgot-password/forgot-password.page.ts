// src/app/features/auth/forgot-password/forgot-password.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonSpinner, IonText, IonAlert
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  mailOutline, arrowBackOutline, checkmarkCircleOutline
} from 'ionicons/icons';

import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonInput, IonSpinner, IonText, IonAlert,
    HeaderComponent, FooterComponent
  ]
})
export class ForgotPasswordPage implements OnInit {
  forgotPasswordForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ 
      mailOutline, arrowBackOutline, checkmarkCircleOutline
    });
  }
  
  ngOnInit() {
    this.createForm();
  }
  
  createForm() {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }
  
  onSubmit() {
    if (this.forgotPasswordForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.forgotPasswordForm.controls).forEach(key => {
        const control = this.forgotPasswordForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    const { email } = this.forgotPasswordForm.value;
    
    this.authService.resetPassword(email).subscribe(
      () => {
        this.isLoading = false;
        this.successMessage = 'Password reset email sent. Please check your inbox and follow the instructions.';
        // Reset form
        this.forgotPasswordForm.reset();
      },
      error => {
        this.isLoading = false;
        
        // Handle specific error cases
        if (error.code === 'auth/user-not-found') {
          this.errorMessage = 'No account found with this email address.';
        } else {
          this.errorMessage = 'An error occurred while sending the password reset email. Please try again.';
        }
        
        console.error('Reset password error:', error);
      }
    );
  }
  
  // Convenience getter for easy access to form fields
  get f() { return this.forgotPasswordForm.controls; }
}