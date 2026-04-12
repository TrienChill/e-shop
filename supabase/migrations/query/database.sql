-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.Collection (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  collection_name text,
  CONSTRAINT Collection_pkey PRIMARY KEY (id)
);
CREATE TABLE public.banners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text,
  subtitle text,
  action_type text NOT NULL DEFAULT 'none'::text CHECK (action_type = ANY (ARRAY['product'::text, 'category'::text, 'external_url'::text, 'collection'::text, 'none'::text])),
  action_value text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT banners_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cart_item_inventory_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cart_item_id uuid NOT NULL,
  product_id integer NOT NULL,
  quantity_requested integer NOT NULL,
  quantity_available integer NOT NULL,
  status character varying NOT NULL DEFAULT 'valid'::character varying,
  checked_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cart_item_inventory_log_pkey PRIMARY KEY (id),
  CONSTRAINT cart_item_inventory_log_cart_item_id_fkey FOREIGN KEY (cart_item_id) REFERENCES public.cart_items(id),
  CONSTRAINT cart_item_inventory_log_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id bigint NOT NULL,
  quantity integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_selected boolean NOT NULL DEFAULT true,
  shop_voucher_id uuid,
  color text,
  size text,
  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT cart_items_shop_voucher_id_fkey FOREIGN KEY (shop_voucher_id) REFERENCES public.vouchers(id)
);
CREATE TABLE public.categories (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  name_vi text,
  slug text,
  parent_id bigint,
  group text DEFAULT 'common'::text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id)
);
CREATE TABLE public.conversations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.membership_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  level_name text NOT NULL,
  min_spending numeric NOT NULL,
  benefit_percentage numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  min_orders integer DEFAULT 0,
  CONSTRAINT membership_levels_pkey PRIMARY KEY (id)
);
CREATE TABLE public.messages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  conversation_id bigint,
  sender_id uuid,
  content text NOT NULL,
  is_ai boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id)
);
CREATE TABLE public.order_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id bigint,
  product_id bigint,
  quantity integer NOT NULL DEFAULT 1,
  price_at_purchase numeric NOT NULL,
  selected_variant jsonb,
  created_at timestamp with time zone DEFAULT now(),
  is_reviewed boolean DEFAULT false,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.order_vouchers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id bigint NOT NULL,
  voucher_id uuid NOT NULL,
  discount_type character varying NOT NULL,
  discount_amount numeric NOT NULL CHECK (discount_amount >= 0::numeric),
  applied_on_item_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_vouchers_pkey PRIMARY KEY (id),
  CONSTRAINT order_vouchers_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_vouchers_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id),
  CONSTRAINT order_vouchers_applied_on_item_id_fkey FOREIGN KEY (applied_on_item_id) REFERENCES public.cart_items(id)
);
CREATE TABLE public.orders (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  status USER-DEFINED DEFAULT 'pending'::order_status,
  total_amount numeric NOT NULL,
  shipping_address text NOT NULL,
  phone_contact text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  shop_discounts jsonb,
  platform_discount numeric DEFAULT 0,
  platform_voucher_id uuid,
  address_id uuid,
  receiver_name text,
  receiver_phone text,
  full_shipping_address text,
  shipping_method_id uuid,
  shipping_fee numeric DEFAULT 0,
  time_finished timestamp with time zone,
  processing_at timestamp with time zone,
  shipping_at timestamp with time zone,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT orders_platform_voucher_id_fkey FOREIGN KEY (platform_voucher_id) REFERENCES public.vouchers(id),
  CONSTRAINT orders_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.user_addresses(id),
  CONSTRAINT orders_shipping_method_id_fkey FOREIGN KEY (shipping_method_id) REFERENCES public.shipping_methods(id)
);
CREATE TABLE public.posts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  title text NOT NULL,
  slug text UNIQUE,
  excerpt text,
  content text,
  cover_image text,
  author_name text DEFAULT 'E-Shop Team'::text,
  related_product_ids ARRAY DEFAULT '{}'::bigint[],
  tags ARRAY DEFAULT '{}'::text[],
  is_published boolean DEFAULT false,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.product_discounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id bigint NOT NULL,
  discount_type text NOT NULL CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text])),
  discount_value numeric NOT NULL CHECK (discount_value > 0::numeric),
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_discounts_pkey PRIMARY KEY (id),
  CONSTRAINT product_discounts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id bigint,
  variant_id uuid,
  url text NOT NULL,
  display_order integer DEFAULT 0,
  is_thumbnail boolean DEFAULT false,
  image_type text CHECK (image_type = ANY (ARRAY['general'::text, 'variant'::text, 'description'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_images_pkey PRIMARY KEY (id),
  CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_images_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id bigint,
  sku text UNIQUE,
  color text,
  size text,
  price numeric,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_variants_pkey PRIMARY KEY (id),
  CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.product_view_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id bigint NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_view_history_pkey PRIMARY KEY (id),
  CONSTRAINT product_view_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT product_view_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.products (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  category_id bigint,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  variants jsonb DEFAULT '{}'::jsonb,
  stock integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  collection_id bigint,
  specifications jsonb DEFAULT '[]'::jsonb,
  short_description text,
  shipping_info jsonb DEFAULT '[{"time": "5-7 ngày", "type": "Tiêu chuẩn", "price": 3.00}, {"time": "1-2 ngày", "type": "Hỏa tốc", "price": 12.00}]'::jsonb,
  fts tsvector DEFAULT to_tsvector('simple'::regconfig, ((((((COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || immutable_unaccent(COALESCE(name, ''::text))) || ' '::text) || immutable_unaccent(COALESCE(description, ''::text)))),
  images ARRAY,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT products_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.Collection(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  role USER-DEFINED DEFAULT 'user'::user_role,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  recent_views jsonb DEFAULT '[]'::jsonb,
  total_spending numeric DEFAULT 0,
  membership_level_id uuid,
  total_orders_completed integer DEFAULT 0,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_membership_level_id_fkey FOREIGN KEY (membership_level_id) REFERENCES public.membership_levels(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id bigint NOT NULL,
  order_id bigint NOT NULL,
  rating numeric NOT NULL CHECK (rating >= 1::numeric AND rating <= 5::numeric),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  order_item_id bigint UNIQUE,
  images ARRAY DEFAULT '{}'::text[],
  is_edited boolean DEFAULT false,
  is_visible boolean DEFAULT true,
  admin_reply text,
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT reviews_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id)
);
CREATE TABLE public.shipping_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  min_time text NOT NULL,
  max_time text NOT NULL,
  unit text DEFAULT 'ngày'::text,
  price numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shipping_methods_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  receiver_name text NOT NULL,
  phone_number text NOT NULL,
  province_city text NOT NULL,
  district text NOT NULL,
  ward_commune text,
  street_address text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.user_vouchers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  voucher_id uuid,
  is_used boolean DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_vouchers_pkey PRIMARY KEY (id),
  CONSTRAINT user_vouchers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT user_vouchers_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id)
);
CREATE TABLE public.vouchers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type character varying NOT NULL,
  discount_value numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  expired_at timestamp with time zone,
  voucher_type character varying NOT NULL DEFAULT 'shop'::character varying,
  conditions jsonb,
  max_discount numeric DEFAULT NULL::numeric,
  is_public boolean DEFAULT true,
  usage_limit integer DEFAULT 100,
  used_count integer DEFAULT 0,
  min_order_value numeric DEFAULT 0,
  start_date timestamp with time zone DEFAULT now(),
  CONSTRAINT vouchers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wishlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wishlist_pkey PRIMARY KEY (id),
  CONSTRAINT wishlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT wishlist_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);