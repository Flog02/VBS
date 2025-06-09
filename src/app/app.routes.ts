// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'debug',
    loadComponent: () => import('./debug/debug.component').then(m => m.DebugComponent)
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.page').then(m => m.HomePage)
  },
  {
    path: 'products',
    loadComponent: () => import('./features/products/products.page').then(m => m.ProductsPage)
  },
  {
    path: 'products/:id',
    loadComponent: () => import('./features/product-detail/product-detail.page').then(m => m.ProductDetailPage)
  },
  {
    path: 'cart',
    loadComponent: () => import('./features/cart/cart.page').then(m => m.CartPage)
  },
  {
    path: 'checkout',
    loadComponent: () => import('./features/checkout/checkout.page').then(m => m.CheckoutPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.page').then(m => m.LoginPage)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.page').then(m => m.RegisterPage)
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./features/auth/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage)
      }
    ]
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/user-profile/user-profile.page').then(m => m.UserProfilePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'orders',
    loadComponent: () => import('./features/orders/orders.page').then(m => m.OrdersPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'orders/:id',
    loadComponent: () => import('./features/order-detail/order-detail.page').then(m => m.OrderDetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'wishlist',
    loadComponent: () => import('./features/wishlist/wishlist.page').then(m => m.WishlistPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'chat',
    loadComponent: () => import('./features/chat/chat.page').then(m => m.ChatPage)
  },
  {
    path: 'stores',
    loadComponent: () => import('./features/store-locator/store-locator.page').then(m => m.StoreLocatorPage)
  },
  {
    path: 'admin',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/admin/dashboard/dashboard.page').then(m => m.DashboardPage)
      },
      {
        path: 'products',
        loadComponent: () => import('./features/admin/product-management/product-management.page').then(m => m.ProductManagementPage)
      },
      {
        path: 'products/new',
        loadComponent: () => import('./features/admin/product-form/product-form.component').then(m => m.ProductFormComponent)
      },
      {
        path: 'products/edit/:id',
        loadComponent: () => import('./features/admin/product-form/product-form.component').then(m => m.ProductFormComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/admin/order-management/order-management.page').then(m => m.OrderManagementPage)
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./features/admin/order-detail/order-detail.page').then(m => m.OrderDetailPage)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/user-management/user-management.page').then(m => m.UserManagementPage)
      },
      {
        path: 'chats',
        loadComponent: () => import('./features/admin/chat-management/chat-management.page').then(m => m.ChatManagementPage)
      }
    ],
    canActivate: [AdminGuard] // ✅ FIXED: Uncommented and enabled AdminGuard
  },
  {
    path: '**',
    loadComponent: () => import('./features/home/home.page').then(m => m.HomePage)
  }
];