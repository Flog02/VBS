import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  getDoc, // Add this import
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  DocumentReference
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { Chat, ChatMessage } from '../models/chat.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private currentChatSubject = new BehaviorSubject<Chat | null>(null);
  public currentChat$ = this.currentChatSubject.asObservable();
  
  private chatsCollection = collection(this.firestore, 'chats');

  constructor(
    private firestore: Firestore,
    private functions: Functions,
    private authService: AuthService
  ) {
    // Check if user has active chat
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.findActiveChat(user.uid);
      } else {
        this.currentChatSubject.next(null);
      }
    });
  }

  private async findActiveChat(userId: string): Promise<void> {
    const activeChatsQuery = query(
      this.chatsCollection,
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(activeChatsQuery);
    if (!snapshot.empty) {
      const chatData = snapshot.docs[0].data() as Omit<Chat, 'id'>;
      this.currentChatSubject.next({
        id: snapshot.docs[0].id,
        ...chatData
      } as Chat);
    }
  }

  getUserChats(): Observable<Chat[]> {
    return this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) {
          return of([]);
        }
        
        const userChatsQuery = query(
          this.chatsCollection,
          where('userId', '==', user.uid),
          orderBy('updatedAt', 'desc')
        );
        
        return from(getDocs(userChatsQuery)).pipe(
          map(snapshot => {
            return snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Chat[];
          })
        );
      })
    );
  }

  startNewChat(): Observable<string> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return of('');
    }

    // Close any active chats first
    return this.closeActiveChat().pipe(
      switchMap(() => {
        // Create a new chat
        const newChat: Omit<Chat, 'id'> = {
          userId,
          status: 'active',
          messages: [
            {
              id: Date.now().toString(),
              sender: 'bot',
              content: 'Hello! How can I help you today?',
              timestamp: new Date()
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        return from(addDoc(this.chatsCollection, {
          ...newChat,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })).pipe(
          tap(docRef => {
            this.currentChatSubject.next({
              id: docRef.id,
              ...newChat
            } as Chat);
          }),
          map(docRef => docRef.id)
        );
      })
    );
  }

  closeActiveChat(): Observable<void> {
    const currentChat = this.currentChatSubject.value;
    if (!currentChat || currentChat.status !== 'active') {
      return of(undefined);
    }

    const chatDoc = doc(this.firestore, `chats/${currentChat.id}`);
    return from(updateDoc(chatDoc, {
      status: 'closed',
      updatedAt: serverTimestamp()
    })).pipe(
      tap(() => {
        this.currentChatSubject.next(null);
      })
    );
  }

  sendMessage(content: string): Observable<void> {
    return this.ensureActiveChat().pipe(
      switchMap(chatId => {
        if (!chatId) {
          return of(undefined);
        }
        
        const currentChat = this.currentChatSubject.value;
        if (!currentChat) {
          return of(undefined);
        }
        
        // Add user message
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          sender: 'user',
          content,
          timestamp: new Date()
        };
        
        const updatedMessages = [...currentChat.messages, userMessage];
        
        // Update chat in Firestore
        const chatDoc = doc(this.firestore, `chats/${chatId}`);
        return from(updateDoc(chatDoc, {
          messages: updatedMessages,
          updatedAt: serverTimestamp()
        })).pipe(
          tap(() => {
            // Update local chat object
            this.currentChatSubject.next({
              ...currentChat,
              messages: updatedMessages,
              updatedAt: new Date()
            });
          }),
          // Process message with chatbot or send to human agent
          switchMap(() => this.processMessage(chatId, content))
        );
      })
    );
  }

  private processMessage(chatId: string, content: string): Observable<void> {
    // Call Firebase Function to process message
    const processChatMessage = httpsCallable(this.functions, 'processChatMessage');
    return from(processChatMessage({ chatId, message: content })).pipe(
      switchMap(() => {
        // Refresh chat to get bot response
        return this.refreshChat(chatId);
      })
    );
  }

  private refreshChat(chatId: string): Observable<void> {
    // Fix: Use getDoc instead of calling .get() on the reference
    const chatDocRef = doc(this.firestore, `chats/${chatId}`);
    return from(getDoc(chatDocRef)).pipe(
      map(docSnapshot => {
        if (docSnapshot.exists()) {
          const chatData = docSnapshot.data() as Omit<Chat, 'id'>;
          this.currentChatSubject.next({
            id: chatId,
            ...chatData
          } as Chat);
        }
        return undefined;
      })
    );
  }

  private ensureActiveChat(): Observable<string> {
    const currentChat = this.currentChatSubject.value;
    if (currentChat && currentChat.status === 'active') {
      return of(currentChat.id);
    } else {
      return this.startNewChat();
    }
  }

  escalateToHuman(): Observable<void> {
    const currentChat = this.currentChatSubject.value;
    if (!currentChat) {
      return of(undefined);
    }

    // Add system message about escalation
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'bot',
      content: 'I\'m connecting you with a customer service representative. Please wait a moment.',
      timestamp: new Date()
    };
    
    const updatedMessages = [...currentChat.messages, systemMessage];
    
    // Update chat in Firestore
    const chatDoc = doc(this.firestore, `chats/${currentChat.id}`);
    return from(updateDoc(chatDoc, {
      messages: updatedMessages,
      agentId: null, // Will be assigned by admin
      updatedAt: serverTimestamp()
    })).pipe(
      tap(() => {
        // Update local chat object
        this.currentChatSubject.next({
          ...currentChat,
          messages: updatedMessages,
          updatedAt: new Date()
        });
      }),
      // Call function to notify admins
      switchMap(() => {
        const notifyAdmins = httpsCallable(this.functions, 'notifyAdminsOfChatEscalation');
        return from(notifyAdmins({ chatId: currentChat.id }));
      }),
      map(() => undefined)
    );
  }
}