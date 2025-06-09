// src/app/features/store-locator/store-locator.page.ts
import { Component, OnInit, ElementRef, AfterViewInit, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonItem, IonLabel, IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  locationOutline, navigateOutline, callOutline, mailOutline,
  timeOutline, globeOutline, storefront, mapOutline, logoGoogle
} from 'ionicons/icons';

import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

// Leaflet is completely free and open source!
declare var L: any;

interface StoreInfo {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  hours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  phone: string;
  email: string;
  googleMapsLink: string;
}

@Component({
  selector: 'app-store-locator',
  templateUrl: './store-locator.page.html',
  styleUrls: ['./store-locator.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonItem, IonLabel, IonBadge,
    HeaderComponent, FooterComponent, LoadingSpinnerComponent
  ]
})
export class StoreLocatorPage implements OnInit, AfterViewInit {
  @ViewChildren('mapContainer') mapContainers!: QueryList<ElementRef>;
  
  // Store information - replace with your actual details
  store: StoreInfo = {
    name: 'VBS Electronics',
    address: {
      street: 'Rruga Pjeter Budi',
      city: 'Tirana',
      state: 'Tirana County', 
      zip: '1001',
      country: 'Albania'
    },
    coordinates: {
      latitude: 41.34089147529923, // Replace with exact coordinates from your Google Maps link
      longitude: 19.839659242329034
    },
    hours: {
      monday: '9:00 AM - 8:00 PM',
      tuesday: '9:00 AM - 8:00 PM',
      wednesday: '9:00 AM - 8:00 PM',
      thursday: '9:00 AM - 8:00 PM',
      friday: '9:00 AM - 8:00 PM',
      saturday: '10:00 AM - 6:00 PM',
      sunday: '12:00 PM - 5:00 PM'
    },
    phone: '+355 XX XXX XXXX', // Replace with your actual phone
    email: 'info@vbselectronics.com', // Replace with your actual email
    googleMapsLink: 'https://maps.app.goo.gl/1n6qtSHx1drhpLaQA'
  };
  
  isLoading = true;
  leafletMap: any;
  private mapInitialized = false;
  private initializationAttempts = 0;
  private maxAttempts = 20;
  
  constructor() {
    addIcons({ 
      locationOutline, navigateOutline, callOutline, mailOutline,
      timeOutline, globeOutline, storefront, mapOutline, logoGoogle
    });
  }
  
  ngOnInit() {
    // Start loading immediately
    this.isLoading = true;
    
    // Load Leaflet library early
    this.loadLeafletLibrary().then(() => {
      console.log('Leaflet library loaded');
    });
    
    // Show content after a short delay
    setTimeout(() => {
      this.isLoading = false;
    }, 500);
  }
  
  ngAfterViewInit() {
    // Use Ionic's lifecycle to ensure view is ready
    this.ionViewDidEnter();
  }
  
  ionViewDidEnter() {
    // Initialize map when view is fully entered
    setTimeout(() => {
      if (!this.mapInitialized) {
        this.loadLeafletMap();
      }
    }, 100);
  }
  
  // Load Leaflet (completely free alternative to Google Maps)
  loadLeafletMap() {
    if (this.mapInitialized) {
      console.log('Map already initialized, refreshing...');
      if (this.leafletMap) {
        this.leafletMap.invalidateSize();
      }
      return;
    }
    
    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
      console.log('Waiting for Leaflet to load...');
      setTimeout(() => this.loadLeafletMap(), 300);
      return;
    }
    
    // Start initialization
    this.initLeafletMap();
  }
  
  loadLeafletLibrary(): Promise<void> {
    return new Promise((resolve) => {
      // Check if Leaflet is already loaded
      if (typeof L !== 'undefined') {
        resolve();
        return;
      }
      
      // Load Leaflet CSS
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(linkElement);
      
      // Load Leaflet JavaScript
      const scriptElement = document.createElement('script');
      scriptElement.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      scriptElement.onload = () => resolve();
      document.body.appendChild(scriptElement);
    });
  }
  
  initLeafletMap() {
    if (typeof L === 'undefined') {
      console.error('Leaflet library not loaded');
      setTimeout(() => this.initLeafletMap(), 200);
      return;
    }
    
    if (this.mapInitialized) {
      console.log('Map already initialized');
      return;
    }
    
    // Ensure DOM is ready
    if (!this.mapContainers || this.mapContainers.length === 0) {
      console.log('Map containers not ready, retrying...');
      setTimeout(() => this.initLeafletMap(), 200);
      return;
    }
    
    // Get the visible map container
    const containers = this.mapContainers.toArray();
    let visibleContainer: ElementRef | null = null;
    
    for (const containerRef of containers) {
      const element = containerRef.nativeElement;
      // Check if element is visible
      const rect = element.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && 
                       rect.top < window.innerHeight && 
                       rect.bottom > 0;
      
      if (element && isVisible) {
        visibleContainer = containerRef;
        break;
      }
    }
    
    if (!visibleContainer) {
      console.log('No visible container found, retrying...');
      this.initializationAttempts++;
      if (this.initializationAttempts < this.maxAttempts) {
        setTimeout(() => this.initLeafletMap(), 200);
      } else {
        console.error('Failed to initialize map after maximum attempts');
      }
      return;
    }
    
    const container = visibleContainer.nativeElement;
    console.log('Container dimensions:', container.offsetWidth, 'x', container.offsetHeight);
    
    // Final check for container dimensions
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.log('Container has no dimensions, retrying...');
      this.initializationAttempts++;
      if (this.initializationAttempts < this.maxAttempts) {
        setTimeout(() => this.initLeafletMap(), 200);
      } else {
        console.error('Failed to initialize map after maximum attempts');
      }
      return;
    }
    
    try {
      // Clear any existing map
      if (this.leafletMap) {
        this.leafletMap.remove();
        this.leafletMap = null;
      }
      
      // Set a unique ID for the container to avoid conflicts
      container.id = 'leaflet-map-' + Date.now();
      
      // Create the map centered on your store
      this.leafletMap = L.map(container.id, {
        center: [this.store.coordinates.latitude, this.store.coordinates.longitude],
        zoom: 16,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        dragging: true,
        touchZoom: true
      });
      
      // Add free OpenStreetMap tiles (no API key needed!)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 1
      }).addTo(this.leafletMap);
      
      // Force map to resize after creation
      setTimeout(() => {
        if (this.leafletMap) {
          this.leafletMap.invalidateSize();
          console.log('Map resized');
        }
      }, 100);
      
      // Add a marker for your store
      const marker = L.marker([this.store.coordinates.latitude, this.store.coordinates.longitude])
        .addTo(this.leafletMap);
      
      // Add a popup with store info
      const popupContent = `
        <div style="text-align: center; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <h3 style="margin: 0 0 8px 0; color: #3880ff; font-size: 16px;">${this.store.name}</h3>
          <p style="margin: 4px 0; font-size: 14px; color: #333;">${this.store.address.street}</p>
          <p style="margin: 4px 0; font-size: 14px; color: #333;">${this.store.address.city}, ${this.store.address.state}</p>
          <p style="margin: 8px 0 4px 0; font-weight: bold; color: ${this.isOpenNow() ? '#28a745' : '#6c757d'};">
            ${this.isOpenNow() ? '🟢 Open Now' : '🔴 Closed'}
          </p>
          <p style="margin: 4px 0; font-size: 13px; color: #666;">${this.store.phone}</p>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      
      // Auto-open popup after a delay
      setTimeout(() => {
        if (marker) {
          marker.openPopup();
        }
      }, 1000);
      
      this.mapInitialized = true;
      console.log('Map initialized successfully');
      
      // Listen for window resize to invalidate map size
      window.addEventListener('resize', () => {
        if (this.leafletMap) {
          setTimeout(() => {
            this.leafletMap.invalidateSize();
          }, 100);
        }
      });
      
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }
  
  getDirections() {
    // Your Google Maps link
    const googleMapsLink = 'https://maps.app.goo.gl/1n6qtSHx1drhpLaQA';
    window.open(googleMapsLink, '_blank');
  }
  
  // Alternative directions using OpenStreetMap (also free)
  getOpenStreetMapDirections() {
    const lat = this.store.coordinates.latitude;
    const lng = this.store.coordinates.longitude;
    window.open(`https://www.openstreetmap.org/directions?to=${lat}%2C${lng}`, '_blank');
  }
  
  openPhoneApp() {
    window.location.href = `tel:${this.store.phone}`;
  }
  
  openEmailApp() {
    window.location.href = `mailto:${this.store.email}`;
  }
  
  getDayOfWeek(): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date().getDay();
    return days[today];
  }
  
  isOpenNow(): boolean {
    const day = this.getDayOfWeek();
    const hours = this.store.hours[day as keyof typeof this.store.hours];
    
    if (hours === 'Closed') {
      return false;
    }
    
    const [openTime, closeTime] = hours.split(' - ');
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    // Parse open time
    const openMatch = openTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!openMatch) return false;
    let openHour = parseInt(openMatch[1]);
    const openMinutes = parseInt(openMatch[2]);
    if (openMatch[3].toUpperCase() === 'PM' && openHour < 12) openHour += 12;
    if (openMatch[3].toUpperCase() === 'AM' && openHour === 12) openHour = 0;
    
    // Parse close time
    const closeMatch = closeTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!closeMatch) return false;
    let closeHour = parseInt(closeMatch[1]);
    const closeMinutes = parseInt(closeMatch[2]);
    if (closeMatch[3].toUpperCase() === 'PM' && closeHour < 12) closeHour += 12;
    if (closeMatch[3].toUpperCase() === 'AM' && closeHour === 12) closeHour = 0;
    
    const currentTimeInMinutes = currentHour * 60 + currentMinutes;
    const openTimeInMinutes = openHour * 60 + openMinutes;
    const closeTimeInMinutes = closeHour * 60 + closeMinutes;
    
    return currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes;
  }
}