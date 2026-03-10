export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = 'user' | 'admin';
export type ProductStatus = 'draft' | 'active' | 'archived';
export type DiscountScope = 'product' | 'category' | 'collection';
export type DiscountType = 'fixed' | 'percentage';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: AppRole;
          telegram_user_id: number | null;
          display_name: string | null;
          username: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: AppRole;
          telegram_user_id?: number | null;
          display_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: AppRole;
          telegram_user_id?: number | null;
          display_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      collections: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          category_id: string | null;
          slug: string;
          title: string;
          short_description: string | null;
          description: string | null;
          price: number;
          compare_at_price: number | null;
          currency: string;
          status: ProductStatus;
          is_featured: boolean;
          stock_quantity: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          slug: string;
          title: string;
          short_description?: string | null;
          description?: string | null;
          price: number;
          compare_at_price?: number | null;
          currency?: string;
          status?: ProductStatus;
          is_featured?: boolean;
          stock_quantity?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string | null;
          slug?: string;
          title?: string;
          short_description?: string | null;
          description?: string | null;
          price?: number;
          compare_at_price?: number | null;
          currency?: string;
          status?: ProductStatus;
          is_featured?: boolean;
          stock_quantity?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          alt: string | null;
          sort_order: number;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          alt?: string | null;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          url?: string;
          alt?: string | null;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      collection_items: {
        Row: {
          id: string;
          collection_id: string;
          product_id: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          product_id: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          collection_id?: string;
          product_id?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
      };
      cart_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      discounts: {
        Row: {
          id: string;
          scope: DiscountScope;
          target_id: string;
          type: DiscountType;
          title: string;
          value: number;
          is_active: boolean;
          starts_at: string | null;
          ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          scope: DiscountScope;
          target_id: string;
          type: DiscountType;
          title: string;
          value: number;
          is_active?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          scope?: DiscountScope;
          target_id?: string;
          type?: DiscountType;
          title?: string;
          value?: number;
          is_active?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          status: OrderStatus;
          subtotal_amount: number;
          discount_amount: number;
          shipping_amount: number;
          total_amount: number;
          currency: string;
          customer_display_name: string | null;
          customer_username: string | null;
          customer_phone: string | null;
          shipping_address: Json;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: OrderStatus;
          subtotal_amount?: number;
          discount_amount?: number;
          shipping_amount?: number;
          total_amount?: number;
          currency?: string;
          customer_display_name?: string | null;
          customer_username?: string | null;
          customer_phone?: string | null;
          shipping_address?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: OrderStatus;
          subtotal_amount?: number;
          discount_amount?: number;
          shipping_amount?: number;
          total_amount?: number;
          currency?: string;
          customer_display_name?: string | null;
          customer_username?: string | null;
          customer_phone?: string | null;
          shipping_address?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          quantity: number;
          product_title: string;
          product_slug: string | null;
          product_image_url: string | null;
          unit_price: number;
          line_total: number;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          quantity: number;
          product_title: string;
          product_slug?: string | null;
          product_image_url?: string | null;
          unit_price: number;
          line_total?: never;
          currency?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          quantity?: number;
          product_title?: string;
          product_slug?: string | null;
          product_image_url?: string | null;
          unit_price?: number;
          line_total?: never;
          currency?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_order_from_cart: {
        Args: {
          p_user_id: string;
          p_customer_display_name: string;
          p_customer_phone: string;
          p_shipping_city: string;
          p_shipping_address_line: string;
          p_shipping_postal_code?: string | null;
          p_notes?: string | null;
        };
        Returns: Array<{
          order_id: string;
          total_amount: number;
          currency: string;
          items_count: number;
        }>;
      };
    };
    CompositeTypes: Record<string, never>;
    Enums: {
      app_role: AppRole;
      discount_scope: DiscountScope;
      discount_type: DiscountType;
      product_status: ProductStatus;
      order_status: OrderStatus;
    };
  };
}
