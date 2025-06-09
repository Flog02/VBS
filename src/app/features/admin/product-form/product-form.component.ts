// Fixed product-form.component.ts - Key changes for 3D model handling

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { 
  IonInput, IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption,
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCheckbox, IonList,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonChip,
  IonSpinner, IonBadge, IonToggle, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  imageOutline, addOutline, closeOutline, trashOutline, 
  saveOutline, reloadOutline, checkmarkOutline, cubeOutline, arrowBackOutline, 
  informationCircleOutline, bulbOutline, listOutline 
} from 'ionicons/icons';

import { Product } from '../../../core/models/product.model';
import { ProductService } from '../../../core/services/product.service';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../shared/components/header/header.component';

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons,
    CommonModule,
    ReactiveFormsModule,
    IonInput, IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption,
    IonButton, IonIcon, IonGrid, IonRow, IonCol,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonSpinner, IonToggle, FormsModule, HeaderComponent
  ]
})
export class ProductFormComponent implements OnInit {
  @Input() product: Product | null = null;
  @Input() isEdit = false;
  @Output() formSubmitted = new EventEmitter<any>();
  @Output() cancelEdit = new EventEmitter<void>();
  
  productForm!: FormGroup;
  isSubmitting = false;
  isLoading = false;
  keyFeatures: string[] = [];
  newFeature: string = '';
  productId: string | null = null;
  
  // Image uploads
  selectedImages: File[] = [];
  imagePreviewUrls: string[] = [];
  uploadProgress: number[] = [];
  
  // 3D model upload - FIXED: Better state management
  selectedModel: File | null = null;
  modelPreviewUrl: string = '';
  modelUploadProgress = 0;
  existingModelUrl: string | null = null; // Track existing model URL
  keepExistingModel = true; // Flag to keep existing model
  
  // Available categories
  categories = [
    { id: 'mobile', name: 'Mobile Phones' },
    { id: 'tv', name: 'TV & Services' },
    { id: 'wearables', name: 'Wearables' },
    { id: 'accessories', name: 'Accessories' },
    { id: 'audio', name: 'Audio' },
    { id: 'computers', name: 'Computers' }
  ];
  
  specKeys: string[] = [];
  
  constructor(
    private formBuilder: FormBuilder,
    private productService: ProductService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private toastController: ToastController
  ) {
    addIcons({
      arrowBackOutline, addOutline, informationCircleOutline, trashOutline,
      bulbOutline, closeOutline, imageOutline, cubeOutline, listOutline,
      saveOutline, reloadOutline, checkmarkOutline
    });
  }
  
  ngOnInit() {
    this.createForm();
    
    this.activatedRoute.params.subscribe(params => {
      const productId = params['id'];
      if (productId) {
        console.log('Loading product for edit:', productId);
        this.isEdit = true;
        this.loadProductForEdit(productId);
      } else {
        console.log('Create new product mode');
        this.isEdit = false;
      }
    });
  }
  
  loadProductForEdit(productId: string) {
    this.isLoading = true;
    
    this.productService.getProductById(productId).subscribe({
      next: (product) => {
        console.log('Product loaded:', product);
        this.product = product;
        this.populateFormWithProduct();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.isLoading = false;
        this.router.navigate(['/admin/products']);
      }
    });
  }
  
  createForm() {
    this.productForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      price: [0, [Validators.required, Validators.min(0.01)]],
      salePrice: [null],
      category: ['', Validators.required],
      subcategory: [''],
      brand: ['', Validators.required],
      stock: [0, [Validators.required, Validators.min(0)]],
      featured: [false],
      rating: [0, [Validators.required, Validators.min(0), Validators.max(5)]],
      keyFeatures: this.formBuilder.array([]),
      specifications: this.formBuilder.group({})
    });
  }
  
  populateFormWithProduct() {
    if (!this.product) return;
    
    // Handle key features
    if (this.product.keyFeatures && Array.isArray(this.product.keyFeatures)) {
      this.keyFeatures = [...this.product.keyFeatures];
    }
    
    // FIXED: Handle existing 3D model
    if (this.product.model3dUrl) {
      this.existingModelUrl = this.product.model3dUrl;
      this.modelPreviewUrl = `Existing 3D Model: ${this.getModelFileName(this.product.model3dUrl)}`;
      this.keepExistingModel = true;
      console.log('Existing 3D model found:', this.existingModelUrl);
    }
    
    this.productForm.patchValue({
      name: this.product.name,
      description: this.product.description,
      price: this.product.price,
      salePrice: this.product.salePrice,
      category: this.product.category,
      subcategory: this.product.subcategory,
      brand: this.product.brand,
      stock: this.product.stock,
      featured: this.product.featured,
      rating: this.product.rating
    });
    
    // Handle specifications
    if (this.product.specifications) {
      const specGroup = this.productForm.get('specifications') as FormGroup;
      this.specKeys = Object.keys(this.product.specifications);
      
      this.specKeys.forEach(key => {
        specGroup.addControl(key, this.formBuilder.control(this.product!.specifications[key]));
      });
    }
    
    // Handle images
    if (this.product.images) {
      this.imagePreviewUrls = [...this.product.images];
    }
  }

  // FIXED: Helper method to extract filename from URL
  getModelFileName(url: string): string {
    try {
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1];
      return filename.split('?')[0]; // Remove query parameters
    } catch (error) {
      return 'Unknown file';
    }
  }
  
  onFileChange(event: any) {
    if (event.target.files && event.target.files.length) {
      const files = event.target.files;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const reader = new FileReader();
        reader.onload = () => {
          this.imagePreviewUrls.push(reader.result as string);
          this.uploadProgress.push(0);
        };
        reader.readAsDataURL(file);
        
        this.selectedImages.push(file);
      }
    }
  }
  
  // FIXED: Better 3D model file handling
  onModelFileChange(event: any) {
    if (event.target.files && event.target.files.length) {
      const file = event.target.files[0];
      
      // Validate file type (optional but recommended)
      const validExtensions = ['.glb', '.gltf', '.obj', '.fbx'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        this.showErrorToast('Please select a valid 3D model file (.glb, .gltf, .obj, .fbx)');
        return;
      }
      
      this.selectedModel = file;
      this.modelPreviewUrl = `New 3D Model: ${file.name}`;
      this.modelUploadProgress = 0;
      this.keepExistingModel = false; // User selected a new model
      
      console.log('New 3D model selected:', file.name);
    }
  }
  
  removeImage(index: number) {
    if (this.isEdit && this.product && index < (this.product.images.length || 0)) {
      this.imagePreviewUrls.splice(index, 1);
    } else {
      const adjustedIndex = this.isEdit && this.product ? index - (this.product.images.length || 0) : index;
      if (adjustedIndex >= 0 && adjustedIndex < this.selectedImages.length) {
        this.selectedImages.splice(adjustedIndex, 1);
        this.uploadProgress.splice(adjustedIndex, 1);
      }
      this.imagePreviewUrls.splice(index, 1);
    }
  }
  
  // FIXED: Better model removal handling
  removeModel() {
    this.selectedModel = null;
    this.modelPreviewUrl = '';
    this.modelUploadProgress = 0;
    
    if (this.isEdit && this.existingModelUrl) {
      // User wants to remove the existing model
      this.keepExistingModel = false;
      this.existingModelUrl = null;
      console.log('Existing 3D model marked for removal');
    }
  }
  
  addSpecification() {
    const newKey = `spec_${Date.now()}`;
    this.specKeys.push(newKey);
    
    const specGroup = this.productForm.get('specifications') as FormGroup;
    specGroup.addControl(newKey, this.formBuilder.control(''));
  }
  
  removeSpecification(index: number) {
    const key = this.specKeys[index];
    const specGroup = this.productForm.get('specifications') as FormGroup;
    
    specGroup.removeControl(key);
    this.specKeys.splice(index, 1);
  }
  
  updateSpecKey(index: number, event: any) {
    const oldKey = this.specKeys[index];
    const newKey = event.target.value.trim();
    
    if (newKey && newKey !== oldKey && !this.specKeys.includes(newKey)) {
      const specGroup = this.productForm.get('specifications') as FormGroup;
      const value = specGroup.get(oldKey)?.value;
      
      specGroup.removeControl(oldKey);
      specGroup.addControl(newKey, this.formBuilder.control(value));
      this.specKeys[index] = newKey;
    }
  }

  // Key Features Management
  onFeatureInputChange(event: any) {
    this.newFeature = event.detail.value || '';
  }

  addKeyFeature() {
    if (this.newFeature && this.newFeature.trim()) {
      this.keyFeatures.push(this.newFeature.trim());
      this.newFeature = '';
    }
  }

  removeKeyFeature(index: number) {
    this.keyFeatures.splice(index, 1);
  }

  updateKeyFeature(index: number, event: any) {
    const value = event.detail?.value || '';
    if (value) {
      this.keyFeatures[index] = value;
    }
  }

  async onSubmit() {
    if (this.productForm.invalid) {
      await this.showValidationToast();
      return;
    }
    
    this.isSubmitting = true;
    
    try {
      const formData = this.productForm.value;
      console.log('Submitting form data:', formData);
      
      // Process specifications
      const specifications: Record<string, any> = {};
      this.specKeys.forEach(key => {
        const value = formData.specifications[key];
        if (value && value.trim()) {
          specifications[key] = value;
        }
      });
      
      // Create product object
      const productData: any = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        category: formData.category,
        brand: formData.brand,
        stock: Number(formData.stock),
        featured: formData.featured,
        rating: Number(formData.rating),
        keyFeatures: this.keyFeatures,
        specifications
      };
      
      // Optional fields
      if (formData.salePrice && formData.salePrice > 0) {
        productData.salePrice = Number(formData.salePrice);
      }
      
      if (formData.subcategory && formData.subcategory.trim()) {
        productData.subcategory = formData.subcategory;
      }
      
      // Handle existing images
      let images: string[] = [];
      if (this.isEdit && this.product && this.product.images) {
        const remainingOriginalImagesCount = Math.min(
          this.imagePreviewUrls.length, 
          this.product.images.length
        );
        images = this.imagePreviewUrls.slice(0, remainingOriginalImagesCount);
      }
      
      // Handle new uploaded images
      if (this.selectedImages.length > 0) {
        for (let i = 0; i < this.selectedImages.length; i++) {
          const file = this.selectedImages[i];
          const productId = this.isEdit && this.product ? this.product.id : 'temp';
          
          try {
            const downloadUrl = await this.uploadImage(file, productId, i);
            images.push(downloadUrl);
          } catch (error) {
            console.error(`Error uploading image ${i}:`, error);
          }
        }
      }
      
      productData.images = images;
      
      // FIXED: Better 3D model handling logic
      if (this.selectedModel) {
        // User selected a new 3D model
        const productId = this.isEdit && this.product ? this.product.id : 'temp';
        try {
          console.log('Uploading new 3D model...');
          const modelUrl = await this.uploadModel(this.selectedModel, productId);
          productData.model3dUrl = modelUrl;
          console.log('New 3D model uploaded successfully:', modelUrl);
        } catch (error) {
          console.error('Error uploading 3D model:', error);
          await this.showErrorToast('Failed to upload 3D model');
        }
      } else if (this.isEdit && this.keepExistingModel && this.existingModelUrl) {
        // Keep existing model URL
        productData.model3dUrl = this.existingModelUrl;
        console.log('Keeping existing 3D model:', this.existingModelUrl);
      } else {
        // No model or user removed it
        productData.model3dUrl = null;
        console.log('No 3D model or model removed');
      }
      
      // Create or update product
      if (this.isEdit && this.product) {
        console.log('Updating product:', this.product.id, 'with data:', productData);
        await this.productService.updateProduct(this.product.id, productData).toPromise();
        this.formSubmitted.emit({ action: 'update', product: { id: this.product.id, ...productData } });
      } else {
        console.log('Creating new product with data:', productData);
        const productId = await this.productService.createProduct(productData).toPromise();
        this.formSubmitted.emit({ action: 'create', product: { id: productId, ...productData } });
      }
      
      this.isSubmitting = false;
      await this.showSuccessToast();
      
      setTimeout(() => {
        this.router.navigate(['/admin/products']);
      }, 1500);
      
    } catch (error) {
      console.error('Error saving product:', error);
      this.isSubmitting = false;
      await this.showErrorToast();
    }
  }
  
  cancel() {
    this.cancelEdit.emit();
    this.router.navigate(['/admin/products']);
  }
  
  goBack() {
    this.router.navigate(['/admin/products']);
  }
  
  async uploadImage(file: File, productId: string, index: number): Promise<string> {
    return new Promise((resolve, reject) => {
      this.productService.uploadProductImage(file, productId).subscribe({
        next: (url: string) => {
          this.uploadProgress[index] = 100;
          resolve(url);
        },
        error: (error: any) => {
          reject(error);
        }
      });
    });
  }
  
  async uploadModel(file: File, productId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.productService.upload3DModel(file, productId).subscribe({
        next: (url: string) => {
          this.modelUploadProgress = 100;
          resolve(url);
        },
        error: (error: any) => {
          reject(error);
        }
      });
    });
  }
  
  // Toast methods
  async showValidationToast() {
    try {
      const invalidFields = this.getInvalidFields();
      
      const toast = await this.toastController.create({
        message: `Please complete: ${invalidFields.join(', ')}`,
        duration: 4000,
        position: 'bottom',
        color: 'danger',
        cssClass: 'validation-toast',
        buttons: [
          {
            text: 'Dismiss',
            role: 'cancel'
          }
        ]
      });

      await toast.present();
      
      Object.keys(this.productForm.controls).forEach(key => {
        const control = this.productForm.get(key);
        control?.markAsTouched();
      });
    } catch (error) {
      console.error('Error showing validation toast:', error);
    }
  }
  
  async showSuccessToast() {
    try {
      const toast = await this.toastController.create({
        message: this.isEdit ? '✅ Product updated successfully!' : '✅ Product created successfully!',
        duration: 3000,
        position: 'bottom',
        color: 'success',
        cssClass: 'success-toast'
      });

      await toast.present();
    } catch (error) {
      console.error('Error showing success toast:', error);
    }
  }
  
  async showErrorToast(message?: string) {
    try {
      const toast = await this.toastController.create({
        message: message || '❌ Error saving product. Please try again.',
        duration: 4000,
        position: 'bottom',
        color: 'danger',
        cssClass: 'error-toast',
        buttons: [
          {
            text: 'Dismiss',
            role: 'cancel'
          }
        ]
      });

      await toast.present();
    } catch (error) {
      console.error('Error showing error toast:', error);
    }
  }
  
  getInvalidFields(): string[] {
    const invalidFields: string[] = [];
    
    try {
      Object.keys(this.productForm.controls).forEach(key => {
        const control = this.productForm.get(key);
        if (control && control.invalid) {
          switch (key) {
            case 'name':
              invalidFields.push('Product Name');
              break;
            case 'description':
              invalidFields.push('Description');
              break;
            case 'price':
              invalidFields.push('Price');
              break;
            case 'category':
              invalidFields.push('Category');
              break;
            case 'brand':
              invalidFields.push('Brand');
              break;
            case 'stock':
              invalidFields.push('Stock');
              break;
            case 'rating':
              invalidFields.push('Rating');
              break;
            default:
              invalidFields.push(key.charAt(0).toUpperCase() + key.slice(1));
          }
        }
      });
    } catch (error) {
      console.error('Error getting invalid fields:', error);
      return ['Please check all required fields'];
    }
    
    return invalidFields.length > 0 ? invalidFields : ['Please check all required fields'];
  }

  get f() { return this.productForm.controls; }
}