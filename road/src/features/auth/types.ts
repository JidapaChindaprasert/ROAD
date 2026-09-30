import { UserRole } from "@/features/reports/types";

export type { UserRole };

export interface AuthProfile {
  id: string;
  displayName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  roles: UserRole[];
  isStaff: boolean;
  isAdmin: boolean;
  createdAt?: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  displayName: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: AuthUser | null;
  error?: {
    code: string;
    message: string;
  };
}

export interface SignUpResult {
  success: boolean;
  requiresEmailConfirmation?: boolean;
  email?: string;
  user?: AuthUser | null;
  message?: string;
}

export interface SignInResult {
  success: boolean;
  requiresEmailConfirmation?: boolean;
  email?: string;
  user?: AuthUser | null;
  message?: string;
}

