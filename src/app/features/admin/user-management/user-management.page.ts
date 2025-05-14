// src/app/features/admin/user-management/user-management.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, 
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, 
  IonSelect, IonSelectOption, IonSearchbar, IonBadge, IonAlert,
  IonInfiniteScroll, IonInfiniteScrollContent, IonSkeletonText,
  IonChip
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  searchOutline, filterOutline, personOutline, createOutline,
  shieldOutline, alertCircleOutline
} from 'ionicons/icons';

import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { AdminService } from '../../../core/services/admin.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.page.html',
  styleUrls: ['./user-management.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, 
    IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, 
    IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, 
    IonSelect, IonSelectOption, IonSearchbar, IonBadge, IonAlert,
    IonInfiniteScroll, IonInfiniteScrollContent, IonSkeletonText,
    IonChip,
    HeaderComponent, FooterComponent, LoadingSpinnerComponent, EmptyStateComponent
  ]
})
export class UserManagementPage implements OnInit {
  users: User[] = [];
  isLoading = true;
  
  // Filtering
  searchTerm = '';
  selectedRole = '';
  
  // Role change
  showRoleAlert = false;
  userToUpdate: User | null = null;
  newRole: 'admin' | 'customer' = 'customer';
  
  // Role options
  roleOptions = [
    { value: '', label: 'All Users' },
    { value: 'customer', label: 'Customers' },
    { value: 'admin', label: 'Administrators' }
  ];
  
  constructor(private adminService: AdminService) {
    addIcons({
      searchOutline, filterOutline, personOutline, createOutline,
      shieldOutline, alertCircleOutline
    });
  }
  
  ngOnInit() {
    this.loadUsers();
  }
  
  loadUsers() {
    this.isLoading = true;
    
    this.adminService.getAllUsers().subscribe(
      users => {
        // Apply role filter if needed
        if (this.selectedRole) {
          users = users.filter(user => user.role === this.selectedRole);
        }
        
        // Apply search filter if needed
        if (this.searchTerm) {
          const searchLower = this.searchTerm.toLowerCase();
          users = users.filter(user => 
            (user.displayName?.toLowerCase().includes(searchLower) || false) ||
            user.email.toLowerCase().includes(searchLower)
          );
        }
        
        this.users = users;
        this.isLoading = false;
      },
      error => {
        console.error('Error loading users:', error);
        this.isLoading = false;
      }
    );
  }
  
  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    this.loadUsers();
  }
  
  onRoleChange(event: any) {
    this.selectedRole = event.detail.value;
    this.loadUsers();
  }
  
  confirmRoleChange(user: User) {
    this.userToUpdate = user;
    this.newRole = user.role === 'admin' ? 'customer' : 'admin';
    this.showRoleAlert = true;
  }
  
  changeUserRole() {
    if (!this.userToUpdate) return;
    
    this.adminService.changeUserRole(this.userToUpdate.uid, this.newRole).subscribe(
      () => {
        // Update the user in the local array
        const userIndex = this.users.findIndex(u => u.uid === this.userToUpdate?.uid);
        if (userIndex !== -1) {
          this.users[userIndex] = {
            ...this.users[userIndex],
            role: this.newRole
          };
        }
        
        this.userToUpdate = null;
        this.showRoleAlert = false;
      },
      error => {
        console.error('Error changing user role:', error);
        this.showRoleAlert = false;
      }
    );
  }
  
  cancelRoleChange() {
    this.userToUpdate = null;
    this.showRoleAlert = false;
  }
  
  formatDate(date: any): string {
    if (!date) return '';
    
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  }
}