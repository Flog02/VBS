import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { doc, setDoc } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(private auth : Auth , private firestore : Firestore) {}
  ngOnInit() {
  this.auth.onAuthStateChanged(user => {
    if (user) {
      console.log('User authenticated with ID:', user.uid);
      // Test Firestore access with a simple query
      const testRef = doc(this.firestore, 'test', 'testdoc');
      setDoc(testRef, { timestamp: new Date() })
        .then(() => console.log('Test document written successfully'))
        .catch(error => console.error('Test document write failed:', error));
    } else {
      console.log('No user authenticated');
    }
  });
}
}
