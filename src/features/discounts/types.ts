import type { DiscountScope, DiscountType } from '@/types/db';

export interface DiscountUpsertInput {
  scope: DiscountScope;
  targetId: string;
  title: string;
  type: DiscountType;
  value: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface AdminDiscountItem {
  id: string;
  scope: DiscountScope;
  targetId: string;
  targetTitle: string;
  title: string;
  type: DiscountType;
  value: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  currentState: 'live' | 'scheduled' | 'expired' | 'inactive';
}

export interface DiscountTargetOption {
  id: string;
  title: string;
  subtitle?: string | null;
}
