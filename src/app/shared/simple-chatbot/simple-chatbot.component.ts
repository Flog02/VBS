// File: src/app/shared/components/simple-chatbot/simple-chatbot.component.ts

import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonTextarea } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chatbubbleOutline, closeOutline, sendOutline } from 'ionicons/icons';

interface Message {
  text: string;
  isBot: boolean;
  time: string;
}

@Component({
  selector: 'app-simple-chatbot',
  template: `
    <!-- Circle Button -->
    <div class="chat-circle" [class.open]="isOpen" (click)="toggle()">
      <ion-icon name="chatbubble-outline" *ngIf="!isOpen"></ion-icon>
      <ion-icon name="close-outline" *ngIf="isOpen"></ion-icon>
    </div>

    <!-- Chat Window -->
    <div class="chat-window" [class.show]="isOpen">
      <div class="chat-header">
        <h3>Chat with us</h3>
      </div>
      
      <div class="chat-messages" #messagesContainer>
        <div *ngFor="let msg of messages" 
             class="message" 
             [class.bot]="msg.isBot" 
             [class.user]="!msg.isBot">
          <div class="bubble">
            {{ msg.text }}
            <div class="time">{{ msg.time }}</div>
          </div>
        </div>
      </div>
      
      <div class="chat-input">
        <ion-textarea 
          [(ngModel)]="userInput" 
          placeholder="Type a message..."
          rows="1"
          (keydown.enter)="sendMessage()">
        </ion-textarea>
        <ion-button fill="clear" (click)="sendMessage()">
          <ion-icon name="send-outline"></ion-icon>
        </ion-button>
      </div>
    </div>
  `,
  styles: [`
    .chat-circle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: #007bff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,123,255,0.3);
      transition: all 0.3s ease;
      z-index: 1000;
    }

    .chat-circle:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(0,123,255,0.4);
    }

    .chat-circle.open {
      background: #dc3545;
    }

    .chat-circle ion-icon {
      font-size: 24px;
      color: white;
    }

    .chat-window {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 320px;
      height: 400px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      transform: scale(0) translateY(20px);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 999;
    }

    .chat-window.show {
      transform: scale(1) translateY(0);
      opacity: 1;
    }

    .chat-header {
      background: #007bff;
      color: white;
      padding: 15px;
      border-radius: 12px 12px 0 0;
      text-align: center;
    }

    .chat-header h3 {
      margin: 0;
      font-size: 16px;
    }

    .chat-messages {
      flex: 1;
      padding: 15px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .message {
      display: flex;
    }

    .message.bot {
      justify-content: flex-start;
    }

    .message.user {
      justify-content: flex-end;
    }

    .bubble {
      max-width: 70%;
      padding: 10px 12px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.4;
    }

    .message.bot .bubble {
      background: #f1f3f5;
      color: #333;
    }

    .message.user .bubble {
      background: #007bff;
      color: white;
    }

    .time {
      font-size: 11px;
      opacity: 0.7;
      margin-top: 4px;
      text-align: right;
    }

    .chat-input {
      padding: 15px;
      border-top: 1px solid #eee;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .chat-input ion-textarea {
      flex: 1;
      --background:rgba(120, 160, 199, 0.53);
      --border-radius: 20px;
      --padding-start: 12px;
      --padding-end: 12px;
    }

    .chat-input ion-button {
      --color: #007bff;
    }

    @media (max-width: 768px) {
      .chat-window {
        width: calc(100vw - 40px);
        height: 60vh;
        bottom: 90px;
        right: 20px;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, IonTextarea]
})
export class SimpleChatbotComponent {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  isOpen = false;
  userInput = '';
  messages: Message[] = [];

 botResponses = [
    "Hi there! 👋 How can I brighten your day today?",
    "That sounds super interesting! Tell me more about that! 🌟",
    "I'm absolutely here to help with whatever you need! ✨",
    "Thanks for reaching out! I'm excited to assist you! 🚀",
    "What an awesome question! Let's dive into that together! 💫",
    "I'd be thrilled to help! What's cooking in your mind? 🧠💡",
    "Amazing! How can I turn your day from good to incredible? 🌈",
    "Perfect timing! What fascinating thing would you like to explore? 🔍",
    "I'm all ears! What adventure can I help you with today? 👂✨",
    "So nice to meet you! What's the latest and greatest? 🎉",
    "Fantastic! I'm pumped to help you out! What's up? 💪",
    "Wonderful! What mystery can we solve together today? 🕵️‍♀️",
    "Brilliant! I'm ready for whatever challenge you bring! 🎯",
    "Excellent! What cool project are we working on? 🛠️",
    "Marvelous! How can I make your experience absolutely amazing? ⭐",
    "Spectacular! What's on your mind that I can help with? 🎨",
    "Outstanding! I'm here to make things easier for you! 🤝",
    "Incredible! What puzzle piece can I help you find? 🧩",
    "Phenomenal! Ready to tackle any question you've got! 🏆",
    "Stupendous! What can we accomplish together today? 🚀",
    "Delightful to chat with you! What's your latest curiosity? 🦋",
    "Fabulous! I'm your go-to helper - what's the mission? 🎪",
    "Magnificent! What exciting topic shall we explore? 🗺️",
    "Splendid! I'm energized and ready to assist! ⚡",
    "Terrific! What interesting challenge can I help tackle? 🎢",
    "Lovely to see you here! What's sparking your interest? ✨",
    "Superb! I'm your friendly problem-solver - what's up? 🦸‍♀️",
    "Exquisite! What fascinating question is on your mind? 💎",
    "Remarkable! I'm here to turn confusion into clarity! 🌅",
    "Dazzling! What amazing thing can we figure out together? 🎆"
  ];

  constructor() {
    addIcons({ chatbubbleOutline, closeOutline, sendOutline });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    
    if (this.isOpen && this.messages.length === 0) {
      // Welcome message
      setTimeout(() => {
        this.addBotMessage("Hello! 👋 I'm here to help. What can I do for you?");
      }, 500);
    }
  }

  sendMessage() {
    if (!this.userInput.trim()) return;

    // Add user message
    this.messages.push({
      text: this.userInput,
      isBot: false,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    });

    const userText = this.userInput;
    this.userInput = '';
    this.scrollToBottom();

    // Bot response after delay
    setTimeout(() => {
      this.addBotMessage(this.getBotResponse(userText));
    }, 800 + Math.random() * 1000);
  }

  addBotMessage(text: string) {
    this.messages.push({
      text: text,
      isBot: true,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    });
    this.scrollToBottom();
  }

  getBotResponse(userText: string): string {
    const text = userText.toLowerCase();
    
   // Greetings
    if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
      const greetings = [
        "Hello there! 😊 Nice to meet you!",
        "Hi! Great to see you here! 👋",
        "Hey there! Welcome! How's your day going? 🌟",
        "Hello! I'm so happy you stopped by! ✨"
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // Help requests
    if (text.includes('help') || text.includes('support') || text.includes('assist')) {
      const helpResponses = [
        "I'm here to help! What do you need assistance with? 🤝",
        "Absolutely! I'd love to help you out. What's the issue? 💪",
        "Of course! What can I help you with today? 🌟",
        "I'm your personal assistant! How can I make things easier for you? ✨"
      ];
      return helpResponses[Math.floor(Math.random() * helpResponses.length)];
    }

    // Thanks responses
    if (text.includes('thanks') || text.includes('thank you') || text.includes('thx')) {
      const thanksResponses = [
        "You're very welcome! Happy to help! 😊",
        "My pleasure! That's what I'm here for! 💫",
        "Anytime! I love helping awesome people like you! 🌟",
        "You're so welcome! Glad I could assist! ✨"
      ];
      return thanksResponses[Math.floor(Math.random() * thanksResponses.length)];
    }

    // Goodbye
    if (text.includes('bye') || text.includes('goodbye') || text.includes('see you')) {
      const goodbyes = [
        "Goodbye! Feel free to chat with me anytime! 👋",
        "See you later! I'll be here whenever you need me! 🌟",
        "Bye for now! It was great chatting with you! ✨",
        "Take care! Come back soon! 💫"
      ];
      return goodbyes[Math.floor(Math.random() * goodbyes.length)];
    }

    // How are you
    if (text.includes('how are you') || text.includes('how do you do')) {
      const statusResponses = [
        "I'm doing great, thanks for asking! How are you? 😊",
        "Fantastic! I'm excited to help you today! How about you? 🌟",
        "I'm wonderful! Thanks for being so thoughtful! How's your day? ✨",
        "I'm amazing! I love meeting new people! How are things with you? 💫"
      ];
      return statusResponses[Math.floor(Math.random() * statusResponses.length)];
    }

    // Products/Services
    if (text.includes('product') || text.includes('service') || text.includes('what do you sell')) {
      const productResponses = [
        "I'd love to tell you about our products and services! What specifically interests you? 🛍️",
        "We have amazing products! What are you looking for today? ✨",
        "Great question! Our products are top-notch! What can I show you? 🌟",
        "Awesome! We've got some incredible offerings! What catches your eye? 💫"
      ];
      return productResponses[Math.floor(Math.random() * productResponses.length)];
    }

    // Pricing
    if (text.includes('price') || text.includes('cost') || text.includes('how much') || text.includes('payment')) {
      const priceResponses = [
        "For pricing information, I can connect you with our sales team! Would you like that? 💰",
        "Great question about pricing! Let me get you connected with someone who can help! 📊",
        "I'd love to help with pricing! Our team can give you all the details! 💳",
        "Perfect timing for pricing questions! Want me to connect you with our experts? ✨"
      ];
      return priceResponses[Math.floor(Math.random() * priceResponses.length)];
    }

    // Compliments
    if (text.includes('awesome') || text.includes('great') || text.includes('amazing') || text.includes('love') || text.includes('like you')) {
      const complimentResponses = [
        "Aww, you're so sweet! Thank you! 😊 How can I help you?",
        "That's so kind of you to say! 💕 What can I do for you today?",
        "You just made my day! Thank you! 🌟 How may I assist?",
        "You're pretty amazing yourself! ✨ What brings you here?"
      ];
      return complimentResponses[Math.floor(Math.random() * complimentResponses.length)];
    }

    // Questions about the bot
    if (text.includes('who are you') || text.includes('what are you') || text.includes('are you real')) {
      const identityResponses = [
        "I'm your friendly AI assistant! I'm here to help make your experience amazing! 🤖✨",
        "I'm a virtual helper designed to assist you with anything you need! How can I help? 🌟",
        "I'm an AI chatbot, but I'm very real in my desire to help you! What can I do? 💫",
        "I'm your digital assistant! Think of me as your helpful friend online! 😊"
      ];
      return identityResponses[Math.floor(Math.random() * identityResponses.length)];
    }

    // Problems/Issues
    if (text.includes('problem') || text.includes('issue') || text.includes('wrong') || text.includes('error') || text.includes('broken')) {
      const problemResponses = [
        "Oh no! I'm sorry you're having an issue. Let me help you fix that! 🔧",
        "That sounds frustrating! I'm here to help resolve this for you! 💪",
        "I understand that's annoying. Let's get this sorted out together! ✨",
        "No worries! Problems happen, but we can solve this! How can I assist? 🌟"
      ];
      return problemResponses[Math.floor(Math.random() * problemResponses.length)];
    }

    // Random fun responses
    const funResponses = [
      "That's fascinating! Tell me more about that! 🤔",
      "Interesting! I love learning new things from people like you! 📚",
      "Cool! What else would you like to know? 🚀",
      "That's neat! How can I help you explore that further? 🔍",
      "Awesome! What other questions do you have? 💡"
    ];

    // Random response if no keywords match
    const randomResponses = [...this.botResponses, ...funResponses];
    return randomResponses[Math.floor(Math.random() * randomResponses.length)];
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 100);
  }
}