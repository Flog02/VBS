import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonInput, IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption,
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCheckbox, IonList,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonChip,
  IonSpinner, IonBadge, IonToggle, IonContent, ToastController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  imageOutline, addOutline, closeOutline, trashOutline, 
  saveOutline, reloadOutline, checkmarkOutline, cubeOutline 
} from 'ionicons/icons';

import { Product } from '../../../core/models/product.model';
import { ProductService } from '../../../core/services/product.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
  standalone: true,
  imports: [
    IonContent, 
    CommonModule,
    ReactiveFormsModule,
    IonInput, IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption,
    IonButton, IonIcon, IonGrid, IonRow, IonCol,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonSpinner, IonToggle
  ]
})
export class ProductFormComponent implements OnInit {
  @Input() product: Product | null = null;
  @Input() isEdit = false;
  @Output() formSubmitted = new EventEmitter<any>();
  @Output() cancelEdit = new EventEmitter<void>();
  
  productForm!: FormGroup;
  isSubmitting = false;
  
  // Image uploads
  selectedImages: File[] = [];
  imagePreviewUrls: string[] = [];
  uploadProgress: number[] = [];
  
  // Default product image
  defaultProductImage = 'assets/images/product-placeholder.png';
  
  // 3D model upload
  selectedModel: File | null = null;
  modelPreviewUrl: string = '';
  modelUploadProgress = 0;
  
  // Available categories
  categories = [
    { id: 'mobile', name: 'Mobile Phones' },
    { id: 'tv', name: 'TV & Services' },
    { id: 'wearables', name: 'Wearables' },
    { id: 'accessories', name: 'Accessories' },
    { id: 'audio', name: 'Audio' },
    { id: 'computers', name: 'Computers' }
  ];
  
  // Specification keys
  specKeys: string[] = [];
  
  constructor(
    private formBuilder: FormBuilder,
    private productService: ProductService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({
      closeOutline,
      imageOutline,
      cubeOutline,
      addOutline,
      trashOutline,
      saveOutline,
      reloadOutline,
      checkmarkOutline
    });
  }
  
  ngOnInit() {
    this.createForm();
    
    if (this.product && this.isEdit) {
      this.populateForm();
    }
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
      specifications: this.formBuilder.group({})
    });
  }
  
  populateForm() {
    if (!this.product) return;
    
    this.productForm.patchValue({
      name: this.product.name,
      description: this.product.description,
      price: this.product.price,
      salePrice: this.product.salePrice,
      category: this.product.category,
      subcategory: this.product.subcategory || '',
      brand: this.product.brand,
      stock: this.product.stock,
      featured: this.product.featured || false,
      rating: this.product.rating || 0
    });
    
    // Set spec keys and values
    if (this.product.specifications) {
      const specGroup = this.productForm.get('specifications') as FormGroup;
      this.specKeys = Object.keys(this.product.specifications);
      
      this.specKeys.forEach(key => {
        const value = this.product?.specifications?.[key] || '';
        specGroup.addControl(key, this.formBuilder.control(value));
      });
    }
    
    // Set image previews
    if (this.product.images && this.product.images.length > 0) {
      this.imagePreviewUrls = [...this.product.images];
    }
    
    // Set 3D model preview
    if (this.product.model3dUrl) {
      this.modelPreviewUrl = this.product.model3dUrl;
    }
  }
  
  onFileChange(event: any) {
    if (event.target.files && event.target.files.length) {
      const files = event.target.files;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Preview image
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
  
  onModelFileChange(event: any) {
    if (event.target.files && event.target.files.length) {
      const file = event.target.files[0];
      this.selectedModel = file;
      
      // Preview model filename (can't really preview 3D models easily)
      this.modelPreviewUrl = 'Selected: ' + file.name;
      this.modelUploadProgress = 0;
    }
  }
  
  removeImage(index: number) {
    if (this.isEdit && this.product?.images && index < this.product.images.length) {
      // Remove from product images array (will be updated on save)
      this.imagePreviewUrls.splice(index, 1);
    } else {
      // Remove from selected images
      const adjustedIndex = this.isEdit && this.product?.images ? 
                           index - this.product.images.length : 
                           index;
      if (adjustedIndex >= 0 && adjustedIndex < this.selectedImages.length) {
        this.selectedImages.splice(adjustedIndex, 1);
        this.uploadProgress.splice(adjustedIndex, 1);
      }
      this.imagePreviewUrls.splice(index, 1);
    }
  }
  
  removeModel() {
    this.selectedModel = null;
    this.modelPreviewUrl = '';
    this.modelUploadProgress = 0;
  }
  
  addSpecification() {
    const newKey = `spec_${this.specKeys.length + 1}`;
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
    
    if (newKey && newKey !== oldKey) {
      const specGroup = this.productForm.get('specifications') as FormGroup;
      const value = specGroup.get(oldKey)?.value;
      
      // Remove old control
      specGroup.removeControl(oldKey);
      
      // Add new control with the same value
      specGroup.addControl(newKey, this.formBuilder.control(value));
      
      // Update the key in the array
      this.specKeys[index] = newKey;
    }
  }
  
  async onSubmit() {
    console.log('Form submitted', this.productForm.value);
    
    if (this.productForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      this.markFormGroupTouched(this.productForm);
      await this.showToast('Please fix the form errors before submitting.');
      return;
    }
    
    this.isSubmitting = true;
    console.log('Submitting started, isSubmitting =', this.isSubmitting);
    
    try {
      // Get form values
      const formData = this.productForm.value;
      console.log('Form data:', formData);
      
      // Process specifications
      const specifications: Record<string, any> = {};
      this.specKeys.forEach(key => {
        specifications[key] = formData.specifications[key];
      });
      console.log('Specifications:', specifications);
      
      // Create product object
      const productData: any = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        category: formData.category,
        brand: formData.brand,
        stock: Number(formData.stock),
        featured: Boolean(formData.featured),
        rating: Number(formData.rating),
        specifications
      };
      
      // Optional fields
      if (formData.salePrice) {
        productData.salePrice = Number(formData.salePrice);
      }
      
      if (formData.subcategory) {
        productData.subcategory = formData.subcategory;
      }
      
      console.log('Initial product data:', productData);
      
      // Generate a temporary ID for new products to use with file uploads
      const tempId = 'temp_' + new Date().getTime();
      const productId = this.isEdit && this.product ? this.product.id : tempId;
      console.log('Using product ID for uploads:', productId);
      
      // Handle file uploads first
      let imageUrls: string[] = [];
      let modelUrl: string | null = null;
      
      // Handle existing images if editing
      if (this.isEdit && this.product?.images) {
        // Only keep images that are still in the preview (not removed)
        imageUrls = this.imagePreviewUrls.filter(url => 
          this.product?.images.includes(url)
        );
      }
      
      console.log('Starting image uploads, count:', this.selectedImages.length);
      
      // Upload new images
      if (this.selectedImages.length > 0) {
        for (let i = 0; i < this.selectedImages.length; i++) {
          const file = this.selectedImages[i];
          console.log(`Uploading image ${i}: ${file.name}`);
          
          try {
            const downloadUrl = await this.uploadImage(file, productId, i);
            console.log(`Image ${i} uploaded successfully:`, downloadUrl);
            imageUrls.push(downloadUrl);
          } catch (error) {
            console.error(`Error uploading image ${i}:`, error);
            await this.showToast(`Failed to upload image: ${file.name}`);
          }
        }
      }
      
      // Upload 3D model if selected
      if (this.selectedModel) {
        console.log('Uploading 3D model:', this.selectedModel.name);
        try {
          modelUrl = await this.uploadModel(this.selectedModel, productId);
          console.log('3D model uploaded successfully:', modelUrl);
        } catch (error) {
          console.error('Error uploading 3D model:', error);
          await this.showToast(`Failed to upload 3D model: ${this.selectedModel.name}`);
        }
      } else if (this.isEdit && this.product?.model3dUrl) {
        // Keep existing model if not changed
        modelUrl = this.product.model3dUrl;
      }
      
      // Add image and model URLs to product data
      productData.images = imageUrls.length > 0 ? imageUrls : [this.defaultProductImage];
      
      if (modelUrl) {
        productData.model3dUrl = modelUrl;
      }
      
      console.log('Final product data to save:', productData);
      
      // Save to Firebase
      if (this.isEdit && this.product) {
        console.log('Updating existing product:', this.product.id);
        // Use await with firstValueFrom
        await firstValueFrom(this.productService.updateProduct(this.product.id, productData));
        console.log('Product updated successfully');
        await this.showToast('Product updated successfully.');
        this.formSubmitted.emit({ action: 'update', product: { id: this.product.id, ...productData } });
      } else {
        console.log('Creating new product');
        // Use await with firstValueFrom
        const newProductId = await firstValueFrom(this.productService.createProduct(productData));
        console.log('Product created successfully with ID:', newProductId);
        await this.showToast('Product created successfully.');
        this.formSubmitted.emit({ action: 'create', product: { id: newProductId, ...productData } });
      }
      
      // Navigate back to admin products page
      this.router.navigate(['/admin/products']);
    } catch (error) {
      console.error('Error saving product:', error);
      await this.showToast('Failed to save product. Please try again.');
    } finally {
      this.isSubmitting = false;
      console.log('Submission completed, isSubmitting =', this.isSubmitting);
    }
  }
  
  // Helper method to mark all form fields as touched
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }
  
  // Helper method to show toast messages
  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: message.includes('successfully') ? 'success' : 'danger'
    });
    await toast.present();
  }
  
  // Fixed cancel method with proper navigation
  cancel() {
    console.log('Cancel button clicked');
    // Emit the cancelEdit event for any parent components
    this.cancelEdit.emit();
    
    // Navigate back to admin products page
    this.router.navigate(['/admin/products']);
  }
  
  // Helper method to upload an image
  private async uploadImage(file: File, productId: string, index: number): Promise<string> {
    return new Promise((resolve, reject) => {
      this.productService.uploadProductImage(file, productId).subscribe({
        next: (url) => {
          this.uploadProgress[index] = 100;
          resolve(url);
        },
        error: (error) => {
          console.error('Error uploading image:', error);
          reject(error);
        }
      });
    });
  }
  
  // Helper method to upload a 3D model
  private async uploadModel(file: File, productId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.productService.upload3DModel(file, productId).subscribe({
        next: (url) => {
          this.modelUploadProgress = 100;
          resolve(url);
        },
        error: (error) => {
          console.error('Error uploading 3D model:', error);
          reject(error);
        }
      });
    });
  }
  
  // Convenience getter for easy access to form fields
  get f() { return this.productForm.controls; }
}