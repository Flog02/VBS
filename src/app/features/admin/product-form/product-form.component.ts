import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { 
  IonInput, IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption,
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCheckbox, IonList,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonChip,
  IonSpinner, IonBadge, IonToggle, IonContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  imageOutline, addOutline, closeOutline, trashOutline, 
  saveOutline, reloadOutline, checkmarkOutline, cubeOutline } from 'ionicons/icons';

import { Product } from '../../../core/models/product.model';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
  standalone: true,
  imports: [IonContent, 
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
    private productService: ProductService
  ) {
    addIcons({closeOutline,imageOutline,cubeOutline,addOutline,trashOutline,saveOutline,reloadOutline,checkmarkOutline});
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
      subcategory: this.product.subcategory,
      brand: this.product.brand,
      stock: this.product.stock,
      featured: this.product.featured,
      rating: this.product.rating
    });
    
    // Set spec keys and values
    if (this.product.specifications) {
      const specGroup = this.productForm.get('specifications') as FormGroup;
      this.specKeys = Object.keys(this.product.specifications);
      
      this.specKeys.forEach(key => {
        specGroup.addControl(key, this.formBuilder.control(this.product!.specifications[key]));
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
    if (this.isEdit && index < (this.product?.images.length || 0)) {
      // Remove from product images array (will be updated on save)
      this.imagePreviewUrls.splice(index, 1);
    } else {
      // Remove from selected images
      const adjustedIndex = this.isEdit ? index - (this.product?.images.length || 0) : index;
      this.selectedImages.splice(adjustedIndex, 1);
      this.imagePreviewUrls.splice(index, 1);
      this.uploadProgress.splice(adjustedIndex, 1);
    }
  }
  
  removeModel() {
    this.selectedModel = null;
    this.modelPreviewUrl = this.isEdit && this.product?.model3dUrl ? '' : '';
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
    if (this.productForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.productForm.controls).forEach(key => {
        const control = this.productForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    
    this.isSubmitting = true;
    
    try {
      const formData = this.productForm.value;
      
      // Process specifications
      const specifications: Record<string, any> = {};
      this.specKeys.forEach(key => {
        specifications[key] = formData.specifications[key];
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
        specifications
      };
      
      // Optional fields
      if (formData.salePrice) {
        productData.salePrice = Number(formData.salePrice);
      }
      
      if (formData.subcategory) {
        productData.subcategory = formData.subcategory;
      }
      
      // Handle existing images
      let images: string[] = [];
      if (this.isEdit && this.product) {
        // Keep the remaining images after any removals
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
      
      // Add images to product data
      productData.images = images;
      
      // Handle 3D model upload
      if (this.selectedModel) {
        const productId = this.isEdit && this.product ? this.product.id : 'temp';
        try {
          const modelUrl = await this.uploadModel(this.selectedModel, productId);
          productData.model3dUrl = modelUrl;
        } catch (error) {
          console.error('Error uploading 3D model:', error);
        }
      } else if (this.isEdit && this.product && this.product.model3dUrl && this.modelPreviewUrl) {
        // Keep existing model URL
        productData.model3dUrl = this.product.model3dUrl;
      }
      
      // Create or update product
      if (this.isEdit && this.product) {
        await this.productService.updateProduct(this.product.id, productData).toPromise();
        this.formSubmitted.emit({ action: 'update', product: { id: this.product.id, ...productData } });
      } else {
        const productId = await this.productService.createProduct(productData).toPromise();
        this.formSubmitted.emit({ action: 'create', product: { id: productId, ...productData } });
      }
      
      this.isSubmitting = false;
    } catch (error) {
      console.error('Error saving product:', error);
      this.isSubmitting = false;
    }
  }
  
  cancel() {
    this.cancelEdit.emit();
  }
  
  async uploadImage(file: File, productId: string, index: number): Promise<string> {
    return new Promise((resolve, reject) => {
      this.productService.uploadProductImage(file, productId).subscribe(
        url => {
          this.uploadProgress[index] = 100;
          resolve(url);
        },
        error => {
          reject(error);
        }
      );
    });
  }
  
  async uploadModel(file: File, productId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.productService.upload3DModel(file, productId).subscribe(
        url => {
          this.modelUploadProgress = 100;
          resolve(url);
        },
        error => {
          reject(error);
        }
      );
    });
  }
  
  // Convenience getter for easy access to form fields
  get f() { return this.productForm.controls; }
}