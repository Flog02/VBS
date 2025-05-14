// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { 
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
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
import { BehaviorSubject, Observable, from, of } from 'rxjs';
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

  private initAuthListener(): void {
    onAuthStateChanged(this.auth, (firebaseUser) => {
      if (firebaseUser) {
        this.getUserData(firebaseUser.uid).then(userData => {
          if (userData) {
            this.currentUserSubject.next(userData);
            // Update last login timestamp
            const userRef = doc(this.firestore, `users/${firebaseUser.uid}`);
            updateDoc(userRef, { lastLoginAt: serverTimestamp() });
          } else {
            this.currentUserSubject.next(null);
          }
        });
      } else {
        this.currentUserSubject.next(null);
      }
    });
  }

  async getUserData(uid: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(this.firestore, `users/${uid}`));
      if (userDoc.exists()) {
        return { uid, ...userDoc.data() } as User;
      }
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
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
          lastLoginAt: new Date()
        };
        
        await setDoc(doc(this.firestore, `users/${user.uid}`), newUser);
        
        return { uid: user.uid, ...newUser } as User;
      }),
      tap(user => {
        this.currentUserSubject.next(user);
      })
    );
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
      })
    );
  }

  logout(): Observable<void> {
    return from(signOut(this.auth)).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/auth/login']);
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
      })
    );
  }

  getCurrentUserId(): string | null {
    return this.currentUserSubject.value?.uid || null;
  }
}