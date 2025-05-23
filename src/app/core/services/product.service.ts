import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  docData, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit as limitTo, 
  startAfter, 
  getDocs, 
  serverTimestamp, 
  addDoc,
  DocumentData,
  QueryDocumentSnapshot,
  DocumentSnapshot
} from '@angular/fire/firestore';
import { Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { Observable, from, combineLatest, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productsCollection = collection(this.firestore, 'products');

  constructor(
    private firestore: Firestore,
    private storage: Storage
  ) {}

  getProducts(
    category?: string, 
    sortBy: string = 'createdAt', 
    sortDirection: 'asc' | 'desc' = 'desc',
    pageSize: number = 10,
    lastVisible?: QueryDocumentSnapshot<DocumentData>
  ): Observable<{ 
    products: Product[], 
    lastVisible: QueryDocumentSnapshot<DocumentData> | null 
  }> {
    let productsQuery: any;
    
    if (category) {
      productsQuery = query(
        this.productsCollection,
        where('category', '==', category),
        orderBy(sortBy, sortDirection),
        limitTo(pageSize)
      );
    } else {
      productsQuery = query(
        this.productsCollection,
        orderBy(sortBy, sortDirection),
        limitTo(pageSize)
      );
    }
    
    // If we have a last document, start after it
    if (lastVisible) {
      productsQuery = query(
        productsQuery,
        startAfter(lastVisible)
      );
    }

    return from(getDocs(productsQuery)).pipe(
      map(snapshot => {
        const products = snapshot.docs.map(docSnapshot => {
          // Get the document data as a JavaScript object first
          const data = docSnapshot.data() as DocumentData;
          
          // Then create a new object with id and all data properties
          return {
            id: docSnapshot.id,
            ...data
          } as unknown as Product;
        });
        
        // Get the last visible document
        const lastVisibleDoc = snapshot.docs.length > 0 ? 
          snapshot.docs[snapshot.docs.length - 1] : 
          null;
          
        return { 
          products, 
          lastVisible: lastVisibleDoc as QueryDocumentSnapshot<DocumentData> | null
        };
      })
    );
  }

  getFeaturedProducts(maxItems: number = 6): Observable<Product[]> {
    const featuredQuery = query(
      this.productsCollection,
      where('featured', '==', true),
      orderBy('createdAt', 'desc'),
      limitTo(maxItems)
    );

    return collectionData(featuredQuery, { idField: 'id' }).pipe(
      map(items => items as unknown as Product[])
    );
  }

  getProductById(id: string): Observable<Product> {
    const productDoc = doc(this.firestore, `products/${id}`);
    return docData(productDoc, { idField: 'id' }).pipe(
      map(item => item as unknown as Product)
    );
  }


getProductsByIds(ids: string[]): Observable<Product[]> {
  if (!ids.length) {
    return of([]);
  }

  // Need to batch in groups of 10 due to Firestore limitations
  const batchSize = 10;
  const batches: Observable<Product[]>[] = [];

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const batchQuery = query(
      this.productsCollection,
      where('id', 'in', batch)
    );
    batches.push(collectionData(batchQuery, { idField: 'id' }).pipe(
      map(items => items as unknown as Product[])
    ));
  }

  return batches.length > 0 
    ? combineLatest(batches).pipe(
        map(results => {
          // Alternative to flat() - using reduce to flatten the array
          return results.reduce((accumulator, currentValue) => {
            return accumulator.concat(currentValue);
          }, [] as Product[]);
        })
      )
    : of([]);
}

  searchProducts(searchTerm: string): Observable<Product[]> {
    // In a real app, you'd use Algolia, Elasticsearch, or Firestore's full-text search
    // For simplicity, we'll just filter by name containing the search term
    const searchQuery = query(
      this.productsCollection,
      where('name', '>=', searchTerm),
      where('name', '<=', searchTerm + '\uf8ff'),
      limitTo(20)
    );

    return collectionData(searchQuery, { idField: 'id' }).pipe(
      map(items => items as unknown as Product[])
    );
  }

  createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Observable<string> {
    return from(addDoc(this.productsCollection, {
      ...product,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })).pipe(
      map(docRef => docRef.id)
    );
  }

  updateProduct(id: string, product: Partial<Product>): Observable<void> {
    const productDoc = doc(this.firestore, `products/${id}`);
    return from(updateDoc(productDoc, {
      ...product,
      updatedAt: serverTimestamp()
    }));
  }

  deleteProduct(id: string): Observable<void> {
    const productDoc = doc(this.firestore, `products/${id}`);
    
    // First get the product to delete its images
    return docData(productDoc, { idField: 'id' }).pipe(
      take(1),
      map(data => data as unknown as Product),
      switchMap((product: Product) => {
        // Delete all product images
        const deleteImagePromises = product.images.map(imageUrl => {
          const imageRef = ref(this.storage, imageUrl);
          return deleteObject(imageRef);
        });
        
        // Also delete 3D model if exists
        if (product.model3dUrl) {
          const modelRef = ref(this.storage, product.model3dUrl);
          deleteImagePromises.push(deleteObject(modelRef));
        }
        
        // Execute all delete operations and then delete the product document
        return from(Promise.all(deleteImagePromises)).pipe(
          switchMap(() => deleteDoc(productDoc))
        );
      })
    );
  }

  uploadProductImage(file: File, productId: string): Observable<string> {
    const filePath = `products/${productId}/${Date.now()}_${file.name}`;
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

  upload3DModel(file: File, productId: string): Observable<string> {
    const filePath = `models/${productId}/${Date.now()}_${file.name}`;
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