import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, 
  IonButton, IonIcon, IonSearchbar, IonBadge, IonAlert, IonSelect, IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personOutline, shieldOutline, searchOutline, arrowBackOutline } from 'ionicons/icons';

import { AdminService } from '../../../core/services/admin.service';
import { User } from '../../../core/models/user.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.page.html',
  styleUrls: ['./user-management.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, 
    IonButton, IonIcon, IonSearchbar, IonBadge, IonAlert, IonSelect, IonSelectOption
  ]
})
export class UserManagementPage implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
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
  
  // Alert buttons
  roleChangeAlertButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
      handler: () => this.cancelRoleChange()
    },
    {
      text: 'Confirm',
      handler: () => this.changeUserRole()
    }
  ];

  
  
  constructor(private adminService: AdminService,
    private router: Router

  ) {
    addIcons({arrowBackOutline,personOutline,shieldOutline,searchOutline});
  }
  
  ngOnInit() {
    this.loadUsers();
  }
  
  loadUsers() {
    this.isLoading = true;
    
    // Use the method that exists in your AdminService
    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        console.log('Loaded users:', users); // Debug log
        this.users = users || [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.users = [];
        this.filteredUsers = [];
        this.isLoading = false;
      }
    });
  }
  
  applyFilters() {
    let filtered = [...this.users];
    
    // Apply role filter
    if (this.selectedRole) {
      filtered = filtered.filter(user => user.role === this.selectedRole);
    }
    
    // Apply search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        (user.displayName?.toLowerCase().includes(searchLower) || false) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }
    
    this.filteredUsers = filtered;
  }
  
  onSearchChange(event: any) {
    this.searchTerm = event.detail.value || '';
    this.applyFilters();
  }
  
  onRoleChange(event: any) {
    this.selectedRole = event.detail.value || '';
    this.applyFilters();
  }
  
  confirmRoleChange(user: User) {
    this.userToUpdate = user;
    this.newRole = user.role === 'admin' ? 'customer' : 'admin';
    this.showRoleAlert = true;
  }
  
  changeUserRole() {
    if (!this.userToUpdate) return;
    
    // Use your existing updateUserRole method (Promise-based)
    this.adminService.updateUserRole(this.userToUpdate.uid, this.newRole)
      .then(() => {
        console.log('Role updated successfully');
        // Update the user in the local array
        const userIndex = this.users.findIndex(u => u.uid === this.userToUpdate?.uid);
        if (userIndex !== -1) {
          this.users[userIndex] = {
            ...this.users[userIndex],
            role: this.newRole
          };
        }
        
        this.applyFilters(); // Refresh filtered list
        this.userToUpdate = null;
        this.showRoleAlert = false;
      })
      .catch(error => {
        console.error('Error changing user role:', error);
        this.showRoleAlert = false;
      });
  }
  
  cancelRoleChange() {
    this.userToUpdate = null;
    this.showRoleAlert = false;
  }
  
  formatDate(date: any): string {
    if (!date) return 'Never';
    
    try {
      // Handle Firestore Timestamp
      if (date && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString();
      }
      // Handle regular Date
      if (date instanceof Date) {
        return date.toLocaleDateString();
      }
      // Handle string dates
      return new Date(date).toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  }
  
  getRoleChangeMessage(): string {
    if (!this.userToUpdate) return '';
    const userName = this.userToUpdate.displayName || this.userToUpdate.email;
    return `Are you sure you want to change ${userName}'s role to ${this.newRole}?`;
  }
  
  trackByUid(index: number, user: User): string {
    return user.uid;
  }

  goBack() {
  this.router.navigate(['/admin']);
}
}