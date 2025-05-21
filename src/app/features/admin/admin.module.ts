// src/app/features/admin/admin.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { ProductManagementPage } from './product-management/product-management.page';
import { ProductFormComponent } from './product-form/product-form.component';

import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    AdminRoutingModule,
    HeaderComponent,
    FooterComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    AdminDashboardComponent,
    ProductManagementPage,
    ProductFormComponent
  ],
  declarations: []
})
export class AdminModule {}