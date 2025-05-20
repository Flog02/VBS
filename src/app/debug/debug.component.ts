// src/app/debug/debug.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { Router } from '@angular/router';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { take } from 'rxjs/operators';
import { User } from '../core/models/user.model';

@Component({
  selector: 'app-debug',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px;">
      <h2>Auth Debug Panel</h2>
      <div>
        <h3>Current User</h3>
        <p><strong>User ID:</strong> {{ userId || 'Not logged in' }}</p>
        <p><strong>Email:</strong> {{ userEmail || 'None' }}</p>
        <p><strong>Display Name:</strong> {{ userDisplayName || 'None' }}</p>
        <p><strong>User Role:</strong> {{ userRole || 'None' }}</p>
        <p><strong>Is Admin:</strong> {{ isAdmin ? 'Yes' : 'No' }}</p>
        <p><strong>Is Logged In:</strong> {{ isLoggedIn ? 'Yes' : 'No' }}</p>
      </div>
      
      <div style="margin-top: 20px;">
        <button (click)="refreshData()">Refresh User Data</button>
        <button (click)="makeAdmin()">Make User Admin</button>
        <button (click)="makeCustomer()">Make User Customer</button>
        <button (click)="forceTokenRefresh()">Force Token Refresh</button>
        <button (click)="navigateToAdmin()">Go to Admin</button>
        <button (click)="logout()">Logout</button>
      </div>
      
      <div style="margin-top: 20px; border: 1px solid #ccc; padding: 10px;" *ngIf="logs.length">
        <h3>Logs</h3>
        <ul>
          <li *ngFor="let log of logs">{{ log }}</li>
        </ul>
        <button (click)="clearLogs()">Clear Logs</button>
      </div>
    </div>
  `
})
export class DebugComponent implements OnInit {
  userId: string | null = null;
  userEmail: string | null = null;
  userDisplayName: string | null = null;
  userRole: string | null = null;
  isAdmin = false;
  isLoggedIn = false;
  logs: string[] = [];
  private currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private firestore: Firestore
  ) {}

  ngOnInit() {
    this.subscribeToUserChanges();
  }

  subscribeToUserChanges() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.updateUserInfo();
      this.addLog(`User updated: ${user?.email}, role: ${user?.role}`);
    });
  }

  updateUserInfo() {
    this.userId = this.currentUser?.uid || null;
    this.userEmail = this.currentUser?.email || null;
    this.userDisplayName = this.currentUser?.displayName || null;
    this.userRole = this.currentUser?.role || null;
    this.isAdmin = this.currentUser?.role === 'admin';
    this.isLoggedIn = !!this.currentUser;
  }

  refreshData() {
    this.addLog('Refreshing user data...');
    this.authService.refreshUserData().subscribe(userData => {
      this.addLog(`User data refreshed: ${userData?.email}, role: ${userData?.role}`);
    });
  }

  makeAdmin() {
    if (!this.userId) {
      this.addLog('Error: No user logged in');
      return;
    }
    
    this.addLog('Setting user role to admin...');
    const userRef = doc(this.firestore, `users/${this.userId}`);
    updateDoc(userRef, { role: 'admin' })
      .then(() => {
        this.addLog('User role updated to admin in Firestore');
        this.refreshData();
      })
      .catch(error => {
        this.addLog(`Error updating role: ${error.message}`);
      });
  }

  makeCustomer() {
    if (!this.userId) {
      this.addLog('Error: No user logged in');
      return;
    }
    
    this.addLog('Setting user role to customer...');
    const userRef = doc(this.firestore, `users/${this.userId}`);
    updateDoc(userRef, { role: 'customer' })
      .then(() => {
        this.addLog('User role updated to customer in Firestore');
        this.refreshData();
      })
      .catch(error => {
        this.addLog(`Error updating role: ${error.message}`);
      });
  }

  forceTokenRefresh() {
    this.addLog('Forcing token refresh...');
    this.authService.forceTokenRefresh()
      .then(() => {
        this.addLog('Token refreshed successfully');
      })
      .catch(error => {
        this.addLog(`Error refreshing token: ${error.message}`);
      });
  }

  navigateToAdmin() {
    this.addLog('Navigating to admin dashboard...');
    this.router.navigate(['/admin']);
  }

  logout() {
    this.addLog('Logging out...');
    this.authService.logout().subscribe(() => {
      this.addLog('Logged out successfully');
    });
  }

  addLog(message: string) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    this.logs.unshift(`[${timestamp}] ${message}`);
  }

  clearLogs() {
    this.logs = [];
  }
}