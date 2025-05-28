// src/app/core/services/navigation.service.ts
import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private previousUrl: string = '';
  private currentUrl: string = '';

  constructor(private router: Router) {
    // Track navigation changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.previousUrl = this.currentUrl;
        this.currentUrl = event.url;
      });
  }

  getPreviousUrl(): string {
    return this.previousUrl;
  }

  getCurrentUrl(): string {
    return this.currentUrl;
  }

  // Method to set source for navigation
  setNavigationSource(source: string) {
    this.previousUrl = source;
  }
}