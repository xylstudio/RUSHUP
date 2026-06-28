-- ==========================================
-- RUSHUPAPP - ENTERPRISE DATABASE SCHEMA
-- Target: Supabase (PostgreSQL)
-- ==========================================

-- 1. Enable UUID Extension (ถ้ายังไม่ได้เปิด)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- SECTION 1: CORE USERS & LOCATIONS
-- ==========================================

-- 1.1 ข้อมูลผู้ใช้งานหลัก (ผูกกับ auth.users ของ Supabase)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'rider', 'merchant', 'admin')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    phone VARCHAR(20) UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 1.2 ที่อยู่ของลูกค้า (สามารถบันทึกได้หลายที่ เช่น บ้าน, ที่ทำงาน)
CREATE TABLE public.user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(50), -- เช่น Home, Work
    address_detail TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    is_default BOOLEAN DEFAULT false
);

-- ==========================================
-- SECTION 2: STORE & CATALOG
-- ==========================================

-- 2.1 ข้อมูลร้านค้า
CREATE TABLE public.stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image TEXT,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    rating DECIMAL(3, 2) DEFAULT 0,
    is_open BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2.2 เวลาทำการของร้านค้า
CREATE TABLE public.store_operating_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    open_time TIME NOT NULL,
    close_time TIME NOT NULL
);

-- 2.3 หมวดหมู่สินค้า (รองรับหมวดหมู่หลัก และหมวดหมู่ย่อย)
CREATE TABLE public.product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.product_categories(id) ON DELETE CASCADE, -- ถ้าเป็น NULL คือหมวดหมู่หลัก
    name VARCHAR(100) NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- 2.4 สินค้า / เมนู
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.product_categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true
);

-- 2.5 ตัวเลือกเสริม (Options / Add-ons) เช่น ขนาด, ระดับความหวาน, ท็อปปิ้ง
CREATE TABLE public.product_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- เช่น "Size", "Topping"
    is_required BOOLEAN DEFAULT false,
    max_choices INTEGER DEFAULT 1
);

-- 2.6 ตัวเลือกย่อยสำหรับ Add-ons
CREATE TABLE public.product_option_choices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    option_id UUID NOT NULL REFERENCES public.product_options(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- เช่น "Large", "Boba"
    additional_price DECIMAL(10, 2) DEFAULT 0
);

-- ==========================================
-- SECTION 3: ORDERS & PROMOTIONS
-- ==========================================

-- 3.1 คูปองและโปรโมชั่น
CREATE TABLE public.promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id), -- ถ้าเป็น NULL คือคูปองของแอปเอง (ใช้ได้ทุกร้าน)
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_value DECIMAL(10, 2) DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE
);

-- 3.2 ออเดอร์
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    store_id UUID NOT NULL REFERENCES public.stores(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled')),
    
    -- ข้อมูลราคา
    subtotal DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- โปรโมชั่นที่ใช้
    promotion_id UUID REFERENCES public.promotions(id),
    
    -- สถานที่จัดส่ง
    delivery_address TEXT NOT NULL,
    delivery_lat DECIMAL(10, 8),
    delivery_lng DECIMAL(11, 8),
    customer_note TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3.3 รายการสินค้าในออเดอร์
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    note TEXT
);

-- 3.4 รายละเอียด Option ที่เลือกในออเดอร์
CREATE TABLE public.order_item_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    option_choice_id UUID NOT NULL REFERENCES public.product_option_choices(id),
    price DECIMAL(10, 2) DEFAULT 0
);

-- ==========================================
-- SECTION 4: LOGISTICS & RIDER
-- ==========================================

-- 4.1 ข้อมูลไรเดอร์ขั้นสูง (KYC & Vehicles)
CREATE TABLE public.rider_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(20) CHECK (vehicle_type IN ('motorcycle', 'car', 'bicycle')),
    license_plate VARCHAR(20) NOT NULL,
    driving_license_no VARCHAR(50),
    is_verified BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy'))
);

-- 4.2 พื้นที่ให้บริการ (Geofencing)
CREATE TABLE public.delivery_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    polygon_data JSONB NOT NULL,
    base_fee DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- 4.3 สถานะการจัดส่งของแต่ละออเดอร์
CREATE TABLE public.deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) UNIQUE,
    rider_id UUID REFERENCES public.profiles(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('searching_rider', 'assigned', 'on_way_to_store', 'at_store', 'on_way_to_customer', 'completed', 'cancelled')),
    
    -- เวลาทำงานของไรเดอร์
    assigned_at TIMESTAMP WITH TIME ZONE,
    arrived_at_store_at TIMESTAMP WITH TIME ZONE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- SECTION 5: PAYMENTS & FINANCES
-- ==========================================

-- 5.1 กระเป๋าเงินไรเดอร์ / ร้านค้า (Wallet)
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) UNIQUE,
    balance DECIMAL(10, 2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5.2 ประวัติการเงิน (Transaction History)
CREATE TABLE public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id),
    order_id UUID REFERENCES public.orders(id),
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('earning', 'withdrawal', 'refund')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5.3 บัญชีธนาคาร (สำหรับร้านค้าและไรเดอร์ถอนเงิน)
CREATE TABLE public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    is_primary BOOLEAN DEFAULT true
);

-- 5.4 การขอถอนเงิน (Withdrawal Requests)
CREATE TABLE public.payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    bank_account_id UUID REFERENCES public.bank_accounts(id),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    transaction_receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5.5 ใบเสร็จและใบกำกับภาษี (Invoices / Tax)
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) UNIQUE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    vat_amount DECIMAL(10, 2) DEFAULT 0,
    total_after_tax DECIMAL(10, 2) NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- SECTION 6: COMMUNICATION
-- ==========================================

-- 6.1 ห้องแชท (Order Chat)
CREATE TABLE public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6.2 ข้อความในแชท
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id),
    message TEXT,
    image_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6.3 Inbox / Push Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50), -- 'system', 'promo', 'order'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- SECTION 7: LOYALTY, ADS & REVIEWS
-- ==========================================

-- 7.1 ระบบ Subscription (เช่น RushUp Pro)
CREATE TABLE public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_name VARCHAR(100),
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- 7.2 คะแนนสะสม (Loyalty Points)
CREATE TABLE public.user_points (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0
);

-- 7.3 ร้านค้าซื้อโฆษณาแบนเนอร์
CREATE TABLE public.store_advertisements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id),
    ad_type VARCHAR(50) CHECK (ad_type IN ('banner', 'search_boost')),
    daily_budget DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
);

-- 7.4 รีวิวและให้คะแนน
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    store_id UUID NOT NULL REFERENCES public.stores(id),
    rider_id UUID REFERENCES public.profiles(id),
    store_rating INTEGER CHECK (store_rating BETWEEN 1 AND 5),
    store_comment TEXT,
    rider_rating INTEGER CHECK (rider_rating BETWEEN 1 AND 5),
    rider_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- SECTION 8: SUPPORT & HELPDESK
-- ==========================================

-- 8.1 แจ้งปัญหา (Support Tickets)
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    order_id UUID REFERENCES public.orders(id),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- END OF SCHEMA
-- ==========================================
