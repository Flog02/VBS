import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonCard, IonCardHeader, IonCardContent, IonFooter,
  IonTextarea, IonSpinner, IonAlert
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  chatbubbleOutline, personOutline, cubeOutline, sendOutline, 
  happyOutline, refreshOutline, addOutline, timeOutline, chevronForwardOutline,
  closeCircleOutline
} from 'ionicons/icons';

import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ChatbotService } from '../../core/services/chatbot.service';
import { AuthService } from '../../core/services/auth.service';
import { Chat, ChatMessage } from '../../core/models/chat.model';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { 
  Firestore, 
  doc, 
  deleteDoc
} from '@angular/fire/firestore';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, RouterLink,
    IonButton, IonIcon, IonCard, IonCardHeader, IonCardContent, IonFooter,
    IonTextarea, IonSpinner, IonAlert,
    HeaderComponent, FooterComponent, LoadingSpinnerComponent
  ]
})
export class ChatPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('messagesEnd', { static: false }) messagesEnd!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;
  @ViewChild('chatContent', { read: ElementRef }) chatContent!: ElementRef;
  
  currentChat: Chat | null = null;
  chatHistory: Chat[] = [];
  isLoading = true;
  message = '';
  isLoggedIn = false;
  sendingMessage = false;
  
  // Delete functionality
  showDeleteAlert = false;
  chatToDelete: Chat | null = null;
  deletingChatId: string | null = null;
  
  private subscriptions: Subscription[] = [];
  private lastMessageCount = 0;
  
  constructor(
    private chatbotService: ChatbotService,
    private authService: AuthService,
    private firestore: Firestore,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      timeOutline, addOutline, personOutline, chatbubbleOutline, 
      chevronForwardOutline, happyOutline, cubeOutline, sendOutline, 
      refreshOutline, closeCircleOutline
    });
  }

  ngOnInit() {
    // Subscribe to authentication state
    const authSub = this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn ?? false;
      
      if (this.isLoggedIn) {
        this.loadChat();
      } else {
        this.isLoading = false;
      }
    });
    
    this.subscriptions.push(authSub);
  }

  ngOnDestroy() {
    // Clean up all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadChat() {
    this.isLoading = true;
    
    // Subscribe to real-time chat updates
    const chatSub = this.chatbotService.currentChat$.subscribe(
      chat => {
        const previousChat = this.currentChat;
        
        // Update current chat
        this.currentChat = chat;
        
        // Check if new messages arrived
        if (chat && chat.messages) {
          const newMessageCount = chat.messages.length;
          const hasNewMessages = newMessageCount > this.lastMessageCount;
          
          if (hasNewMessages || !previousChat) {
            // Force change detection
            this.cdr.detectChanges();
            
            // Scroll to bottom after a small delay to ensure DOM is updated
            setTimeout(() => {
              this.scrollToBottom();
            }, 50);
          }
          
          this.lastMessageCount = newMessageCount;
        } else {
          this.lastMessageCount = 0;
        }
        
        // Handle chat status changes
        if (previousChat && chat) {
          this.handleChatStatusChange(previousChat, chat);
        }
        
        this.isLoading = false;
        
        // Load chat history
        this.loadChatHistory();
      },
      error => {
        console.error('Error loading chat:', error);
        this.isLoading = false;
      }
    );
    
    this.subscriptions.push(chatSub);
  }

  private loadChatHistory() {
    const historySub = this.chatbotService.getUserChats().subscribe(
      chats => {
        this.chatHistory = chats.filter(c => c.status === 'closed');
        this.cdr.detectChanges();
      },
      error => {
        console.error('Error loading chat history:', error);
      }
    );
    
    this.subscriptions.push(historySub);
  }

  private handleChatStatusChange(oldChat: Chat, newChat: Chat) {
    // Detect when admin takes over
    if (!oldChat.agentId && newChat.agentId && newChat.agentId !== 'pending') {
      console.log('Admin has joined the chat');
      // Force UI update
      this.cdr.detectChanges();
    }
    
    // Detect when chat is escalated
    if (oldChat.status !== 'waiting_for_human' && newChat.status === 'waiting_for_human') {
      console.log('Chat escalated to human support');
      this.cdr.detectChanges();
    }
  }

  // Get sorted messages (ensure proper ordering)
  getSortedMessages(): ChatMessage[] {
    if (!this.currentChat || !this.currentChat.messages) {
      return [];
    }
    
    // Sort messages by timestamp to ensure proper order
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

  // Enhanced status display methods
  getChatStatusText(): string {
    if (!this.currentChat) return '';
    
    if (this.currentChat.status === 'waiting_for_human') {
      return 'Waiting for human support...';
    }
    
    if (this.currentChat.agentId && this.currentChat.agentId !== 'pending') {
      return 'Connected to customer support agent';
    }
    
    if (this.currentChat.agentId === 'pending') {
      return 'Connecting to human support...';
    }
    
    return 'Waiing for costumer support';
  }

  getChatStatusIcon(): string {
    if (!this.currentChat) return 'cube-outline';
    
    if (this.currentChat.status === 'waiting_for_human') {
      return 'time-outline';
    }
    
    if (this.currentChat.agentId && this.currentChat.agentId !== 'pending') {
      return 'happy-outline';
    }
    
    if (this.currentChat.agentId === 'pending') {
      return 'refresh-outline';
    }
    
    return 'cube-outline';
  }

  // Check if escalation button should be shown
  shouldShowEscalateButton(): boolean {
    return !!(this.currentChat && 
              !this.currentChat.agentId && 
              this.currentChat.status !== 'waiting_for_human');
  }
  
  ngAfterViewInit() {
    setTimeout(() => this.scrollToBottom(), 100);
  }
  
  startNewChat() {
    if (!this.isLoggedIn) {
      return;
    }
    
    this.isLoading = true;
    const newChatSub = this.chatbotService.startNewChat().subscribe(
      () => {
        this.isLoading = false;
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error => {
        console.error('Error starting chat:', error);
        this.isLoading = false;
      }
    );
    
    this.subscriptions.push(newChatSub);
  }
  
  sendMessage() {
    if (!this.message.trim() || !this.currentChat || this.sendingMessage) {
      return;
    }
    
    this.sendingMessage = true;
    const msgToSend = this.message.trim();
    this.message = '';
    
    // Force UI update
    this.cdr.detectChanges();
    
    const sendSub = this.chatbotService.sendMessage(msgToSend).subscribe(
      () => {
        this.sendingMessage = false;
        this.cdr.detectChanges();
      },
      error => {
        console.error('Error sending message:', error);
        this.sendingMessage = false;
        this.message = msgToSend;
        this.cdr.detectChanges();
      }
    );
    
    this.subscriptions.push(sendSub);
  }
  
  // Handle enter key press
  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
  
  escalateToHuman() {
    if (!this.currentChat) return;
    
    this.isLoading = true;
    const escalateSub = this.chatbotService.escalateToHuman().subscribe(
      () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error => {
        console.error('Error escalating to human:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    );
    
    this.subscriptions.push(escalateSub);
  }
  
  // Delete chat functionality
  confirmDeleteChat(chat: Chat, event: Event) {
    event.stopPropagation(); // Prevent triggering the viewHistoryChat
    this.chatToDelete = chat;
    this.showDeleteAlert = true;
  }
  
  deleteAlertButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
      handler: () => {
        this.chatToDelete = null;
        this.showDeleteAlert = false;
      }
    },
    {
      text: 'Delete',
      role: 'destructive',
      handler: () => {
        this.deleteChat();
      }
    }
  ];
  
  private async deleteChat() {
    if (!this.chatToDelete) return;
    
    this.deletingChatId = this.chatToDelete.id;
    this.showDeleteAlert = false;
    
    try {
      // Delete from Firestore
      const chatDoc = doc(this.firestore, `chats/${this.chatToDelete.id}`);
      await deleteDoc(chatDoc);
      
      // Remove from local chat history
      this.chatHistory = this.chatHistory.filter(c => c.id !== this.chatToDelete?.id);
      
      console.log('Chat deleted successfully');
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error deleting chat:', error);
      // You might want to show an error toast here
    } finally {
      this.deletingChatId = null;
      this.chatToDelete = null;
    }
  }
  
  // View a chat from history
  viewHistoryChat(chat: Chat) {
    // This is a placeholder - you might want to implement a modal or different view
    // to show the full chat history
    console.log('Viewing chat history:', chat);
  }
  
  // Get last message preview for history
  getLastMessagePreview(chat: Chat): string {
    if (!chat.messages || chat.messages.length === 0) {
      return 'No messages';
    }
    const lastMessage = chat.messages[chat.messages.length - 1];
    const preview = lastMessage.content.substring(0, 50);
    return preview + (lastMessage.content.length > 50 ? '...' : '');
  }
  
  // Close current active chat
  closeCurrentChat() {
    if (!this.currentChat) return;
    
    const closeSub = this.chatbotService.closeActiveChat().subscribe(
      () => {
        console.log('Chat closed');
        this.loadChatHistory(); // Refresh history
      },
      error => {
        console.error('Error closing chat:', error);
      }
    );
    
    this.subscriptions.push(closeSub);
  }
  
  scrollToBottom() {
    try {
      if (this.messagesEnd && this.messagesEnd.nativeElement) {
        this.messagesEnd.nativeElement.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
  
  getMessageClass(message: ChatMessage): string {
    return `message ${message.sender}`;
  }
  
  getMessageIcon(sender: string): string {
    switch (sender) {
      case 'user':
        return 'person-outline';
      case 'bot':
        return 'cube-outline';
      case 'admin':
        return 'happy-outline';
      default:
        return 'chatbubble-outline';
    }
  }
  
  formatDate(date: any): string {
    if (!date) return '';
    
    const d = this.getMessageDate(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
           ', ' + d.toLocaleDateString();
  }
  
  formatTime(date: any): string {
    if (!date) return '';
    
    const d = this.getMessageDate(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Track by function for better performance
  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }
}