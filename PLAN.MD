# Plan to Link Hero Section to Collection Page

This document outlines the steps taken to link the Hero Section on the home page to the corresponding collection page, and to fix related issues on the collection page itself.

## 1. Update Home Page (`app/(shop)/(tabs)/index.tsx`)

- **Modify Hero Section Data Fetching:**
  - The `useEffect` hook was changed to fetch the most recent category from the `categories` table in Supabase.
  - The `heroCollection` state is now populated with the ID, name, and image of this category. This replaces the old logic that incorrectly fetched a single product.

- **Update Hero Section Link:**
  - The `onPress` event for the Hero Section `TouchableOpacity` was updated.
  - It now navigates to `/collection/[id]`, passing the ID of the fetched category. The previous implementation incorrectly linked to a product page.

## 2. Fix and Update Collection Page (`app/(shop)/collection/[id].tsx`)

- **Correct Data Fetching Logic:**
  - The `fetchCollectionData` function was updated to query the `categories` table instead of the non-existent `collections` table.
  - The query to fetch products was corrected to filter by `category_id` instead of `collection_id` to align with the database schema.

- **Fix Data Mapping:**
  - Corrected an issue where product prices were being formatted with `toLocalString()` instead of `toLocaleString()`.
  - Fixed the logic for retrieving product images to correctly use the `images` array from the product data, preventing crashes if the image data is missing.

- **Fix Component Rendering Logic:**
  - The component's structure was corrected to properly handle the `loading` state.
  - An `ActivityIndicator` is now displayed while data is being fetched.
  - The main component content is rendered only after the loading is complete, fixing a critical bug that caused the component to only render *during* the loading phase.

- **Fix Product Link:**
  - Corrected a bug in the `ProductCard` component where the `onPress` handler used incorrect string interpolation (`''` instead of ` `` `), which would have prevented links to product detail pages from working.

## 3. Cấu trúc thư mục dự án

  e_shop/
├── .expo/
├── .vscode/
├── app/                            # EXPO ROUTER (Chỉ chứa logic điều hướng)
│   ├── (admin)/                    # Khu vực Admin (Web/Tablet)
│   │   ├──_layout.tsx
│   │   └── ...
│   ├── (auth)/                     # Auth Stack (Login, Register...)
│   ├── (shop)/                     # Customer Stack
│   │   ├── (tabs)/                 # Main Tabs (Home, Shop, Chat, Profile)
│   │   ├── cart/                   # Các màn hình Cart/Checkout
│   │   ├── product/                # Chi tiết sản phẩm
│   │   └── ...
│   ├── +not-found.tsx
│   ├── _layout.tsx                 # Root Layout (Provider setup: Redux/Zustand, Query...)
│   └── index.tsx                   # Entry point (Splash check)
├── assets/                         # Static assets
│   ├── fonts/
│   ├── icons/
│   └── images/
├── scripts/                        # Automation scripts
├── src/                            # SOURCE CODE CHÍNH (THE BRAIN)
│   ├── api/                        # Cấu hình API Client (Axios/Supabase)
│   │   ├── client.ts               # Setup Supabase client / Axios instance
│   │   └── endpoints.ts            # List API URLs
│   ├── components/                 # GLOBAL UI Components
│   │   ├── ui/                     # Base Components (Button, Input, Text...) - Atomic style
│   │   │   ├── Button.tsx
│   │   │   ├── Typography.tsx
│   │   │   └── ...
│   │   └── shared/                 # Components dùng chung nhiều nơi (Header, Loader)
│   ├── constants/                  # Biến hằng số toàn cục
│   │   ├── Colors.ts
│   │   ├── Config.ts               # Env vars, pagination limits
│   │   └── Strings.ts              # (Nếu chưa dùng i18n)
│   ├── core/                       # Logic cốt lõi không phụ thuộc business
│   │   ├── auth/                   # Authentication logic (Session handling)
│   │   ├── i18n/                   # Đa ngôn ngữ (Language setup)
│   │   └── theme/                  # Theme configuration
│   ├── features/                   # FEATURE MODULES (Quan trọng nhất!)
│   │   ├── auth/                   # Feature: Authentication
│   │   │   ├── components/         # LoginBox, RegisterForm
│   │   │   ├── hooks/              # useLogin, useResetPassword
│   │   │   └── auth.service.ts     # Gọi API Auth
│   │   ├── cart/                   # Feature: Giỏ hàng & Thanh toán
│   │   │   ├── components/         # CartItem, CheckoutSummary
│   │   │   ├── hooks/              # useCartCalculations
│   │   │   └── cart.store.ts       # Zustand/Redux slice cho Cart
│   │   ├── chat/                   # Feature: AI Chatbot
│   │   │   ├── components/         # ChatBubble, InputArea
│   │   │   └── chat.service.ts     # Logic gửi tin nhắn cho AI
│   │   ├── products/               # Feature: Sản phẩm
│   │   │   ├── components/         # ProductCard, FilterBar
│   │   │   └── products.service.ts
│   │   └── user/                   # Feature: Profile & Settings
│   ├── hooks/                      # Global Hooks (useDebounce, useAppState)
│   ├── lib/                        # 3rd party configurations (Stripe, Socket.io)
│   ├── store/                      # Global State Manager (nếu dùng Redux/Zustand global)
│   ├── types/                      # Global TypeScript definitions
│   │   ├── api.types.ts
│   │   └── navigation.types.ts
│   └── utils/                      # Helper functions
│       ├── currency.ts             # Format tiền tệ (VND, USD)
│       ├── date.ts                 # Format ngày tháng
│       └── validations.ts          # Validate form (Email, Password)
├── .env                            # Biến môi trường
├── babel.config.js
├── package.json
└── tsconfig.json
