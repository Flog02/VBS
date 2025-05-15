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
  limit as limitTo, // Renamed the import to avoid naming conflict
  serverTimestamp 
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
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
    return this.authService.currentUser$.pipe(
      take(1),
      switchMap((user: User | null) => {
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        return this.cartService.cart$.pipe(
          take(1),
          switchMap(cart => {
            if (!cart || cart.items.length === 0) {
              throw new Error('Cart is empty');
            }
            
            // Create order items from cart items
            const orderItems: OrderItem[] = cart.items.map(item => ({
              productId: item.productId,
              productName: item.productName,
              productImage: item.productImage,
              quantity: item.quantity,
              price: item.price
            }));
            
            // Calculate tax (example: 10%)
            const subtotal = cart.subtotal;
            const tax = subtotal * 0.1;
            const total = subtotal + tax;
            
            // Create new order
            const newOrder: Omit<Order, 'id'> = {
              userId: user.uid,
              items: orderItems,
              subtotal,
              tax,
              total,
              status: 'pending',
              paymentMethod,
              paymentStatus: 'pending',
              pickupOption,
              pickupLocation,
              shippingAddress,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            // Add order to Firestore
            return from(addDoc(this.ordersCollection, {
              ...newOrder,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })).pipe(
              switchMap(docRef => {
                // Process payment (in a real app, you'd call a payment gateway)
                const processPayment = httpsCallable(this.functions, 'processPayment');
                return from(processPayment({ 
                  orderId: docRef.id, 
                  amount: total,
                  method: paymentMethod
                })).pipe(
                  switchMap(() => {
                    // Update order status to processing
                    const orderDoc = doc(this.firestore, `orders/${docRef.id}`);
                    return updateDoc(orderDoc, {
                      paymentStatus: 'paid',
                      status: 'processing',
                      updatedAt: serverTimestamp()
                    }).then(() => {
                      // Clear the cart
                      this.cartService.clearCart().subscribe();
                      return docRef.id;
                    });
                  })
                );
              }),
              map(orderId => orderId)
            );
          })
        );
      })
    );
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