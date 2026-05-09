/**
 * 商品相关类型定义
 */

import { Money, Timestamp } from './api.types';

/**
 * 分类
 */
interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  icon?: string;
  sort: number;
  isActive: boolean;
}

/**
 * 商品
 */
interface Product {
  id: string;
  name: string;
  description: string;
  price: Money;
  originalPrice?: Money;
  images: string[];
  thumbnail?: string;
  categoryId: string;
  category?: Category;
  stock: number;
  sales: number;
  isFeatured: boolean;
  isActive: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 商品详情
 */
interface ProductDetail extends Product {
  content: string;
  specifications: Record<string, string>;
  reviews: Review[];
  rating: number;
  reviewCount: number;
}

/**
 * 商品评价
 */
interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  productId: string;
  rating: number;
  content: string;
  images?: string[];
  createdAt: string;
}

/**
 * 商品列表响应
 */
interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * 分类列表响应
 */
interface CategoryListResponse {
  items: Category[];
  total: number;
}

export type {
  Category,
  Product,
  ProductDetail,
  Review,
  ProductListResponse,
  CategoryListResponse,
};
