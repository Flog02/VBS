import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  docData, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp 
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { StoreLocation } from '../models/store-location.model';
import { Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class StoreLocationService {
  private storeLocationsCollection = collection(this.firestore, 'storeLocations');

  constructor(
    private firestore: Firestore,
    private storage: Storage
  ) {}

  getStoreLocations(): Observable<StoreLocation[]> {
    const activeLocationsQuery = query(
      this.storeLocationsCollection,
      where('isActive', '==', true)
    );
    
    return collectionData(activeLocationsQuery, { idField: 'id' }) as Observable<StoreLocation[]>;
  }

  getStoreLocationById(id: string): Observable<StoreLocation> {
    const storeDoc = doc(this.firestore, `storeLocations/${id}`);
    return docData(storeDoc, { idField: 'id' }) as Observable<StoreLocation>;
  }

  createStoreLocation(store: Omit<StoreLocation, 'id'>): Observable<string> {
    return from(addDoc(this.storeLocationsCollection, {
      ...store,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })).pipe(
      map(docRef => docRef.id)
    );
  }

  updateStoreLocation(id: string, store: Partial<StoreLocation>): Observable<void> {
    const storeDoc = doc(this.firestore, `storeLocations/${id}`);
    return from(updateDoc(storeDoc, {
      ...store,
      updatedAt: serverTimestamp()
    }));
  }

  deleteStoreLocation(id: string): Observable<void> {
    const storeDoc = doc(this.firestore, `storeLocations/${id}`);
    return from(deleteDoc(storeDoc));
  }

  uploadStoreImage(file: File, storeId: string): Observable<string> {
    const filePath = `stores/${storeId}/${Date.now()}_${file.name}`;
    const fileRef = ref(this.storage, filePath);
    const uploadTask = uploadBytesResumable(fileRef, file);

    return new Observable<string>(observer => {
      uploadTask.on('state_changed',
        (snapshot) => {
          // Handle progress if needed
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        },
        (error) => {
          // Handle unsuccessful uploads
          observer.error(error);
        },
        () => {
          // Handle successful uploads
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            observer.next(downloadURL);
            observer.complete();
          });
        }
      );
    });
  }
}