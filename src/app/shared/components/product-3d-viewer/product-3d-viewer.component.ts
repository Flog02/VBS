// Alternative: Simple iframe-based 3D viewer that bypasses CORS
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { 
  IonSpinner, IonButton, IonIcon, IonText 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { expandOutline, contractOutline, cubeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-product-3d-viewer',
  template: `
    <div class="viewer-container" [class.fullscreen]="isFullscreen">
      <!-- Loading State -->
      <div class="loading-overlay" *ngIf="isLoading">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading 3D Model...</p>
      </div>
      
      <!-- 3D Viewer using Google's model-viewer -->
      <iframe
        *ngIf="iframeUrl"
        [src]="iframeUrl"
        frameborder="0"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        allowfullscreen
        (load)="onIframeLoad()"
        style="width: 100%; height: 100%; border: none;">
      </iframe>
      
      <!-- Fallback for direct embedding -->
      <div *ngIf="!iframeUrl && modelUrl" class="fallback-viewer">
        <ion-icon name="cube-outline" size="large"></ion-icon>
        <p>3D Preview</p>
        <a [href]="modelUrl" target="_blank" class="view-link">
          <ion-button size="small">
            View 3D Model
          </ion-button>
        </a>
      </div>
      
      <!-- Controls -->
      <div class="viewer-controls" *ngIf="!isLoading">
        <ion-button fill="clear" size="small" (click)="toggleFullscreen()" title="Toggle Fullscreen">
          <ion-icon [name]="isFullscreen ? 'contract-outline' : 'expand-outline'" slot="icon-only"></ion-icon>
        </ion-button>
      </div>
    </div>
  `,
  styles: [`
    .viewer-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 400px;
      background-color: #f5f5f5;
      border-radius: 8px;
      overflow: hidden;
      
      &.fullscreen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 9999;
        border-radius: 0;
      }
    }
    
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background-color: rgba(245, 245, 245, 0.95);
      z-index: 10;
      
      ion-spinner {
        --color: var(--ion-color-primary);
        width: 48px;
        height: 48px;
      }
      
      p {
        margin-top: 16px;
        color: var(--ion-color-medium);
        font-size: 14px;
      }
    }
    
    .fallback-viewer {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      padding: 32px;
      text-align: center;
      
      ion-icon {
        color: var(--ion-color-medium);
        font-size: 64px;
        margin-bottom: 16px;
      }
      
      p {
        color: var(--ion-color-medium);
        margin-bottom: 16px;
      }
    }
    
    .viewer-controls {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 5;
      
      ion-button {
        --background: rgba(255, 255, 255, 0.9);
        --background-hover: rgba(255, 255, 255, 1);
        --color: var(--ion-color-medium);
        --box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        --border-radius: 8px;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, IonSpinner, IonButton, IonIcon, IonText]
})
export class Product3dViewerComponent implements OnInit {
  @Input() modelUrl!: string;
  @Input() productName!: string;
  
  iframeUrl: SafeResourceUrl | null = null;
  isLoading = true;
  isFullscreen = false;
  
  constructor(private sanitizer: DomSanitizer) {
    addIcons({ expandOutline, contractOutline, cubeOutline });
  }
  
  ngOnInit() {
    if (this.modelUrl) {
      // Create a simple HTML page that loads model-viewer
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
          <style>
            body { margin: 0; padding: 0; overflow: hidden; }
            model-viewer {
              width: 100vw;
              height: 100vh;
              --poster-color: transparent;
            }
            .progress-bar {
              position: absolute;
              bottom: 0;
              left: 0;
              width: 100%;
              height: 4px;
              background: rgba(0, 0, 0, 0.1);
            }
            .update-bar {
              height: 100%;
              background: #007bff;
              width: 0%;
              transition: width 0.3s;
            }
          </style>
        </head>
        <body>
          <model-viewer
            src="${this.modelUrl}"
            alt="${this.productName} 3D Model"
            auto-rotate
            camera-controls
            shadow-intensity="1"
            exposure="1"
            ar
            ar-modes="webxr scene-viewer quick-look">
            <div class="progress-bar" slot="progress-bar">
              <div class="update-bar"></div>
            </div>
          </model-viewer>
          <script>
            const modelViewer = document.querySelector('model-viewer');
            modelViewer.addEventListener('progress', (event) => {
              const progressBar = document.querySelector('.update-bar');
              const progress = event.detail.totalProgress;
              progressBar.style.width = (progress * 100) + '%';
            });
            modelViewer.addEventListener('load', () => {
              window.parent.postMessage({ type: 'model-loaded' }, '*');
            });
            modelViewer.addEventListener('error', () => {
              window.parent.postMessage({ type: 'model-error' }, '*');
            });
          </script>
        </body>
        </html>
      `;
      
      // Convert HTML to data URL (this bypasses CORS)
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      
      // Listen for messages from iframe
      window.addEventListener('message', this.handleIframeMessage.bind(this));
    }
  }
  
  onIframeLoad() {
    // Give the model-viewer some time to initialize
    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
  }
  
  handleIframeMessage(event: MessageEvent) {
    if (event.data.type === 'model-loaded') {
      this.isLoading = false;
    } else if (event.data.type === 'model-error') {
      console.error('Model failed to load in iframe');
      // Optionally show error state
    }
  }
  
  toggleFullscreen() {
    const container = document.querySelector('.viewer-container');
    if (!container) return;
    
    if (!this.isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
      this.isFullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      this.isFullscreen = false;
    }
  }
  
  ngOnDestroy() {
    window.removeEventListener('message', this.handleIframeMessage.bind(this));
  }

  
}