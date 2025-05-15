// src/app/shared/components/footer/footer.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { 
  IonFooter, 
  IonToolbar, 
  IonGrid, 
  IonRow, 
  IonCol,
  IonButton,
  IonIcon,
  IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  logoFacebook, 
  logoTwitter, 
  logoInstagram, 
  logoYoutube,
  mailOutline, 
  callOutline, 
  locationOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonFooter,
    IonToolbar,
    IonGrid,
    IonRow,
    IonCol,
    IonButton,
    IonIcon,
    IonText
  ]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  
  constructor(public router: Router) {
    addIcons({ 
      logoFacebook, 
      logoTwitter, 
      logoInstagram, 
      logoYoutube,
      mailOutline,
      callOutline,
      locationOutline
    });
  }
}