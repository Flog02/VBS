// src/app/features/store-locator/store-locator.page.ts
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonItem, IonLabel, IonSearchbar, IonList,
  IonChip, IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  locationOutline, navigateOutline, callOutline, mailOutline,
  timeOutline, globeOutline, searchOutline
} from 'ionicons/icons';

import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { StoreLocationService } from '../../core/services/store-location.service';
import { StoreLocation } from '../../core/models/store-location.model';

declare var google: any;

@Component({
  selector: 'app-store-locator',
  templateUrl: './store-locator.page.html',
  styleUrls: ['./store-locator.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonItem, IonLabel, IonSearchbar, IonList,
    IonChip, IonBadge,
    HeaderComponent, FooterComponent, LoadingSpinnerComponent, EmptyStateComponent
  ]
})
export class StoreLocatorPage implements OnInit, AfterViewInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  stores: StoreLocation[] = [];
  filteredStores: StoreLocation[] = [];
  selectedStore: StoreLocation | null = null;
  isLoading = true;
  searchQuery = '';
  
  // Google Maps properties
  map: any;
  markers: any[] = [];
  infoWindow: any;
  bounds: any;
  
  constructor(private storeLocationService: StoreLocationService) {
    addIcons({ 
      locationOutline, navigateOutline, callOutline, mailOutline,
      timeOutline, globeOutline, searchOutline
    });
  }
  
  ngOnInit() {
    this.loadStores();
  }
  
  ngAfterViewInit() {
    // Load Google Maps API script
    this.loadGoogleMapsScript();
  }
  
  loadStores() {
    this.isLoading = true;
    
    this.storeLocationService.getStoreLocations().subscribe(
      stores => {
        this.stores = stores;
        this.filteredStores = [...stores];
        this.isLoading = false;
        
        // Initialize map after stores are loaded
        if (typeof google !== 'undefined' && this.mapContainer) {
          this.initMap();
        }
      },
      error => {
        console.error('Error loading stores:', error);
        this.isLoading = false;
      }
    );
  }
  
  loadGoogleMapsScript() {
    const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with your Google Maps API key
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Initialize map if stores are already loaded
      if (this.stores.length > 0 && this.mapContainer) {
        this.initMap();
      }
    };
    document.body.appendChild(script);
  }
  
  initMap() {
    // Create a map instance
    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center: { lat: 37.7749, lng: -122.4194 }, // Default to San Francisco
      zoom: 10,
      styles: [
        // Add custom map styles here if needed
      ]
    });
    
    // Create bounds object to fit all markers
    this.bounds = new google.maps.LatLngBounds();
    
    // Create info window for marker details
    this.infoWindow = new google.maps.InfoWindow();
    
    // Add markers for each store
    this.addMarkers();
  }
  
  addMarkers() {
    // Clear existing markers
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
    
    // Add markers for filtered stores
    this.filteredStores.forEach((store, index) => {
      const position = {
        lat: store.coordinates.latitude,
        lng: store.coordinates.longitude
      };
      
      const marker = new google.maps.Marker({
        position,
        map: this.map,
        title: store.name,
        animation: google.maps.Animation.DROP,
        icon: {
          url: 'assets/images/marker.png', // Custom marker icon
          scaledSize: new google.maps.Size(30, 40)
        }
      });
      
      // Extend bounds to include this marker
      this.bounds.extend(position);
      
      // Add click event to show info window
      marker.addListener('click', () => {
        this.showStoreInfo(store, marker);
      });
      
      this.markers.push(marker);
    });
    
    // Fit map to bounds if there are markers
    if (this.markers.length > 0) {
      this.map.fitBounds(this.bounds);
      
      // Ensure zoom is not too close
      const listener = google.maps.event.addListener(this.map, 'idle', () => {
        if (this.map.getZoom() > 15) {
          this.map.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }
  }
  
  showStoreInfo(store: StoreLocation, marker?: any) {
    this.selectedStore = store;
    
    if (marker && this.infoWindow) {
      // Create info window content
      const content = `
        <div class="info-window">
          <h3>${store.name}</h3>
          <p>${store.address.street}, ${store.address.city}</p>
        </div>
      `;
      
      this.infoWindow.setContent(content);
      this.infoWindow.open(this.map, marker);
      
      // Center map on marker
      this.map.panTo(marker.getPosition());
    }
    
    // Scroll to store in list
    const storeElement = document.getElementById(`store-${store.id}`);
    if (storeElement) {
      storeElement.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  selectStore(store: StoreLocation) {
    // Find marker for this store
    const marker = this.markers.find(m => m.title === store.name);
    this.showStoreInfo(store, marker);
  }
  
  searchStores(event: any) {
    const query = event.detail.value.toLowerCase();
    this.searchQuery = query;
    
    if (!query) {
      this.filteredStores = [...this.stores];
    } else {
      this.filteredStores = this.stores.filter(store => 
        store.name.toLowerCase().includes(query) ||
        store.address.city.toLowerCase().includes(query) ||
        store.address.state.toLowerCase().includes(query)
      );
    }
    
    // Update markers on map
    if (this.map) {
      this.addMarkers();
    }
  }
  
  getDirections(store: StoreLocation) {
    // Open Google Maps with directions
    const address = `${store.address.street}, ${store.address.city}, ${store.address.state} ${store.address.zip}`;
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  }
  
  openPhoneApp(phoneNumber: string) {
    window.location.href = `tel:${phoneNumber}`;
  }
  
  openEmailApp(email: string) {
    window.location.href = `mailto:${email}`;
  }
  
  getDayOfWeek(): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date().getDay();
    return days[today];
  }
  
  isOpenNow(store: StoreLocation): boolean {
    const day = this.getDayOfWeek();
    const hours = store.hours[day as keyof typeof store.hours];
    
    if (hours === 'Closed') {
      return false;
    }
    
    // Parse opening hours (assuming format like "9:00 AM - 8:00 PM")
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
    
    // Convert current time to minutes since midnight
    const currentTimeInMinutes = currentHour * 60 + currentMinutes;
    
    // Convert open and close time to minutes since midnight
    const openTimeInMinutes = openHour * 60 + openMinutes;
    const closeTimeInMinutes = closeHour * 60 + closeMinutes;
    
    // Check if current time is between open and close time
    return currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes;
  }
}