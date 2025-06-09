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
import { map, switchMap, take, tap, catchError } from 'rxjs/operators';
import { Wishlist, WishlistItem } from '../models/wishlist.model';
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
      console.log('Loading wishlist products for IDs:', productIds);

      
      
      return this.productService.getProductsByIds(productIds).pipe(
        tap(products => console.log('Loaded wishlist products:', products.length)),
        catchError(error => {
          console.error('Error loading wishlist products:', error);
          return of([]);
        })
      );
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
        console.log('User logged in, loading wishlist for:', user.uid);
        this.loadWishlist(user.uid);
      } else {
        console.log('User logged out, clearing wishlist');
        this.wishlistSubject.next(null);
      }
    });
  }

  private async loadWishlist(userId: string): Promise<void> {
    try {
      console.log('Loading wishlist for user:', userId);
      const wishlistDoc = await getDoc(doc(this.firestore, `wishlists/${userId}`));
      
      if (wishlistDoc.exists()) {
        const wishlistData = wishlistDoc.data() as Omit<Wishlist, 'userId'>;
        const wishlist = {
          userId,
          ...wishlistData,
          // Ensure items is always an array
          items: wishlistData.items || []
        };
        
        console.log('Wishlist loaded:', wishlist.items.length, 'items');
        this.wishlistSubject.next(wishlist);
      } else {
        // Create empty wishlist if it doesn't exist
        console.log('No wishlist found, creating new one');
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
      // Create empty wishlist on error
      this.wishlistSubject.next({
        userId,
        items: [],
        updatedAt: new Date()
      });
    }
  }

  isInWishlist(productId: string): Observable<boolean> {
    return this.wishlist$.pipe(
      map(wishlist => {
        if (!wishlist) {
          return false;
        }
        const isInWishlist = wishlist.items.some(item => item.productId === productId);
        console.log('Checking if', productId, 'is in wishlist:', isInWishlist);
        return isInWishlist;
      })
    );
  }

  toggleWishlistItem(productId: string): Observable<void> {
    console.log('Toggling wishlist item:', productId);
    
    return this.isInWishlist(productId).pipe(
      take(1),
      switchMap(isInWishlist => {
        console.log('Product', productId, 'is currently in wishlist:', isInWishlist);
        
        if (isInWishlist) {
          return this.removeFromWishlist(productId);
        } else {
          return this.addToWishlist(productId);
        }
      }),
      catchError(error => {
        console.error('Error toggling wishlist item:', error);
        return of(undefined);
      })
    );
  }

  private addToWishlist(productId: string): Observable<void> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      console.error('Cannot add to wishlist: No user ID');
      return of(undefined);
    }

    console.log('Adding product to wishlist:', productId);

    // Don't need to fetch product data, just add the ID
    const wishlist = this.wishlistSubject.value;
    
    if (!wishlist) {
      console.error('No wishlist found');
      return of(undefined);
    }

    // Check if already in wishlist
    const alreadyExists = wishlist.items.some(item => item.productId === productId);
    if (alreadyExists) {
      console.log('Product already in wishlist');
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
      items: updatedItems.map(item => ({
        productId: item.productId,
        addedAt: item.addedAt
      })),
      updatedAt: serverTimestamp()
    })).pipe(
      tap(() => {
        console.log('Product added to wishlist successfully');
        this.wishlistSubject.next({
          ...wishlist,
          items: updatedItems,
          updatedAt: new Date()
        });
      }),
      catchError(error => {
        console.error('Error adding to wishlist:', error);
        return of(undefined);
      })
    );
  }

  private removeFromWishlist(productId: string): Observable<void> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      console.error('Cannot remove from wishlist: No user ID');
      return of(undefined);
    }

    console.log('Removing product from wishlist:', productId);

    const wishlist = this.wishlistSubject.value;
    if (!wishlist) {
      console.error('No wishlist found');
      return of(undefined);
    }

    // Filter out the product
    const updatedItems = wishlist.items.filter(item => item.productId !== productId);
    
    // Update wishlist in Firestore
    const wishlistRef = doc(this.firestore, `wishlists/${userId}`);
    return from(updateDoc(wishlistRef, {
      items: updatedItems.map(item => ({
        productId: item.productId,
        addedAt: item.addedAt
      })),
      updatedAt: serverTimestamp()
    })).pipe(
      tap(() => {
        console.log('Product removed from wishlist successfully');
        this.wishlistSubject.next({
          ...wishlist,
          items: updatedItems,
          updatedAt: new Date()
        });
      }),
      catchError(error => {
        console.error('Error removing from wishlist:', error);
        return of(undefined);
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
      }),
      catchError(error => {
        console.error('Error clearing wishlist:', error);
        return of(undefined);
      })
    );
  }

  // Helper method to get wishlist count synchronously
  getWishlistCount(): number {
    const wishlist = this.wishlistSubject.value;
    return wishlist ? wishlist.items.length : 0;
  }

  // Helper method to check if product is in wishlist synchronously
  isInWishlistSync(productId: string): boolean {
    const wishlist = this.wishlistSubject.value;
    return wishlist ? wishlist.items.some(item => item.productId === productId) : false;
  }
}