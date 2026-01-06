# Kế hoạch dự án

📅 Kế hoạch Phát triển Dự án: E-Shop Fashion & AI Chatbot
Thời gian: 2 Tháng (Tháng 1 & Tháng 2) - Mục tiêu: MVP (Sản phẩm khả dụng tối thiểu) hoàn chỉnh. Công nghệ: React Native (Expo), Supabase. Nền tảng: Mobile App (iOS/Android) & Web.

👥 Phân quyền (Roles) & Bảo mật (Supabase RLS)
User (Khách hàng): Xem hàng, đặt hàng, chat bot, xem lịch sử đơn.

Staff (Nhân viên): Xử lý đơn hàng, chat support (khi AI chuyển giao), xem kho cơ bản.

Admin (Quản lý): Quản lý user, nhập liệu sản phẩm, xem báo cáo doanh thu, cấu hình AI.

## Giai đoạn 1: Tháng 1 - Xây dựng Core E-Commerce (Nền tảng bán hàng)

Mục tiêu: Người dùng có thể Đăng nhập -> Xem hàng -> Bỏ giỏ -> Đặt hàng.

## Giai đoạn 2: Tháng 2 - Quản trị, Chat Realtime & AI Integration

Mục tiêu: Admin quản lý được hệ thống và Chatbot bắt đầu hoạt động.

## Giai đoạn 3: Tháng 3 (Hoặc cuối tháng 2 nếu nhanh) - Nâng cao

Triển khai sau

## Cấu trúc dự án

MY-ESHOP/
├── app/                       # 👈 QUAN TRỌNG: Nơi định nghĩa màn hình & điều hướng (Expo Router)
│   ├── (auth)/                # Nhóm màn hình xác thực (Login, Register)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── _layout.tsx
│   │
│   ├── (shop)/                # 🛍️ Giao diện KHÁCH HÀNG (App/Web User)
│   │   ├── (tabs)/            # Thanh điều hướng dưới đáy (Home, Cart, Profile)
│   │   │   ├── index.tsx      # Màn hình Home
│   │   │   ├── cart.tsx
│   │   │   ├── profile.tsx
│   │   │   └──_layout.tsx
│   │   ├── product/
│   │   │   └── [id].tsx       # Chi tiết sản phẩm (Dynamic Route)
│   │   └── checkout.tsx
│   │
│   ├── (admin)/               # 🛡️ Giao diện ADMIN & STAFF (Ưu tiên Web Dashboard)
│   │   ├── dashboard.tsx
│   │   ├── products/          # CRUD Sản phẩm
│   │   │   ├── index.tsx      # Danh sách
│   │   │   └── [id].tsx       # Sửa sản phẩm
│   │   ├── orders/            # Quản lý đơn hàng
│   │   └── _layout.tsx        # Layout riêng cho Admin (Sidebar bên trái)
│   │
│   ├──_layout.tsx            # Layout gốc (xử lý Auth Guard & Theme)
│   ├── index.tsx              # Màn hình chờ (Splash) để điều hướng theo Role
│   └── +not-found.tsx
│
├── src/                       # 🧠 LOGIC & TÀI NGUYÊN DÙNG CHUNG
│   ├── components/            # UI Components nhỏ lẻ
│   │   ├── common/            # Nút bấm, Input, Loading (Dùng chung cả Admin/Shop)
│   │   ├── shop/              # Card sản phẩm, Banner (Chỉ cho Shop)
│   │   └── admin/             # Bảng biểu, Stats Card (Chỉ cho Admin)
│   │
│   ├── constants/             # Màu sắc, Font chữ, Config
│   │   └── Colors.ts
│   │
│   ├── hooks/                 # Custom Hooks
│   │   ├── useAuth.ts         # Lấy thông tin user hiện tại
│   │   └── useCart.ts         # Logic giỏ hàng
│   │
│   ├── lib/                   # Cấu hình bên thứ 3
│   │   └── supabase.ts        # Supabase Client
│   │
│   ├── services/              # 📡 Gọi API Supabase (Tách biệt logic gọi DB ra khỏi UI)
│   │   ├── auth.service.ts
│   │   ├── product.service.ts
│   │   ├── order.service.ts
│   │   └── chat.service.ts
│   │
│   ├── types/                 # TypeScript Interfaces (Quan trọng!)
│   │   └── database.types.ts  # Type sinh ra từ Supabase
│   │
│   └── utils/                 # Hàm hỗ trợ (Format tiền, Format ngày)
│
├── assets/                    # Ảnh tĩnh, Font, Icon
├── package.json
└── tsconfig.jso
