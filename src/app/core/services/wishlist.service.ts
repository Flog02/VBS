import { Injectable } from '@angular/core';
import { 
  Firestore, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  serverTimestamp 
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { Wishlist,WishlistItem } from '../models/wishlist.model';
import { AuthService } from './auth.service';
import { ProductService } from './product.service';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private wishlistSubject = new BehaviorSubject<Wishlist | null>(null);
  public wishlist$ = this.wishlistSubject.asObservable();
  
  public wishlistItemsCount$ = this.wishlist$.pipe(
    map(wishlist => wishlist ? wishlist.items.length : 0)
  );

  public wishlistProducts$ = this.wishlist$.pipe(
    switchMap(wishlist => {
      if (!wishlist || wishlist.items.length === 0) {
        return of([]);
      }
      
      const productIds = wishlist.items.map(item => item.productId);
      return this.productService.getProductsByIds(productIds);
    })
  );

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private productService: ProductService
  ) {
    // Initialize wishlist when user logs in
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadWishlist(user.uid);
      } else {
        this.wishlistSubject.next(null);
      }
    });
  }

  private async loadWishlist(userId: string): Promise<void> {
    try {
      const wishlistDoc = await getDoc(doc(this.firestore, `wishlists/${userId}`));
      if (wishlistDoc.exists()) {
        const wishlistData = wishlistDoc.data() as Omit<Wishlist, 'userId'>;
        this.wishlistSubject.next({
          userId,
          ...wishlistData
        });
      } else {
        // Create empty wishlist if it doesn't exist
        const newWishlist: Wishlist = {
          userId,
          items: [],
          updatedAt: new Date()
        };
        await setDoc(doc(this.firestore, `wishlists/${userId}`), {
          items: [],
          updatedAt: serverTimestamp()
        });
        this.wishlistSubject.next(newWishlist);
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  }

  isInWishlist(productId: string): Observable<boolean> {
    return this.wishlist$.pipe(
      map(wishlist => {
        if (!wishlist) {
          return false;
        }
        return wishlist.items.some(item => item.productId === productId);
      })
    );
  }

  toggleWishlistItem(productId: string): Observable<void> {
    return this.isInWishlist(productId).pipe(
      take(1),
      switchMap(isInWishlist => {
        if (isInWishlist) {
          return this.removeFromWishlist(productId);
        } else {
          return this.addToWishlist(productId);
        }
      })
    );
  }

  private addToWishlist(productId: string): Observable<void> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return of(undefined);
    }

    return this.productService.getProductById(productId).pipe(
      take(1),
      switchMap((product: Product) => {
        const wishlist = this.wishlistSubject.value;
        
        if (!wishlist) {
          return of(undefined);
        }

        // Add new item
        const newItem: WishlistItem = {
          productId,
          addedAt: new Date()
        };
        
        const updatedItems = [...wishlist.items, newItem];
        
        // Update wishlist in Firestore
        const wishlistRef = doc(this.firestore, `wishlists/${userId}`);
        return from(updateDoc(wishlistRef, {
          items: updatedItems,
          updatedAt: serverTimestamp()
        })).pipe(
          tap(() => {
            this.wishlistSubject.next({
              ...wishlist,
              items: updatedItems,
              updatedAt: new Date()
            });
          })
        );
      })
    );
  }

  private removeFromWishlist(productId: string): Observable<void> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return of(undefined);
    }

    const wishlist = this.wishlistSubject.value;
    if (!wishlist) {
      return of(undefined);
    }

    // Filter out the product
    const updatedItems = wishlist.items.filter(item => item.productId !== productId);
    
    // Update wishlist in Firestore
    const wishlistRef = doc(this.firestore, `wishlists/${userId}`);
    return from(updateDoc(wishlistRef, {
      items: updatedItems,
      updatedAt: serverTimestamp()
    })).pipe(
      tap(() => {
        this.wishlistSubject.next({
          ...wishlist,
          items: updatedItems,
          updatedAt: new Date()
        });
      })
    );
  }

  clearWishlist(): Observable<void> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return of(undefined);
    }

    const wishlist = this.wishlistSubject.value;
    if (!wishlist) {
      return of(undefined);
    }

    // Update wishlist in Firestore
    const wishlistRef = doc(this.firestore, `wishlists/${userId}`);
    return from(updateDoc(wishlistRef, {
      items: [],
      updatedAt: serverTimestamp()
    })).pipe(
      tap(() => {
        this.wishlistSubject.next({
          ...wishlist,
          items: [],
          updatedAt: new Date()
        });
      })
    );
  }
}