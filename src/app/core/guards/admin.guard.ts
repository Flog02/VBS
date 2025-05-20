// src/app/core/guards/admin.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, tap, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

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
    console.log('AdminGuard - Checking if user is admin...');
    
    // First, force a refresh of user data to ensure we have the latest role
    return this.authService.refreshUserData().pipe(
      take(1),
      map(user => {
        const isAdmin = user?.role === 'admin';
        console.log('AdminGuard - User data:', user);
        console.log('AdminGuard - Is admin:', isAdmin);
        return isAdmin;
      }),
      tap(isAdmin => {
        if (!isAdmin) {
          console.warn('AdminGuard - Access denied: User is not an admin');
          // Redirect to home page if not admin
          this.router.navigate(['/']);
        } else {
          console.log('AdminGuard - Access granted: User is an admin');
        }
      }),
      catchError(error => {
        console.error('AdminGuard - Error checking admin status:', error);
        this.router.navigate(['/']);
        return of(false);
      })
    );
  }
}