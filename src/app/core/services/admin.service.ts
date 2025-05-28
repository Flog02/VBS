import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  Timestamp
} from '@angular/fire/firestore';
import { Observable, from, of, combineLatest } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { User } from '../models/user.model';
import { Order } from '../models/order.model';
import { Chat } from '../models/chat.model';
import { AuthService } from './auth.service';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private usersCollection = collection(this.firestore, 'users');
  private ordersCollection = collection(this.firestore, 'orders');
  private productsCollection = collection(this.firestore, 'products');
  private chatsCollection = collection(this.firestore, 'chats');

  constructor(
    private firestore: Firestore,
    private functions: Functions,
    private authService: AuthService
  ) {}

  // ============================================
  // UTILITY METHOD FOR SAFE DATE CONVERSION
  // ============================================
  
  private convertTimestampToDate(timestamp: any): Date {
    if (!timestamp) return new Date(0);
    
    // Handle Firestore Timestamp with toDate method
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // Handle Firestore Timestamp with seconds property
    if (timestamp && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000);
    }
    
    // Handle regular Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // Handle string dates
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    
    // Fallback
    return new Date(timestamp);
  }

  // ============================================
  // DASHBOARD STATISTICS (WITH ERROR HANDLING)
  // ============================================

  getDashboardStats(): Observable<any> {
    return combineLatest([
      this.getRecentOrders(5),
      this.getUsersCount(),
      this.getProductsCount(),
      this.getProductsInStockCount(),
      this.getOrdersCountByStatus(),
      this.getRevenueStats(),
      this.getPendingChatsCount()
    ]).pipe(
      map(([recentOrders, usersCount, productsCount, productsInStock, orderStatusCounts, revenueStats, pendingChatsCount]) => {
        return {
          recentOrders,
          usersCount,
          productsCount,
          productsInStock,
          orderStatusCounts,
          revenueStats,
          pendingChatsCount
        };
      }),
      catchError((error: any) => {
        console.error('Error loading dashboard stats:', error);
        return of({
          recentOrders: [],
          usersCount: 0,
          productsCount: 0,
          productsInStock: 0,
          orderStatusCounts: {
            'pending': 0,
            'processing': 0,
            'shipped': 0,
            'ready-for-pickup': 0,
            'completed': 0,
            'cancelled': 0
          },
          revenueStats: {
            totalRevenue: 0,
            monthlyRevenue: 0,
            lastMonthRevenue: 0,
            monthlyGrowth: 0
          },
          pendingChatsCount: 0
        });
      })
    );
  }

  private getRecentOrders(count: number = 5): Observable<Order[]> {
    return from(getDocs(this.ordersCollection)).pipe(
      map(snapshot => {
        const orders = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Order))
          .sort((a, b) => {
            const dateA = this.convertTimestampToDate(a.createdAt);
            const dateB = this.convertTimestampToDate(b.createdAt);
            return dateB.getTime() - dateA.getTime(); // Most recent first
          })
          .slice(0, count);
        
        return orders;
      }),
      catchError((error: any) => {
        console.warn('Orders collection not accessible:', error);
        return of([]);
      })
    );
  }

  private getUsersCount(): Observable<number> {
    return from(getDocs(this.usersCollection)).pipe(
      map(snapshot => snapshot.size),
      catchError((error: any) => {
        console.warn('Error getting users count:', error);
        return of(0);
      })
    );
  }

  private getProductsCount(): Observable<number> {
    return from(getDocs(this.productsCollection)).pipe(
      map(snapshot => snapshot.size),
      catchError((error: any) => {
        console.warn('Products collection not accessible:', error);
        return of(0);
      })
    );
  }

  private getProductsInStockCount(): Observable<number> {
    // FIXED: Avoid composite index requirement by filtering in code
    return from(getDocs(this.productsCollection)).pipe(
      map(snapshot => {
        let inStockCount = 0;
        snapshot.docs.forEach(doc => {
          const data = doc.data() as any; // Explicit any type for Firestore data
          if (data.stock > 0 && data.isActive === true) {
            inStockCount++;
          }
        });
        return inStockCount;
      }),
      catchError((error: any) => {
        console.warn('Products stock query failed:', error);
        return of(0);
      })
    );
  }

  private getOrdersCountByStatus(): Observable<Record<string, number>> {
    return from(getDocs(this.ordersCollection)).pipe(
      map(snapshot => {
        const statusCounts: Record<string, number> = {
          'pending': 0,
          'processing': 0,
          'shipped': 0,
          'ready-for-pickup': 0,
          'completed': 0,
          'cancelled': 0
        };
        
        snapshot.docs.forEach(doc => {
          const order = doc.data() as Order;
          if (statusCounts[order.status] !== undefined) {
            statusCounts[order.status]++;
          }
        });
        
        return statusCounts;
      }),
      catchError((error: any) => {
        console.warn('Orders status query failed:', error);
        return of({
          'pending': 0,
          'processing': 0,
          'shipped': 0,
          'ready-for-pickup': 0,
          'completed': 0,
          'cancelled': 0
        });
      })
    );
  }

  private getRevenueStats(): Observable<any> {
    return from(getDocs(this.ordersCollection)).pipe(
      map(snapshot => {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        
        let totalRevenue = 0;
        let monthlyRevenue = 0;
        let lastMonthRevenue = 0;
        
        snapshot.docs.forEach(doc => {
          const order = doc.data() as Order;
          // Skip cancelled or pending orders
          if (order.status === 'cancelled' || order.paymentStatus !== 'paid') {
            return;
          }
          
          totalRevenue += order.total;
          
          // FIXED: Use safe timestamp conversion instead of direct casting
          const createdAt = this.convertTimestampToDate(order.createdAt);
          if (createdAt >= thisMonth) {
            monthlyRevenue += order.total;
          } else if (createdAt >= lastMonth && createdAt < thisMonth) {
            lastMonthRevenue += order.total;
          }
        });
        
        const monthlyGrowth = lastMonthRevenue > 0 
          ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
          : 0;
        
        return {
          totalRevenue,
          monthlyRevenue,
          lastMonthRevenue,
          monthlyGrowth
        };
      }),
      catchError((error: any) => {
        console.warn('Revenue stats query failed:', error);
        return of({
          totalRevenue: 0,
          monthlyRevenue: 0,
          lastMonthRevenue: 0,
          monthlyGrowth: 0
        });
      })
    );
  }

  private getPendingChatsCount(): Observable<number> {
    // FIXED: Avoid composite index by filtering in code
    return from(getDocs(this.chatsCollection)).pipe(
      map(snapshot => {
        let pendingCount = 0;
        snapshot.docs.forEach(doc => {
          const data = doc.data() as any; // Explicit any type for Firestore data
          if (data.status === 'active' && !data.agentId) {
            pendingCount++;
          }
        });
        return pendingCount;
      }),
      catchError((error: any) => {
        console.warn('Chats collection not accessible:', error);
        return of(0);
      })
    );
  }

  // ============================================
  // USER MANAGEMENT (WORKING METHODS)
  // ============================================

  getAllUsers(page: number = 1, pageSize: number = 20): Observable<User[]> {
    // If no pagination requested, return all users
    if (page === 1 && pageSize === 20) {
      return collectionData(this.usersCollection, { idField: 'uid' }) as Observable<User[]>;
    }
    
    // Otherwise use pagination
    return from(getDocs(query(this.usersCollection, limit(page * pageSize)))).pipe(
      map(snapshot => {
        const users = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as User[];
        
        // Manual pagination
        const start = (page - 1) * pageSize;
        return users.slice(start, start + pageSize);
      })
    );
  }

  getUserById(uid: string): Observable<User | null> {
    return from(getDoc(doc(this.firestore, `users/${uid}`))).pipe(
      map(doc => {
        if (doc.exists()) {
          return { uid: doc.id, ...doc.data() } as User;
        }
        return null;
      })
    );
  }

  updateUser(uid: string, userData: Partial<User>): Observable<void> {
    const userDoc = doc(this.firestore, `users/${uid}`);
    return from(updateDoc(userDoc, {
      ...userData,
      updatedAt: serverTimestamp()
    }));
  }

  updateUserRole(uid: string, role: 'customer' | 'admin'): Promise<void> {
    const userDoc = doc(this.firestore, `users/${uid}`);
    return updateDoc(userDoc, {
      role: role,
      updatedAt: serverTimestamp()
    });
  }

  deleteUser(uid: string): Promise<void> {
    const userDoc = doc(this.firestore, `users/${uid}`);
    return deleteDoc(userDoc);
  }

  // FIXED: Get products that are in stock (avoiding composite index)
  getProductsInStock(): Observable<any[]> {
    return from(getDocs(this.productsCollection)).pipe(
      map(snapshot => {
        const productsInStock: any[] = [];
        snapshot.docs.forEach(doc => {
          const data = { id: doc.id, ...doc.data() } as any; // Explicit any type
          if (data.stock > 0 && data.isActive === true) {
            productsInStock.push(data);
          }
        });
        return productsInStock;
      }),
      catchError((error: any) => {
        console.warn('Products in stock query failed:', error);
        return of([]);
      })
    );
  }

  banUser(uid: string): Promise<void> {
    const userDoc = doc(this.firestore, `users/${uid}`);
    return updateDoc(userDoc, {
      isBanned: true,
      bannedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  unbanUser(uid: string): Promise<void> {
    const userDoc = doc(this.firestore, `users/${uid}`);
    return updateDoc(userDoc, {
      isBanned: false,
      bannedAt: null,
      updatedAt: serverTimestamp()
    });
  }

  changeUserRole(uid: string, role: 'customer' | 'admin'): Observable<void> {
    const updateRole = httpsCallable(this.functions, 'changeUserRole');
    return from(updateRole({ uid, role })).pipe(
      map(() => undefined),
      catchError((error: any) => {
        console.warn('Cloud function failed, using direct update:', error);
        return from(this.updateUserRole(uid, role));
      })
    );
  }

  // ============================================
  // CHAT MANAGEMENT (FIXED METHODS)
  // ============================================

  getPendingChats(): Observable<Chat[]> {
    // FIXED: Avoid composite index by filtering in code
    return from(getDocs(this.chatsCollection)).pipe(
      map(snapshot => {
        const pendingChats: Chat[] = [];
        snapshot.docs.forEach(doc => {
          const data = { id: doc.id, ...doc.data() } as Chat;
          if (data.status === 'active' && !data.agentId) {
            pendingChats.push(data);
          }
        });
        
        // Sort by updatedAt (oldest first for pending)
        return pendingChats.sort((a, b) => {
          const dateA = this.convertTimestampToDate(a.updatedAt);
          const dateB = this.convertTimestampToDate(b.updatedAt);
          return dateA.getTime() - dateB.getTime();
        });
      }),
      catchError((error: any) => {
        console.warn('Pending chats query failed:', error);
        return of([]);
      })
    );
  }

  getAssignedChats(): Observable<Chat[]> {
    const currentAdminId = this.authService.getCurrentUserId();
    if (!currentAdminId) {
      return of([]);
    }
    
    // FIXED: Avoid composite index by filtering in code
    return from(getDocs(this.chatsCollection)).pipe(
      map(snapshot => {
        const assignedChats: Chat[] = [];
        snapshot.docs.forEach(doc => {
          const data = { id: doc.id, ...doc.data() } as Chat;
          if (data.status === 'active' && data.agentId === currentAdminId) {
            assignedChats.push(data);
          }
        });
        
        // Sort by updatedAt (most recent first)
        return assignedChats.sort((a, b) => {
          const dateA = this.convertTimestampToDate(a.updatedAt);
          const dateB = this.convertTimestampToDate(b.updatedAt);
          return dateB.getTime() - dateA.getTime();
        });
      }),
      catchError((error: any) => {
        console.warn('Assigned chats query failed:', error);
        return of([]);
      })
    );
  }

  assignChatToAdmin(chatId: string): Observable<void> {
    const adminId = this.authService.getCurrentUserId();
    if (!adminId) {
      return of(undefined);
    }
    
    const chatDoc = doc(this.firestore, `chats/${chatId}`);
    return from(updateDoc(chatDoc, {
      agentId: adminId,
      updatedAt: serverTimestamp()
    }));
  }

  sendAdminChatMessage(chatId: string, content: string): Observable<void> {
    const chatDoc = doc(this.firestore, `chats/${chatId}`);
    return from(getDoc(chatDoc)).pipe(
      switchMap(docSnapshot => {
        if (!docSnapshot.exists()) {
          throw new Error('Chat not found');
        }
        
        const chat = docSnapshot.data() as Chat;
        
        // Add admin message
        const adminMessage = {
          id: Date.now().toString(),
          sender: 'admin',
          content,
          timestamp: new Date()
        };
        
        const updatedMessages = [...(chat.messages || []), adminMessage];
        
        return from(updateDoc(chatDoc, {
          messages: updatedMessages,
          updatedAt: serverTimestamp()
        }));
      })
    );
  }

  closeChat(chatId: string): Observable<void> {
    const chatDoc = doc(this.firestore, `chats/${chatId}`);
    return from(updateDoc(chatDoc, {
      status: 'closed',
      updatedAt: serverTimestamp()
    }));
  }
}