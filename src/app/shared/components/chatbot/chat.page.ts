import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonButtons, 
  IonBackButton,
  IonButton, 
  IonIcon, 
  IonFooter,
  IonTextarea,
  IonSpinner,
  IonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent, IonBadge } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  sendOutline, 
  personOutline, 
  cubeOutline, 
  happyOutline,
  paperPlaneOutline, chatbubbleOutline } from 'ionicons/icons';

import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { ChatbotService } from 'src/app/core/services/chatbot.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Chat,ChatMessage } from 'src/app/core/models/chat.model';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [IonBadge, 
    RouterLink,
    CommonModule,
    FormsModule,
    IonContent, 
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonButtons, 
    IonBackButton,
    IonButton, 
    IonIcon, 
    IonFooter,
    IonTextarea,
    IonSpinner,
    IonText,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    HeaderComponent,
    FooterComponent,
    LoadingSpinnerComponent
  ]
})
export class ChatPage implements OnInit, AfterViewChecked {
  @ViewChild('chatContent') chatContent!: IonContent;
  @ViewChild('messageInput') messageInput!: ElementRef;
  
  message = '';
  currentChat: Chat | null = null;
  isLoading = false;
  isLoggedIn = false;
  
  constructor(
    private chatbotService: ChatbotService,
    private authService: AuthService
  ) {
    addIcons({chatbubbleOutline,paperPlaneOutline,sendOutline,personOutline,cubeOutline,happyOutline});
  }
  
  ngOnInit() {
    this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
      
      if (isLoggedIn) {
        this.loadChat();
      }
    });
  }
  
  ngAfterViewChecked() {
    this.scrollToBottom();
  }
  
  loadChat() {
    this.isLoading = true;
    
    this.chatbotService.currentChat$.subscribe(
      chat => {
        this.currentChat = chat;
        this.isLoading = false;
        
        // Scroll to bottom when new messages arrive
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      },
      error => {
        console.error('Error loading chat:', error);
        this.isLoading = false;
      }
    );
  }
  
  scrollToBottom() {
    if (this.chatContent) {
      this.chatContent.scrollToBottom(300);
    }
  }
  
  startNewChat() {
    this.isLoading = true;
    this.chatbotService.startNewChat().subscribe(
      () => {
        this.isLoading = false;
        // Continuing src/app/features/chat/chat.page.ts
        setTimeout(() => {
          this.scrollToBottom();
          this.focusMessageInput();
        }, 300);
      },
      error => {
        console.error('Error starting chat:', error);
        this.isLoading = false;
      }
    );
  }
  
  focusMessageInput() {
    if (this.messageInput && this.messageInput.nativeElement) {
      this.messageInput.nativeElement.focus();
    }
  }
  
  sendMessage() {
    if (!this.message.trim() || !this.currentChat) {
      return;
    }
    
    const msgToSend = this.message.trim();
    this.message = '';
    
    // Temporary store the message to show immediately
    const tempMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: msgToSend,
      timestamp: new Date()
    };
    
    if (this.currentChat) {
      // Optimistic update
      this.currentChat = {
        ...this.currentChat,
        messages: [...this.currentChat.messages, tempMessage]
      };
    }
    
    this.isLoading = true;
    this.chatbotService.sendMessage(msgToSend).subscribe(
      () => {
        this.isLoading = false;
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      },
      error => {
        console.error('Error sending message:', error);
        this.isLoading = false;
      }
    );
  }
  
  escalateToHuman() {
    this.isLoading = true;
    this.chatbotService.escalateToHuman().subscribe(
      () => {
        this.isLoading = false;
      },
      error => {
        console.error('Error escalating to human:', error);
        this.isLoading = false;
      }
    );
  }
  
  closeChat() {
    if (this.currentChat) {
      this.chatbotService.closeActiveChat().subscribe();
    }
  }
  
  getMessageClass(message: ChatMessage): string {
    return `message-${message.sender}`;
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
        return 'person-outline';
    }
  }
  
  formatDate(date: any): string {
    if (!date) return '';
    
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleTimeString() + ', ' + d.toLocaleDateString();
  }
}