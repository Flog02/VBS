// src/app/shared/components/footer/footer.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
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
    IonIcon
  ]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  
  constructor() {
    addIcons({ 
      mailOutline,
      callOutline,
      locationOutline
    });
  }
}