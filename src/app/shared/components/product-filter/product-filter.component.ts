import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonButton, 
  IonIcon, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonCheckbox, 
  IonRange, 
  IonToggle,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonAccordionGroup,
  IonAccordion
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  filterOutline, 
  starOutline, 
  star, 
  pricetagsOutline,
  chevronDownOutline,
  chevronUpOutline
} from 'ionicons/icons';
import { FilterOptions } from '../../../core/models/filter-options.model';

@Component({
  selector: 'app-product-filter',
  templateUrl: './product-filter.component.html',
  styleUrls: ['./product-filter.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonCheckbox,
    IonRange,
    IonToggle,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonAccordionGroup,
    IonAccordion
  ]
})
export class ProductFilterComponent implements OnInit {
  @Input() availableCategories: { id: string; name: string }[] = [];
  @Input() availableBrands: { id: string; name: string }[] = [];
  @Input() initialFilters: FilterOptions = {
    categories: [],
    brands: [],
    priceRange: { min: 0, max: 5000 },
    rating: 0,
    availability: false
  };

  @Output() filterChange = new EventEmitter<FilterOptions>();
  @Output() cancel = new EventEmitter<void>();
  
  filters: FilterOptions = {
    categories: [],
    brands: [],
    priceRange: { min: 0, max: 5000 },
    rating: 0,
    availability: false
  };
  
  ratingOptions = [5, 4, 3, 2, 1];
  
  constructor() {
    addIcons({
      filterOutline,
      starOutline,
      star,
      pricetagsOutline,
      chevronDownOutline,
      chevronUpOutline
    });
  }
  
  ngOnInit() {
    // Clone the initial filters to avoid modifying the original object
    this.filters = {
      categories: [...this.initialFilters.categories],
      brands: [...this.initialFilters.brands],
      priceRange: { 
        min: this.initialFilters.priceRange.min, 
        max: this.initialFilters.priceRange.max 
      },
      rating: this.initialFilters.rating,
      availability: this.initialFilters.availability
    };
  }
  
  toggleCategory(categoryId: string) {
    const index = this.filters.categories.indexOf(categoryId);
    if (index > -1) {
      this.filters.categories.splice(index, 1);
    } else {
      this.filters.categories.push(categoryId);
    }
  }
  
  toggleBrand(brandId: string) {
    const index = this.filters.brands.indexOf(brandId);
    if (index > -1) {
      this.filters.brands.splice(index, 1);
    } else {
      this.filters.brands.push(brandId);
    }
  }
  
  setRating(rating: number) {
    this.filters.rating = this.filters.rating === rating ? 0 : rating;
  }
  
  isCategorySelected(categoryId: string): boolean {
    return this.filters.categories.includes(categoryId);
  }
  
  isBrandSelected(brandId: string): boolean {
    return this.filters.brands.includes(brandId);
  }
  
  isRatingSelected(rating: number): boolean {
    return this.filters.rating === rating;
  }
  
  resetFilters() {
    this.filters = {
      categories: [],
      brands: [],
      priceRange: { min: 0, max: 5000 },
      rating: 0,
      availability: false
    };
  }
  
  applyFilters() {
    this.filterChange.emit(this.filters);
  }
  
  cancelFilters() {
    this.cancel.emit();
  }
  
  formatPriceLabel(value: number): string {
    return `$${value}`;
  }
}

export { FilterOptions };
