// src/app/core/services/cart.service.ts
import { Injectable } from '@angular/core';
import { 
  Firestore, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  deleteDoc, 
  serverTimestamp 
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { Cart, CartItem } from '../models/cart.model';
import { AuthService } from './auth.service';
import { ProductService } from './product.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartSubject = new BehaviorSubject<Cart | null>(null);
  public cart$ = this.cartSubject.asObservable();
  
  public cartItemsCount$ = this.cart$.pipe(
    map(cart => cart ? cart.items.reduce((acc, item) => acc + item.quantity, 0) : 0)
  );

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private productService: ProductService
  ) {
    // Initialize cart when user logs in
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadCart(user.uid);
      } else {
        this.cartSubject.next(null);
      }
    });
  }

  private async loadCart(userId: string): Promise<void> {
    try {
      const cartDoc = await getDoc(doc(this.firestore, `carts/${userId}`));
      if (cartDoc.exists()) {
        const cartData = cartDoc.data() as Omit<Cart, 'userId'>;
        this.cartSubject.next({
          userId,
          ...cartData
        });
      } else {
        // Create empty cart if it doesn't exist
        const newCart: Cart = {
          userId,
          items: [],
          subtotal: 0,
          updatedAt: new Date()
        };
        await setDoc(doc(this.firestore, `carts/${userId}`), {
          items: [],
          subtotal: 0,
          updatedAt: serverTimestamp()
        });
        this.cartSubject.next(newCart);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  }

  addToCart(productId: string, quantity: number = 1): Observable<void> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return of(undefined);
    }

    return this.productService.getProductById(productId).pipe(
      take(1),
      switchMap(product => {
        const cart = this.cartSubject.value;
        
        if (!cart) {
          return of(undefined);
        }

        // Check if product is in stock
        if (product.stock < quantity) {
          throw new Error(`Only ${product.stock} items available`);
        }

        // Find if product already in cart
        const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
        let updatedItems: CartItem[];
        
        if (existingItemIndex > -1) {
          // Update existing item
          const existingItem = cart.items[existingItemIndex];
          const newQuantity = existingItem.quantity + quantity;
          
          // Check stock again
          if (newQuantity > product.stock) {
            throw new Error(`Cannot add ${quantity} more items. Only ${product.stock - existingItem.quantity} more available.`);
          }
          
          updatedItems = [...cart.items];
          updatedItems[existingItemIndex] = {
            ...existingItem,
            quantity: newQuantity
          };
        } else {
          // Add new item
          const newItem: CartItem = {
            productId,
            productName: product.name,
            productImage: product.images[0] || '',
            quantity,
            price: product.salePrice || product.price,
            stock: product.stock
          };
          updatedItems = [...cart.items, newItem];
        }

        // Calculate new subtotal
        const subtotal = updatedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        
        // Update cart in Firestore
        const cartRef = doc(this.firestore, `carts/${userId}`);
        return from(updateDoc(cartRef, {
          items: updatedItems,
          subtotal,
          updatedAt: serverTimestamp()
        })).pipe(
          tap(() => {
            this.cartSubject.next({
              ...cart,
              items: updatedItems,
              subtotal,
              updatedAt: new Date()
            });
          })
        );
      })
    );
  }

  updateCartItemQuantity(productId: string, quantity: number): Observable<void> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return of(undefined);
    }

    return this.productService.getProductById(productId).pipe(
      take(1),
      switchMap(product => {
        const cart = this.cartSubject.value;
        
        if (!cart) {
          return of(undefined);
        }

        // Check if quantity is valid
        if (quantity <= 0) {
          return this.removeFromCart(productId);
        }

        // Check if product is in stock
        if (product.stock < quantity) {
          throw new Error(`Only ${product.stock} items available`);
        }

        // Find product in cart
        const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
        
        if (existingItemIndex === -1) {
          throw new Error('Item not found in cart');
        }

        // Update item
        const updatedItems = [...cart.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity
        };

        // Calculate new subtotal
        const subtotal = updatedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        
        // Update cart in Firestore
        const cartRef = doc(this.firestore, `carts/${userId}`);
        return from(updateDoc(cartRef, {
          items: updatedItems,
          subtotal,
          updatedAt: serverTimestamp()
        })).pipe(
          tap(() => {
            this.cartSubject.next({
              ...cart,
              items: updatedItems,
              subtotal,
              updatedAt: new Date()
            });
          })
        );
      })
    );
  }

  removeFromCart(productId: string): Observable<void> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return of(undefined);
    }

    const cart = this.cartSubject.value;
    if (!cart) {
      return of(undefined);
    }

    // Filter out the product
    const updatedItems = cart.items.filter(item => item.productId !== productId);
    
    // Calculate new subtotal
    const subtotal = updatedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    // Update cart in Firestore
    const cartRef = doc(this.firestore, `carts/${userId}`);
    return from(updateDoc(cartRef, {
      items: updatedItems,
      subtotal,
      updatedAt: serverTimestamp()
    })).pipe(
      tap(() => {
        this.cartSubject.next({
          ...cart,
          items: updatedItems,
          subtotal,
          updatedAt: new Date()
        });
      })
    );
  }

  clearCart(): Observable<void> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return of(undefined);
    }

    const cart = this.cartSubject.value;
    if (!cart) {
      return of(undefined);
    }

    // Update cart in Firestore
    const cartRef = doc(this.firestore, `carts/${userId}`);
    return from(updateDoc(cartRef, {
      items: [],
      subtotal: 0,
      updatedAt: serverTimestamp()
    })).pipe(
      tap(() => {
        this.cartSubject.next({
          ...cart,
          items: [],
          subtotal: 0,
          updatedAt: new Date()
        });
      })
    );
  }
}