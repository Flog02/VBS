import { Component, OnInit } from '@angular/core';
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
  sendOutline, checkmarkOutline
} from 'ionicons/icons';

import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { AdminService } from '../../../core/services/admin.service';
import { Chat, ChatMessage } from '../../../core/models/chat.model';

@Component({
  selector: 'app-chat-management',
  templateUrl: './chat-management.page.html',
  styleUrls: ['./chat-management.page.scss'],
  standalone: true,
  imports: [IonList, 
    CommonModule,
    FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, 
    IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, 
    IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, 
    IonSelect, IonSelectOption, IonSearchbar, IonBadge, IonAlert,
    IonSegment, IonSegmentButton, IonAvatar, IonText, IonTextarea,
    HeaderComponent, FooterComponent, LoadingSpinnerComponent, EmptyStateComponent
  ]
})
export class ChatManagementPage implements OnInit {
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
  
  constructor(private adminService: AdminService) {
    addIcons({
      chatbubbleOutline, personOutline, closeOutline, 
      sendOutline, checkmarkOutline
    });
  }
  
  ngOnInit() {
    this.loadChats();
  }
  
  loadChats() {
    // Load pending chats
    this.isLoadingPending = true;
    this.adminService.getPendingChats().subscribe(
      chats => {
        this.pendingChats = chats;
        this.isLoadingPending = false;
      },
      error => {
        console.error('Error loading pending chats:', error);
        this.isLoadingPending = false;
      }
    );
    
    // Load assigned chats
    this.isLoadingAssigned = true;
    this.adminService.getAssignedChats().subscribe(
      chats => {
        this.assignedChats = chats;
        this.isLoadingAssigned = false;
      },
      error => {
        console.error('Error loading assigned chats:', error);
        this.isLoadingAssigned = false;
      }
    );
  }
  
  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
    this.currentChat = null;
  }
  
  selectChat(chat: Chat) {
    this.currentChat = chat;
    
    // If it's a pending chat, assign it
    if (!chat.agentId) {
      this.adminService.assignChatToAdmin(chat.id).subscribe(
        () => {
          // Update local state
          this.currentChat = {
            ...this.currentChat!,
            agentId: 'assigned' // This will be replaced with the actual ID when refreshed
          };
          
          // Refresh chats list
          this.loadChats();
        },
        error => {
          console.error('Error assigning chat:', error);
        }
      );
    }
  }
  
  sendMessage() {
    if (!this.currentChat || !this.newMessage.trim()) return;
    
    this.adminService.sendAdminChatMessage(this.currentChat.id, this.newMessage.trim()).subscribe(
      () => {
        // Clear input
        this.newMessage = '';
        
        // Refresh the current chat
        if (this.currentChat) {
          this.adminService.getAssignedChats().subscribe(
            chats => {
              const updatedChat = chats.find(c => c.id === this.currentChat?.id);
              if (updatedChat) {
                this.currentChat = updatedChat;
              }
              this.assignedChats = chats;
            }
          );
        }
      },
      error => {
        console.error('Error sending message:', error);
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
        }
        
        // Remove from the appropriate list
        if (this.chatToClose?.agentId) {
          this.assignedChats = this.assignedChats.filter(c => c.id !== this.chatToClose?.id);
        } else {
          this.pendingChats = this.pendingChats.filter(c => c.id !== this.chatToClose?.id);
        }
        
        this.chatToClose = null;
        this.showCloseAlert = false;
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
  
  formatDate(date: any): string {
    if (!date) return '';
    
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleTimeString() + ', ' + d.toLocaleDateString();
  }
}