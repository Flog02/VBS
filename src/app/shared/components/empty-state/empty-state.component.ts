// src/app/shared/components/empty-state/empty-state.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { 
  IonButton,
  IonIcon,
  IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, IonButton, IonIcon, IonText]
})
export class EmptyStateComponent {
  @Input() icon: string = 'alert-circle-outline';
  @Input() title: string = 'Nothing Found';
  @Input() message: string = 'There are no items to display.';
  @Input() buttonText: string = '';
  @Input() buttonLink: string = '';
  
  constructor(public router: Router) {
    addIcons({ addCircleOutline });
  }
  
  navigate() {
    if (this.buttonLink) {
      this.router.navigateByUrl(this.buttonLink);
    }
  }
}