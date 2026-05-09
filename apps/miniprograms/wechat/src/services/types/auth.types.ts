/**
 * 认证相关类型定义
 */

import { Timestamp } from './api.types';

/**
 * 登录请求参数
 */
interface LoginParams {
  identifier: string;
  password: string;
}

/**
 * 微信登录请求参数
 */
interface WechatLoginParams {
  code: string;
  nickname?: string;
  avatarUrl?: string;
}

/**
 * 用户信息
 */
interface User {
  id: string;
  username: string;
  nickname?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive' | 'banned';
  createdAt: string;
  updatedAt: string;
}

/**
 * 角色信息
 */
interface Role {
  id: string;
  name: string;
  description?: string;
}

/**
 * 完整用户信息（包含角色和权限）
 */
interface UserInfo {
  user: User;
  roles: Role[];
  permissions: string[];
}

/**
 * 登录响应
 */
interface LoginResponse {
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

/**
 * 认证状态
 */
interface AuthState {
  isLoggedIn: boolean;
  user: UserInfo | null;
  token: string;
}

export type {
  LoginParams,
  WechatLoginParams,
  User,
  Role,
  UserInfo,
  LoginResponse,
  AuthState,
};
