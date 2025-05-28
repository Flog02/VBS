// src/app/core/services/order.service.ts
import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  docData, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit as limitTo,
  serverTimestamp 
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, from, of, throwError } from 'rxjs';
import { map, switchMap, take, catchError } from 'rxjs/operators';
import { Order, OrderItem } from '../models/order.model';
import { CartService } from './cart.service';
import { AuthService } from './auth.service';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private ordersCollection = collection(this.firestore, 'orders');

  constructor(
    private firestore: Firestore,
    private functions: Functions,
    private authService: AuthService,
    private cartService: CartService
  ) {}

  getOrdersByUser(limitCount: number = 10): Observable<Order[]> {
    return this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) {
          return of([]);
        }
        
        const ordersQuery = query(
          this.ordersCollection,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limitTo(limitCount)
        );
        
        return collectionData(ordersQuery, { idField: 'id' }) as Observable<Order[]>;
      })
    );
  }

  getOrderById(id: string): Observable<Order> {
    const orderDoc = doc(this.firestore, `orders/${id}`);
    return docData(orderDoc, { idField: 'id' }) as Observable<Order>;
  }

  getAllOrders(status?: string, limitCount: number = 20): Observable<Order[]> {
    let ordersQuery;
    
    if (status) {
      ordersQuery = query(
        this.ordersCollection,
        where('status', '==', status),
        orderBy('createdAt', 'desc'),
        limitTo(limitCount)
      );
    } else {
      ordersQuery = query(
        this.ordersCollection,
        orderBy('createdAt', 'desc'),
        limitTo(limitCount)
      );
    }
    
    return collectionData(ordersQuery, { idField: 'id' }) as Observable<Order[]>;
  }

  createOrder(
    paymentMethod: string, 
    pickupOption: boolean,
    pickupLocation?: string,
    shippingAddress?: Order['shippingAddress']
  ): Observable<string> {
    console.log('Creating order with:', { paymentMethod, pickupOption, pickupLocation, shippingAddress });
    
    return this.authService.currentUser$.pipe(
      take(1),
      switchMap((user: User | null) => {
        if (!user) {
          console.error('User not authenticated');
          return throwError(() => new Error('User not authenticated'));
        }
        
        console.log('User authenticated:', user.uid);
        
        return this.cartService.cart$.pipe(
          take(1),
          switchMap(cart => {
            if (!cart || cart.items.length === 0) {
              console.error('Cart is empty');
              return throwError(() => new Error('Cart is empty'));
            }
            
            console.log('Cart data:', cart);
            
            // Create order items from cart items
            const orderItems: OrderItem[] = cart.items.map(item => ({
              productId: item.productId,
              productName: item.productName,
              productImage: item.productImage || '',
              quantity: item.quantity,
              price: item.price
            }));
            
            // Calculate totals
            const subtotal = cart.subtotal;
            const tax = subtotal * 0.1;
            const deliveryFee = !pickupOption ? 5.99 : 0;
            const total = subtotal + tax + deliveryFee;
            
            console.log('Order totals:', { subtotal, tax, deliveryFee, total });
            
            // Create new order - only include defined fields
            const newOrder: any = {
              userId: user.uid,
              items: orderItems,
              subtotal,
              tax,
              total,
              status: 'pending',
              paymentMethod,
              paymentStatus: 'pending',
              pickupOption,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };

            // Only add pickup location if it's a pickup order
            if (pickupOption && pickupLocation) {
              newOrder.pickupLocation = pickupLocation;
            } else if (pickupOption) {
              newOrder.pickupLocation = 'vbs-main-store';
            }

            // Only add shipping address if it's a delivery order
            if (!pickupOption && shippingAddress) {
              newOrder.shippingAddress = shippingAddress;
            }
            
            console.log('New order object:', newOrder);
            
            // Add order to Firestore
            return from(addDoc(this.ordersCollection, newOrder)).pipe(
              switchMap(docRef => {
                console.log('Order created with ID:', docRef.id);
                
                // For demo purposes, simulate payment processing
                return this.simulatePaymentProcessing(docRef.id, paymentMethod, total);
              }),
              catchError(error => {
                console.error('Error creating order:', error);
                return throwError(() => error);
              })
            );
          })
        );
      }),
      catchError(error => {
        console.error('Error in createOrder:', error);
        return throwError(() => error);
      })
    );
  }

  private simulatePaymentProcessing(orderId: string, paymentMethod: string, amount: number): Observable<string> {
    console.log('Processing payment for order:', orderId);
    
    // Simulate payment processing delay
    return new Observable<string>(observer => {
      setTimeout(() => {
        try {
          // Simulate successful payment for demo
          const orderDoc = doc(this.firestore, `orders/${orderId}`);
          
          // Update order status based on payment method
          let newStatus: Order['status'] = 'processing';
          let paymentStatus: Order['paymentStatus'] = 'paid';
          
          // For cash payments, order goes to ready-for-pickup immediately
          if (paymentMethod === 'cash') {
            newStatus = 'ready-for-pickup';
            paymentStatus = 'pending'; // Cash will be paid on pickup
          }
          
          updateDoc(orderDoc, {
            paymentStatus,
            status: newStatus,
            updatedAt: serverTimestamp()
          }).then(() => {
            console.log('Order status updated successfully');
            
            // Clear the cart after successful order
            this.cartService.clearCart().subscribe({
              next: () => console.log('Cart cleared'),
              error: (error) => console.error('Error clearing cart:', error)
            });
            
            observer.next(orderId);
            observer.complete();
          }).catch(error => {
            console.error('Error updating order status:', error);
            observer.error(error);
          });
        } catch (error) {
          console.error('Error in payment simulation:', error);
          observer.error(error);
        }
      }, 1000); // 1 second delay to simulate processing
    });
  }

  updateOrderStatus(orderId: string, status: Order['status']): Observable<void> {
    const orderDoc = doc(this.firestore, `orders/${orderId}`);
    return from(updateDoc(orderDoc, {
      status,
      updatedAt: serverTimestamp()
    }));
  }

  updatePaymentStatus(orderId: string, paymentStatus: Order['paymentStatus']): Observable<void> {
    const orderDoc = doc(this.firestore, `orders/${orderId}`);
    return from(updateDoc(orderDoc, {
      paymentStatus,
      updatedAt: serverTimestamp()
    }));
  }
}