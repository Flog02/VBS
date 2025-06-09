// src/app/core/guards/admin.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take, tap, filter, timeout, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      // Wait for the auth state to be determined (not null/undefined initial state)
      filter(user => user !== undefined), // This filters out the initial undefined state
      take(1),
      map(user => !!user),
      tap(isLoggedIn => {
        if (!isLoggedIn) {
          // Redirect to login page with return URL
          this.router.navigate(['/auth/login'], {
            queryParams: { returnUrl: state.url }
          });
        }
      }),
      // Add timeout as safety net
      timeout(5000),
      catchError(() => {
        // If timeout or error, assume not authenticated
        this.router.navigate(['/auth/login'], {
          queryParams: { returnUrl: state.url }
        });
        return of(false);
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      // Wait for the auth state to be determined (not the initial undefined state)
      filter(user => user !== undefined), // This is key - wait for auth resolution
      take(1),
      map(user => {
        // Check if user exists and has admin role
        if (!user) {
          console.log('AdminGuard: No user logged in');
          return false;
        }
        
        if (user.role !== 'admin') {
          console.log('AdminGuard: User is not admin, role:', user.role);
          return false;
        }
        
        console.log('AdminGuard: Admin access granted');
        return true;
      }),
      tap(isAdmin => {
        if (!isAdmin) {
          // Get current user to determine redirect
          const currentUser = this.authService.getCurrentUserSync();
          
          if (!currentUser) {
            // Not logged in - redirect to login
            this.router.navigate(['/auth/login'], {
              queryParams: { returnUrl: state.url }
            });
          } else {
            // Logged in but not admin - redirect to home
            this.router.navigate(['/home']);
            console.log('Access denied: User is not an admin');
          }
        }
      }),
      // Add timeout as safety net
      timeout(5000),
      catchError((error) => {
        console.error('AdminGuard timeout or error:', error);
        // If timeout or error, redirect to login
        this.router.navigate(['/auth/login'], {
          queryParams: { returnUrl: state.url }
        });
        return of(false);
      })
    );
  }
}