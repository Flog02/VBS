import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  getDoc,
  onSnapshot, // Add this for real-time listening
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  DocumentReference,
  Unsubscribe // Add this type
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
  private currentChatListener: Unsubscribe | null = null; // Track the listener

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
        this.stopListeningToCurrentChat(); // Stop listening when user logs out
        this.currentChatSubject.next(null);
      }
    });
  }

  private async findActiveChat(userId: string): Promise<void> {
    const activeChatsQuery = query(
      this.chatsCollection,
      where('userId', '==', userId),
      where('status', 'in', ['active', 'waiting_for_human']), // Include waiting_for_human status
      orderBy('updatedAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(activeChatsQuery);
    if (!snapshot.empty) {
      const chatData = snapshot.docs[0].data() as Omit<Chat, 'id'>;
      const chat = {
        id: snapshot.docs[0].id,
        ...chatData
      } as Chat;
      
      this.currentChatSubject.next(chat);
      this.startListeningToCurrentChat(chat.id); // Start real-time listening
    }
  }

  // Start listening to real-time updates for the current chat
  private startListeningToCurrentChat(chatId: string): void {
    this.stopListeningToCurrentChat(); // Stop any existing listener
    
    const chatDocRef = doc(this.firestore, `chats/${chatId}`);
    
    this.currentChatListener = onSnapshot(chatDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const chatData = docSnapshot.data() as Omit<Chat, 'id'>;
        const updatedChat = {
          id: chatId,
          ...chatData
        } as Chat;
        
        console.log('Real-time chat update received:', updatedChat);
        this.currentChatSubject.next(updatedChat);
      }
    }, (error) => {
      console.error('Error listening to chat updates:', error);
    });
  }

  // Stop listening to the current chat
  private stopListeningToCurrentChat(): void {
    if (this.currentChatListener) {
      this.currentChatListener();
      this.currentChatListener = null;
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
            const chatWithId = {
              id: docRef.id,
              ...newChat
            } as Chat;
            
            this.currentChatSubject.next(chatWithId);
            this.startListeningToCurrentChat(docRef.id); // Start listening to new chat
          }),
          map(docRef => docRef.id)
        );
      })
    );
  }

  closeActiveChat(): Observable<void> {
    const currentChat = this.currentChatSubject.value;
    if (!currentChat || (currentChat.status !== 'active' && currentChat.status !== 'waiting_for_human')) {
      return of(undefined);
    }

    this.stopListeningToCurrentChat(); // Stop listening when closing chat

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
        
        // Update chat in Firestore - real-time listener will handle local updates
        const chatDoc = doc(this.firestore, `chats/${chatId}`);
        return from(updateDoc(chatDoc, {
          messages: updatedMessages,
          updatedAt: serverTimestamp()
        })).pipe(
          // Process message with chatbot or send to human agent
          switchMap(() => this.processMessage(chatId, content))
        );
      })
    );
  }

  private processMessage(chatId: string, content: string): Observable<void> {
    const currentChat = this.currentChatSubject.value;
    
    // If chat has an agent or is waiting for human, don't process with bot
    if (currentChat && (currentChat.agentId || currentChat.status === 'waiting_for_human')) {
      return of(undefined);
    }
    
    // Call Firebase Function to process message with bot
    const processChatMessage = httpsCallable(this.functions, 'processChatMessage');
    return from(processChatMessage({ chatId, message: content })).pipe(
      map(() => undefined) // Real-time listener will handle the response
    );
  }

  private ensureActiveChat(): Observable<string> {
    const currentChat = this.currentChatSubject.value;
    if (currentChat && (currentChat.status === 'active' || currentChat.status === 'waiting_for_human')) {
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
    
    // Update chat in Firestore - real-time listener will handle local updates
    const chatDoc = doc(this.firestore, `chats/${currentChat.id}`);
    return from(updateDoc(chatDoc, {
      messages: updatedMessages,
      status: 'waiting_for_human',
      agentId: 'pending', // Indicates escalation is pending
      updatedAt: serverTimestamp()
    })).pipe(
      // Call function to notify admins
      switchMap(() => {
        const notifyAdmins = httpsCallable(this.functions, 'notifyAdminsOfChatEscalation');
        return from(notifyAdmins({ chatId: currentChat.id }));
      }),
      map(() => undefined)
    );
  }

  // Method to clean up listeners when service is destroyed
  ngOnDestroy(): void {
    this.stopListeningToCurrentChat();
  }
}