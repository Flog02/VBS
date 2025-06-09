//src/app/core/services/product.service.ts - Fixed getProductsByIds method
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
  DocumentSnapshot,
  documentId  // <-- ADD THIS IMPORT
} from '@angular/fire/firestore';
import { Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { Observable, from, combineLatest, of } from 'rxjs';
import { map, switchMap, take, tap, catchError } from 'rxjs/operators';
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

  // FIXED METHOD - this was the main issue
  getProductsByIds(ids: string[]): Observable<Product[]> {
    console.log('ProductService: getProductsByIds called with IDs:', ids);
    
    if (!ids || ids.length === 0) {
      console.log('ProductService: No IDs provided, returning empty array');
      return of([]);
    }

    // Remove any undefined/null values and duplicates
    const cleanIds = [...new Set(ids.filter(id => id && typeof id === 'string'))];
    console.log('ProductService: Cleaned IDs:', cleanIds);

    if (cleanIds.length === 0) {
      console.log('ProductService: No valid IDs after cleaning, returning empty array');
      return of([]);
    }

    // Need to batch in groups of 10 due to Firestore limitations
    const batchSize = 10;
    const batches: Observable<Product[]>[] = [];

    for (let i = 0; i < cleanIds.length; i += batchSize) {
      const batch = cleanIds.slice(i, i + batchSize);
      console.log(`ProductService: Creating batch ${Math.floor(i/batchSize)} with IDs:`, batch);
      
      // FIXED: Use documentId() instead of 'id'
      const batchQuery = query(
        this.productsCollection,
        where(documentId(), 'in', batch)
      );
      
      const batchObservable = collectionData(batchQuery, { idField: 'id' }).pipe(
        map(items => items as unknown as Product[]),
        tap(products => {
          console.log(`ProductService: Batch ${Math.floor(i/batchSize)} returned:`, products.length, 'products');
          if (products.length > 0) {
            console.log('ProductService: Product IDs in batch:', products.map(p => p.id));
          }
        }),
        catchError(error => {
          console.error(`ProductService: Error in batch ${Math.floor(i/batchSize)}:`, error);
          return of([]);
        })
      );
      
      batches.push(batchObservable);
    }

    return batches.length > 0 
      ? combineLatest(batches).pipe(
          map(results => {
            const allProducts = results.reduce((accumulator, currentValue) => {
              return accumulator.concat(currentValue);
            }, [] as Product[]);
            
            console.log('ProductService: Final result - total products:', allProducts.length);
            console.log('ProductService: Final product IDs:', allProducts.map(p => p.id));
            
            return allProducts;
          }),
          catchError(error => {
            console.error('ProductService: Error combining batches:', error);
            return of([]);
          })
        )
      : of([]);
  }

  // Alternative method if the above still doesn't work
  getProductsByIdsAlternative(ids: string[]): Observable<Product[]> {
    console.log('ProductService: Alternative method called with IDs:', ids);
    
    if (!ids || ids.length === 0) {
      return of([]);
    }

    // Fetch each product individually
    const productObservables = ids.map(id => 
      this.getProductById(id).pipe(
        tap(product => {
          console.log(`ProductService: Individual fetch for ${id}:`, product ? 'found' : 'not found');
        }),
        catchError(error => {
          console.error(`ProductService: Error fetching product ${id}:`, error);
          return of(null);
        })
      )
    );

    return combineLatest(productObservables).pipe(
      map(products => {
        const validProducts = products.filter(p => p !== null) as Product[];
        console.log('ProductService: Alternative method result:', validProducts.length, 'valid products');
        return validProducts;
      })
    );
  }

  // Your other existing methods remain the same...
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
    
    if (lastVisible) {
      productsQuery = query(
        productsQuery,
        startAfter(lastVisible)
      );
    }

    return from(getDocs(productsQuery)).pipe(
      map(snapshot => {
        const products = snapshot.docs.map(docSnapshot => {
          const data = docSnapshot.data() as DocumentData;
          return {
            id: docSnapshot.id,
            ...data
          } as unknown as Product;
        });
        
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

  searchProducts(searchTerm: string): Observable<Product[]> {
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
    
    return docData(productDoc, { idField: 'id' }).pipe(
      take(1),
      map(data => data as unknown as Product),
      switchMap((product: Product) => {
        const deleteImagePromises = product.images.map(imageUrl => {
          const imageRef = ref(this.storage, imageUrl);
          return deleteObject(imageRef);
        });
        
        if (product.model3dUrl) {
          const modelRef = ref(this.storage, product.model3dUrl);
          deleteImagePromises.push(deleteObject(modelRef));
        }
        
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
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        },
        (error) => {
          observer.error(error);
        },
        () => {
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
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        },
        (error) => {
          observer.error(error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            observer.next(downloadURL);
            observer.complete();
          });
        }
      );
    });
  }
}