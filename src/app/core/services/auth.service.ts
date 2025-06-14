// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { 
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  UserCredential,
  onAuthStateChanged,
  User as FirebaseUser
} from '@angular/fire/auth';
import { 
  Firestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp 
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable, from, of, firstValueFrom } from 'rxjs';
import { switchMap, tap, map } from 'rxjs/operators';
import { User } from '../models/user.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  public isAdmin$ = this.currentUser$.pipe(
    map(user => user?.role === 'admin')
  );
  public isLoggedIn$ = this.currentUser$.pipe(
    map(user => !!user)
  );

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {
    this.initAuthListener();
  }

  // ADD THIS METHOD - Password change functionality
  changePassword(passwordData: { oldPassword: string; newPassword: string }): Observable<void> {
    return new Observable(observer => {
      const user = this.auth.currentUser;
      
      if (!user || !user.email) {
        observer.error(new Error('No user logged in'));
        return;
      }
      
      console.log('Starting password change process for user:', user.email);
      
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, passwordData.oldPassword);
      
      reauthenticateWithCredential(user, credential)
        .then(() => {
          console.log('Re-authentication successful, updating password...');
          // If re-authentication successful, update password
          return updatePassword(user, passwordData.newPassword);
        })
        .then(() => {
          console.log('Password updated successfully');
          observer.next();
          observer.complete();
        })
        .catch(error => {
          console.error('Password change error:', error);
          observer.error(error);
        });
    });
  }

  // Refresh user data from Firestore - useful when roles change
  refreshUserData(): Observable<User | null> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      console.warn('Cannot refresh user data: No authenticated user');
      return of(null);
    }
    
    console.log('Refreshing user data for:', currentUser.uid);
    return from(this.getUserData(currentUser.uid)).pipe(
      tap(userData => {
        if (userData) {
          console.log('User data refreshed successfully, role:', userData.role);
          // Update the local user object
          this.currentUserSubject.next(userData);
        } else {
          console.warn('Failed to refresh user data: No data found');
        }
      })
    );
  }

  // Force refresh the Firebase auth token
  async forceTokenRefresh(): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      console.warn('Cannot refresh token: No authenticated user');
      return;
    }
    
    try {
      // Force token refresh
      await currentUser.getIdToken(true);
      console.log('Auth token forcefully refreshed');
      
      // Refresh user data using firstValueFrom instead of toPromise
      const userData = await firstValueFrom(this.refreshUserData());
      console.log('User data after token refresh:', userData?.role);
      
      // Reload the current route to ensure guards reevaluate
      const currentUrl = this.router.url;
      this.router.navigateByUrl('/', {skipLocationChange: true}).then(() => {
        console.log('Navigation refreshed, returning to:', currentUrl);
        this.router.navigate([currentUrl]);
      });
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
  }

  private initAuthListener(): void {
    onAuthStateChanged(this.auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? `User: ${firebaseUser.uid}` : 'No user');
      
      if (firebaseUser) {
        try {
          // Ensure the user document exists
          const userData = await this.ensureUserExists(firebaseUser);
          
          // Update the current user subject
          this.currentUserSubject.next(userData);
          console.log('User authenticated, role:', userData.role);
          
          // Update last login timestamp
          const userRef = doc(this.firestore, `users/${firebaseUser.uid}`);
          await updateDoc(userRef, { lastLoginAt: serverTimestamp() })
            .catch(err => console.error('Error updating last login:', err));
        } catch (error) {
          console.error('Error in auth listener:', error);
          this.currentUserSubject.next(null);
        }
      } else {
        console.log('No Firebase user, setting current user to null');
        this.currentUserSubject.next(null);
      }
    }, (error) => {
      console.error('Auth state observer error:', error);
    });
  }

  async getUserData(uid: string): Promise<User | null> {
    if (!uid) {
      console.error('getUserData called with empty uid');
      return null;
    }

    try {
      console.log(`Attempting to fetch user data for uid: ${uid}`);
      
      // Create reference to the user document
      const userDocRef = doc(this.firestore, `users/${uid}`);
      
      // Fetch the document with retry logic
      let userDoc;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          userDoc = await getDoc(userDocRef);
          break; // Success, exit retry loop
        } catch (retryError: any) {
          retryCount++;
          console.warn(`Attempt ${retryCount}/${maxRetries} failed:`, retryError.message);
          
          if (retryCount >= maxRetries) {
            throw retryError; // Final attempt failed
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
      
      if (userDoc && userDoc.exists()) {
        console.log('User document found');
        const userData = userDoc.data();
        
        // Return the user data with the uid
        return { uid, ...userData } as User;
      } else {
        console.warn(`No user document found for uid: ${uid}`);
        return null;
      }
    } catch (error: any) {
      console.error('Error getting user data:', error);
      
      // Don't return null immediately for certain recoverable errors
      if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
        console.error('Temporary Firebase error, will retry later');
        throw error; // Let the caller handle retry
      }
      
      if (error.code) {
        console.error('Firebase error code:', error.code);
        
        switch (error.code) {
          case 'permission-denied':
            console.error('Firebase permissions error. Check your security rules.');
            console.error('Current auth state:', this.auth.currentUser ? 'Logged in' : 'Not logged in');
            break;
          case 'not-found':
            console.error('Document not found. Check the path.');
            break;
          default:
            console.error('Other Firebase error code:', error.code);
        }
      }
      
      return null;
    }
  }

  register(email: string, password: string, displayName: string): Observable<User> {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(async (userCredential: UserCredential) => {
        const { user } = userCredential;
        
        // Update display name
        await updateProfile(user, { displayName });
        
        // Create user document in Firestore
        const newUser: Omit<User, 'uid'> = {
          email: user.email!,
          displayName,
          role: 'customer', // Default role
          createdAt: new Date(),
          lastLoginAt: new Date(),
          updatedAt: new Date()
        };
        
        const userRef = doc(this.firestore, `users/${user.uid}`);
        try {
          await setDoc(userRef, newUser);
          console.log('User document created successfully');
        } catch (error) {
          console.error('Error creating user document:', error);
          throw error; // Re-throw to handle in the UI
        }
        
        return { uid: user.uid, ...newUser } as User;
      }),
      tap(user => {
        this.currentUserSubject.next(user);
      })
    );
  }

  async ensureUserExists(firebaseUser: FirebaseUser): Promise<User> {
    try {
      console.log('Ensuring user exists for:', firebaseUser.uid);
      
      // Try to get existing user data
      const userData = await this.getUserData(firebaseUser.uid);
      
      // If user data exists, return it
      if (userData) {
        console.log('User document found, role:', userData.role);
        return userData;
      }
      
      // Double-check: Try to get the document directly to be absolutely sure it doesn't exist
      const userRef = doc(this.firestore, `users/${firebaseUser.uid}`);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        // Document exists but getUserData failed - return the existing data
        console.log('User document exists (direct check), using existing data');
        const existingData = userDoc.data();
        return { uid: firebaseUser.uid, ...existingData } as User;
      }
      
      // User document truly doesn't exist, create it
      console.log('Creating new user document for:', firebaseUser.uid);
      const newUser: Omit<User, 'uid'> = {
        email: firebaseUser.email || 'unknown',
        displayName: firebaseUser.displayName || 'User',
        role: 'customer', // Default role for new users only
        createdAt: new Date(),
        lastLoginAt: new Date(),
        updatedAt: new Date()
      };
      
      // Use setDoc with merge option to avoid overwriting existing fields
      await setDoc(userRef, newUser, { merge: true });
      console.log('New user document created with customer role');
      
      return { uid: firebaseUser.uid, ...newUser } as User;
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      
      // If there's an error, try one more time to get existing user data
      // This prevents role reset in case of temporary network issues
      try {
        const userRef = doc(this.firestore, `users/${firebaseUser.uid}`);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          console.log('Fallback: Found existing user document');
          const existingData = userDoc.data();
          return { uid: firebaseUser.uid, ...existingData } as User;
        }
      } catch (fallbackError) {
        console.error('Fallback getUserData also failed:', fallbackError);
      }
      
      throw error;
    }
  }

  login(email: string, password: string): Observable<User> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(async (userCredential: UserCredential) => {
        const { user } = userCredential;
        const userData = await this.getUserData(user.uid);
        if (!userData) {
          throw new Error('User data not found');
        }
        return userData;
      }),
      tap(user => {
        this.currentUserSubject.next(user);
        console.log('User logged in, role:', user.role);
      })
    );
  }

  resetPassword(email: string): Observable<void> {
    return from(sendPasswordResetEmail(this.auth, email));
  }

  updateUserProfile(user: Partial<User>): Observable<void> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) {
      return of(undefined);
    }

    const userRef = doc(this.firestore, `users/${currentUser.uid}`);
    return from(updateDoc(userRef, { ...user, updatedAt: serverTimestamp() })).pipe(
      tap(() => {
        // Update local user object
        this.currentUserSubject.next({
          ...currentUser,
          ...user,
          updatedAt: new Date()
        });
        
        if (user.role) {
          console.log('User role updated to:', user.role);
        }
      })
    );
  }

  getCurrentUserId(): string | null {
    return this.currentUserSubject.value?.uid || null;
  }
  
  getCurrentUserRole(): string | null {
    return this.currentUserSubject.value?.role || null;
  }

  getCurrentUserSync(): User | null {
    return this.currentUserSubject.getValue();
  }
  
  // Check if current user is an admin - useful for guards and components
  isAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'admin';
  }

  getCurrentUser(): Observable<User | null> {
    return this.currentUser$;
  }

  logout(): Observable<void> {
    return from(signOut(this.auth)).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
        
        // Redirect to login with logout parameter
        this.router.navigate(['/auth/login'], { 
          queryParams: { loggedOut: 'true' } 
        });
      })
    );
  }
}