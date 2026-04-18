/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  originalPrice?: number; // For showing discounts
  stockQuantity: number;
  imageUrl?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'customer' | 'admin';
  address?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'out-for-delivery' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock?: number; // Added to enforce limits in cart
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  createdAt: any; // Firestore Timestamp
  deliveryAddress: string;
  customerEmail: string;
  customerPhone?: string;
  customerName: string;
  tracking?: {
    lat: number;
    lng: number;
    lastUpdated: any;
  };
}

export interface StoreSettings {
  showDeals: boolean;
  dealsTitle: string;
}
