import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, 
  IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, 
  IonSelect, IonSelectOption, IonSearchbar, IonBadge, IonAlert,
  IonSegment, IonSegmentButton, IonAvatar, IonText, IonTextarea, IonList } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chatbubbleOutline, personOutline, closeOutline, 
  sendOutline, checkmarkOutline, arrowBackOutline } from 'ionicons/icons';

import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { AdminService } from '../../../core/services/admin.service';
import { Chat, ChatMessage } from '../../../core/models/chat.model';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { 
  Firestore, 
  doc, 
  onSnapshot,
  Unsubscribe 
} from '@angular/fire/firestore';

@Component({
  selector: 'app-chat-management',
  templateUrl: './chat-management.page.html',
  styleUrls: ['./chat-management.page.scss'],
  standalone: true,
  imports: [IonList,
    CommonModule,
    FormsModule,
    IonContent,
    IonButton, IonIcon,
    IonItem, IonLabel,
    IonBadge, IonAlert,
    IonSegment, IonSegmentButton, IonAvatar, IonText, IonTextarea,
    HeaderComponent, LoadingSpinnerComponent, EmptyStateComponent]
})
export class ChatManagementPage implements OnInit, OnDestroy {
  @ViewChild('messagesContainer', { read: ElementRef }) messagesContainer!: ElementRef;
  
  selectedSegment = 'pending';
  pendingChats: Chat[] = [];
  assignedChats: Chat[] = [];
  isLoadingPending = true;
  isLoadingAssigned = true;
  
  // Currently selected chat
  currentChat: Chat | null = null;
  newMessage = '';
  
  // Close chat confirmation
  showCloseAlert = false;
  chatToClose: Chat | null = null;
  
  // Real-time listeners
  private allChatsListener: Subscription | null = null;
  private currentChatListener: Unsubscribe | null = null;
  
  // Other properties
  takingOver = false;
  waitingChats: Chat[] = [];
  private lastMessageCount = 0;
  
  constructor(
    private adminService: AdminService,
    private router: Router,
    private firestore: Firestore,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({arrowBackOutline,personOutline,chatbubbleOutline,closeOutline,sendOutline,checkmarkOutline});
  }
  
  ngOnInit() {
    this.startListeningToAllChats();
  }
  
  ngOnDestroy() {
    // Clean up listeners
    if (this.allChatsListener) {
      this.allChatsListener.unsubscribe();
    }
    if (this.currentChatListener) {
      this.currentChatListener();
    }
  }
  
  // Start listening to all active chats with real-time updates
  startListeningToAllChats() {
    this.isLoadingPending = true;
    this.isLoadingAssigned = true;
    
    this.allChatsListener = this.adminService.listenToAllActiveChats().subscribe(
      (allChats) => {
        // Get current admin ID
        const currentAdminId = this.getCurrentUserId();
        
        // Separate chats into categories
        this.pendingChats = allChats.filter(chat => 
          !chat.agentId || chat.agentId === 'pending'
        );
        
        this.assignedChats = allChats.filter(chat => 
          chat.agentId === currentAdminId
        );
        
        this.waitingChats = allChats.filter(chat => 
          chat.status === 'waiting_for_human' && (!chat.agentId || chat.agentId === 'pending')
        );
        
        // Update current chat if it exists in the new data
        if (this.currentChat) {
          const updatedChat = allChats.find(c => c.id === this.currentChat!.id);
          if (updatedChat) {
            // Check if new messages arrived
            const hasNewMessages = updatedChat.messages.length > this.currentChat.messages.length;
            
            // Update current chat
            this.currentChat = { ...updatedChat };
            
            // Force change detection and scroll if new messages
            this.cdr.detectChanges();
            
            if (hasNewMessages) {
              setTimeout(() => this.scrollToBottom(), 50);
            }
          }
        }
        
        this.isLoadingPending = false;
        this.isLoadingAssigned = false;
        
        // Force change detection
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error listening to chats:', error);
        this.isLoadingPending = false;
        this.isLoadingAssigned = false;
      }
    );
  }
  
  // Start listening to a specific chat for real-time message updates
  startListeningToCurrentChat(chatId: string) {
    // Stop any existing listener
    if (this.currentChatListener) {
      this.currentChatListener();
    }
    
    const chatDocRef = doc(this.firestore, `chats/${chatId}`);
    
    this.currentChatListener = onSnapshot(chatDocRef, (docSnapshot) => {
      if (docSnapshot.exists() && this.currentChat && this.currentChat.id === chatId) {
        const chatData = docSnapshot.data() as Omit<Chat, 'id'>;
        const updatedChat = {
          id: chatId,
          ...chatData
        } as Chat;
        
        // Check if new messages arrived
        const hasNewMessages = updatedChat.messages.length > this.lastMessageCount;
        
        // Update the current chat with new data
        this.currentChat = updatedChat;
        this.lastMessageCount = updatedChat.messages.length;
        
        // Also update in the appropriate list
        const index = this.assignedChats.findIndex(c => c.id === chatId);
        if (index !== -1) {
          this.assignedChats[index] = updatedChat;
        }
        
        // Force change detection
        this.cdr.detectChanges();
        
        // Scroll to bottom if new messages
        if (hasNewMessages) {
          setTimeout(() => this.scrollToBottom(), 50);
        }
      }
    }, (error) => {
      console.error('Error listening to current chat:', error);
    });
  }
  
  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
    this.currentChat = null;
    this.lastMessageCount = 0;
    
    // Stop listening to current chat when switching segments
    if (this.currentChatListener) {
      this.currentChatListener();
      this.currentChatListener = null;
    }
  }
  
  selectChat(chat: Chat) {
    this.currentChat = chat;
    this.lastMessageCount = chat.messages ? chat.messages.length : 0;
    
    // Start listening to this specific chat for real-time updates
    this.startListeningToCurrentChat(chat.id);
    
    // Force change detection
    this.cdr.detectChanges();
    
    // Scroll to bottom after a small delay
    setTimeout(() => this.scrollToBottom(), 100);
    
    // If it's a pending chat, assign it
    if (!chat.agentId || chat.agentId === 'pending') {
      this.adminService.assignChatToAdmin(chat.id).subscribe(
        () => {
          console.log('Chat assigned successfully');
        },
        error => {
          console.error('Error assigning chat:', error);
        }
      );
    }
  }
  
  takeOverChat(chatId: string): void {
    this.takingOver = true;
    this.adminService.assignChatToAdmin(chatId).subscribe({
      next: () => {
        console.log('Successfully took over chat');
        this.selectChatById(chatId);
        this.takingOver = false;
      },
      error: (error) => {
        console.error('Error taking over chat:', error);
        this.takingOver = false;
      }
    });
  }

  selectChatById(chatId: string): void {
    const chat = this.assignedChats.find(c => c.id === chatId) || 
                 this.pendingChats.find(c => c.id === chatId);
    if (chat) {
      this.selectChat(chat);
    }
  }

  getLastMessage(chat: Chat): string {
    if (!chat.messages || chat.messages.length === 0) {
      return 'No messages';
    }
    const lastMessage = chat.messages[chat.messages.length - 1];
    return lastMessage.content.substring(0, 50) + 
           (lastMessage.content.length > 50 ? '...' : '');
  }

  viewChatHistory(chat: Chat): void {
    console.log('Viewing chat history for:', chat.id);
  }

  sendMessage() {
    if (!this.currentChat || !this.newMessage.trim()) return;
    
    const messageToSend = this.newMessage.trim();
    this.newMessage = ''; // Clear input immediately for better UX
    
    // Force UI update
    this.cdr.detectChanges();
    
    this.adminService.sendAdminChatMessage(this.currentChat.id, messageToSend).subscribe(
      () => {
        console.log('Message sent successfully');
      },
      error => {
        console.error('Error sending message:', error);
        this.newMessage = messageToSend;
        this.cdr.detectChanges();
      }
    );
  }
  
  confirmCloseChat(chat: Chat) {
    this.chatToClose = chat;
    this.showCloseAlert = true;
  }
  
  closeChat() {
    if (!this.chatToClose) return;
    
    this.adminService.closeChat(this.chatToClose.id).subscribe(
      () => {
        // If this is the current chat, clear it
        if (this.currentChat && this.currentChat.id === this.chatToClose?.id) {
          this.currentChat = null;
          
          // Stop listening to the closed chat
          if (this.currentChatListener) {
            this.currentChatListener();
            this.currentChatListener = null;
          }
        }
        
        this.chatToClose = null;
        this.showCloseAlert = false;
        
        // Force change detection
        this.cdr.detectChanges();
      },
      error => {
        console.error('Error closing chat:', error);
        this.showCloseAlert = false;
      }
    );
  }
  
  closeChatAlertButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
      handler: () => {
        this.cancelCloseChat();
      }
    },
    {
      text: 'Close Chat',
      role: 'destructive',
      handler: () => {
        this.closeChat();
      }
    }
  ];
  
  cancelCloseChat() {
    this.chatToClose = null;
    this.showCloseAlert = false;
  }
  
  getMessageClass(message: ChatMessage): string {
    return `message-${message.sender}`;
  }
  
  // Get sorted messages
  getSortedMessages(): ChatMessage[] {
    if (!this.currentChat || !this.currentChat.messages) {
      return [];
    }
    
    // Sort messages by timestamp
    return [...this.currentChat.messages].sort((a, b) => {
      const dateA = this.getMessageDate(a.timestamp);
      const dateB = this.getMessageDate(b.timestamp);
      return dateA.getTime() - dateB.getTime();
    });
  }
  
  private getMessageDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    
    // Handle Firestore Timestamp
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // Handle Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // Handle string or number
    return new Date(timestamp);
  }
  
  formatDate(date: any): string {
    if (!date) return '';
    
    const d = this.getMessageDate(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
           ', ' + d.toLocaleDateString();
  }
  
  goBack() {
    this.router.navigate(['/admin']);
  }
  
  // Helper method to get the current user ID
  getCurrentUserId(): string | null {
    return this.adminService.getCurrentUserId();
  }
  
  // Add method to get the number of unread messages in a chat
  getUnreadMessageCount(chat: Chat): number {
    if (!chat.messages || chat.messages.length === 0) return 0;
    
    // Count messages from users that haven't been responded to by admin
    let unreadCount = 0;
    let lastAdminMessageIndex = -1;
    
    // Find the last admin message
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      if (chat.messages[i].sender === 'admin') {
        lastAdminMessageIndex = i;
        break;
      }
    }
    
    // Count user messages after the last admin message
    for (let i = lastAdminMessageIndex + 1; i < chat.messages.length; i++) {
      if (chat.messages[i].sender === 'user') {
        unreadCount++;
      }
    }
    
    return unreadCount;
  }
  
  // Scroll to bottom of messages
  private scrollToBottom(): void {
    try {
      const messagesElement = document.querySelector('.chat-messages');
      if (messagesElement) {
        messagesElement.scrollTop = messagesElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
  
  // Track by function for better performance
  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }
}