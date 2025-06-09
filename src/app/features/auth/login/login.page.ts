// Updated login component with simple auto-disappearing messages
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonCheckbox, IonSpinner, IonText,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  lockClosedOutline, mailOutline, eyeOutline, eyeOffOutline
} from 'ionicons/icons';

import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
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
export class LoginPage implements OnInit {
  loginForm!: FormGroup;
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  returnUrl = '/';
  
  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastController: ToastController
  ) {
    addIcons({ 
      lockClosedOutline, mailOutline, eyeOutline, eyeOffOutline 
    });
  }
  
  ngOnInit() {
    this.createForm();
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    
    // Show logout message if redirected from logout
    const loggedOut = this.route.snapshot.queryParams['loggedOut'];
    if (loggedOut === 'true') {
      this.showSimpleMessage('Logged out successfully', 'medium');
    }
    
    // Redirect if already logged in
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.redirectBasedOnRole(user.role);
      }
    });
  }
  
  createForm() {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }
  
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // Simple auto-disappearing message at bottom
  private async showSimpleMessage(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000, // Auto-disappear after 2 seconds
      position: 'bottom', // ✅ Changed to bottom
      color: color
    });
    await toast.present();
  }

  // Role-based redirection
  private redirectBasedOnRole(role: string) {
    if (role === 'admin') {
      this.router.navigate(['/admin']);
    } else {
      if (this.returnUrl && this.returnUrl !== '/' && !this.returnUrl.includes('/admin')) {
        this.router.navigate([this.returnUrl]);
      } else {
        this.router.navigate(['/home']);
      }
    }
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        const control = this.loginForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    const { email, password } = this.loginForm.value;
    
    this.authService.login(email, password).subscribe({
      next: async (user) => {
        this.isLoading = false;
        
        // Show simple "Logged in" message
        await this.showSimpleMessage('Logged in successfully', 'success');
        
        // Small delay then redirect
        setTimeout(() => {
          this.redirectBasedOnRole(user.role);
        }, 1000);
      },
      error: async (error) => {
        this.isLoading = false;
        
        let errorMessage = 'Login failed';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          errorMessage = 'Invalid email or password';
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = 'Too many attempts. Try again later';
        }
        
        // Show error message
        await this.showSimpleMessage(errorMessage, 'danger');
        this.errorMessage = errorMessage;
      }
    });
  }
  
  get f() { 
    return this.loginForm.controls; 
  }
}