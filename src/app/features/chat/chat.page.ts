import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonCard, IonCardHeader, IonCardContent, IonFooter,
  IonTextarea, IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  chatbubbleOutline, personOutline, cubeOutline, sendOutline, 
  happyOutline, refreshOutline, addOutline } from 'ionicons/icons';

import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ChatbotService } from '../../core/services/chatbot.service';
import { AuthService } from '../../core/services/auth.service';
import { Chat, ChatMessage } from '../../core/models/chat.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,RouterLink,
    IonButton, IonIcon, IonCard, IonCardHeader, IonCardContent, IonFooter,
    IonTextarea, IonSpinner,
    HeaderComponent, FooterComponent, LoadingSpinnerComponent
  ]
})
export class ChatPage implements OnInit, AfterViewChecked {
  @ViewChild('chatContent') chatContent!: IonContent;
  @ViewChild('messageInput') messageInput!: ElementRef;
  
  currentChat: Chat | null = null;
  chatHistory: Chat[] = [];
  isLoading = true;
  message = '';
  isLoggedIn = false;
  sendingMessage = false;
  
  constructor(
    private chatbotService: ChatbotService,
    private authService: AuthService
  ) {
    addIcons({addOutline,chatbubbleOutline,personOutline,sendOutline,cubeOutline,happyOutline,refreshOutline});
  }
  
  ngOnInit() {
    this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
      
      if (isLoggedIn) {
        this.loadChat();
      } else {
        this.isLoading = false;
      }
    });
  }
  
  ngAfterViewChecked() {
    this.scrollToBottom();
  }
  
  loadChat() {
    this.isLoading = true;
    
    // Get current active chat
    this.chatbotService.currentChat$.subscribe(
      chat => {
        this.currentChat = chat;
        this.isLoading = false;
        
        // Load chat history
        this.chatbotService.getUserChats().subscribe(
          chats => {
            this.chatHistory = chats.filter(c => c.status === 'closed');
          },
          error => {
            console.error('Error loading chat history:', error);
          }
        );
        
        setTimeout(() => {
          this.scrollToBottom();
          this.focusMessageInput();
        }, 300);
      },
      error => {
        console.error('Error loading chat:', error);
        this.isLoading = false;
      }
    );
  }
  
  startNewChat() {
    if (!this.isLoggedIn) {
      return;
    }
    
    this.isLoading = true;
    this.chatbotService.startNewChat().subscribe(
      () => {
        this.isLoading = false;
        
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
  
  sendMessage() {
    if (!this.message.trim() || !this.currentChat || this.sendingMessage) {
      return;
    }
    
    this.sendingMessage = true;
    const msgToSend = this.message.trim();
    this.message = '';
    
    this.chatbotService.sendMessage(msgToSend).subscribe(
      () => {
        this.sendingMessage = false;
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      },
      error => {
        console.error('Error sending message:', error);
        this.sendingMessage = false;
      }
    );
  }
  
  escalateToHuman() {
    if (!this.currentChat) return;
    
    this.isLoading = true;
    this.chatbotService.escalateToHuman().subscribe(
      () => {
        this.isLoading = false;
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      },
      error => {
        console.error('Error escalating to human:', error);
        this.isLoading = false;
      }
    );
  }
  
  scrollToBottom() {
    if (this.chatContent) {
      this.chatContent.scrollToBottom(300);
    }
  }
  
  focusMessageInput() {
    if (this.messageInput && this.messageInput.nativeElement) {
      this.messageInput.nativeElement.focus();
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
    
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleTimeString() + ', ' + d.toLocaleDateString();
  }
}