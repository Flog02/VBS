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
  serverTimestamp,
  Timestamp
} from '@angular/fire/firestore';
import { Observable, from, of, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
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

  // Dashboard statistics
  getDashboardStats(): Observable<any> {
    return combineLatest([
      this.getRecentOrders(5),
      this.getUsersCount(),
      this.getOrdersCountByStatus(),
      this.getRevenueStats(),
      this.getPendingChatsCount()
    ]).pipe(
      map(([recentOrders, usersCount, orderStatusCounts, revenueStats, pendingChatsCount]) => {
        return {
          recentOrders,
          usersCount,
          orderStatusCounts,
          revenueStats,
          pendingChatsCount
        };
      })
    );
  }

  private getRecentOrders(count: number = 5): Observable<Order[]> {
    const recentOrdersQuery = query(
      this.ordersCollection,
      orderBy('createdAt', 'desc'),
      limit(count)
    );
    
    return collectionData(recentOrdersQuery, { idField: 'id' }) as Observable<Order[]>;
  }

  private getUsersCount(): Observable<number> {
    return from(getDocs(this.usersCollection)).pipe(
      map(snapshot => snapshot.size)
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
          
          const createdAt = (order.createdAt as unknown as Timestamp).toDate();
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
      })
    );
  }

  private getPendingChatsCount(): Observable<number> {
    const pendingChatsQuery = query(
      this.chatsCollection,
      where('status', '==', 'active'),
      where('agentId', '==', null)
    );
    
    return from(getDocs(pendingChatsQuery)).pipe(
      map(snapshot => snapshot.size)
    );
  }

  // User Management
  getAllUsers(page: number = 1, pageSize: number = 20): Observable<User[]> {
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

  changeUserRole(uid: string, role: 'customer' | 'admin'): Observable<void> {
    const updateRole = httpsCallable(this.functions, 'changeUserRole');
    return from(updateRole({ uid, role })).pipe(
      map(() => undefined)
    );
  }

  // Chat Management
  getPendingChats(): Observable<Chat[]> {
    const pendingChatsQuery = query(
      this.chatsCollection,
      where('status', '==', 'active'),
      where('agentId', '==', null),
      orderBy('updatedAt', 'asc')
    );
    
    return collectionData(pendingChatsQuery, { idField: 'id' }) as Observable<Chat[]>;
  }

  getAssignedChats(): Observable<Chat[]> {
    const currentAdminId = this.authService.getCurrentUserId();
    if (!currentAdminId) {
      return of([]);
    }
    
    const assignedChatsQuery = query(
      this.chatsCollection,
      where('status', '==', 'active'),
      where('agentId', '==', currentAdminId),
      orderBy('updatedAt', 'desc')
    );
    
    return collectionData(assignedChatsQuery, { idField: 'id' }) as Observable<Chat[]>;
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
        
        const updatedMessages = [...chat.messages, adminMessage];
        
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