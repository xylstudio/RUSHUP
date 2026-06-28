'use client';

import React from 'react';
import XYLLoader from '@/components/loaders/XYLLoader';

// Shimmer base —ใช้สำหรับ Placeholder รูปทรง
const shimmerClass =
  'relative overflow-hidden bg-gray-100 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent';

// Skeleton กล่อง Banner
export const BannerSkeleton = () => (
  <div className="px-0">
    <div className={`w-full h-40 ${shimmerClass}`} />
  </div>
);

// Skeleton แถบ Category
export const CategorySkeleton = () => (
  <div className="flex gap-3 px-4 py-4 overflow-hidden">
    {[...Array(5)].map((_, i) => (
      <div key={i} className={`flex-shrink-0 h-8 w-20 rounded-none ${shimmerClass}`} />
    ))}
  </div>
);

// Skeleton Grid รายการเมนู
export const MenuRowSkeleton = () => (
  <div className="px-4 space-y-3">
    <div className={`h-4 w-32 rounded-none mb-4 ${shimmerClass}`} />
    <div className="grid grid-cols-2 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className={`w-full aspect-square rounded-none ${shimmerClass}`} />
          <div className={`h-3 w-3/4 rounded-none ${shimmerClass}`} />
          <div className={`h-3 w-1/2 rounded-none ${shimmerClass}`} />
        </div>
      ))}
    </div>
  </div>
);

// Skeleton หน้าประวัติการสั่งซื้อ — ใช้ XYLLoader mini
export const HistoryListSkeleton = () => (
    <div className="flex justify-center p-20">
      <XYLLoader mini />
    </div>
);

// Skeleton Card ออเดอร์ทั่วไป
export const OrderCardSkeleton = () => (
  <div className="mx-4 my-3 p-4 border border-gray-100 space-y-3">
    <div className={`h-3 w-1/3 rounded-none ${shimmerClass}`} />
    <div className={`h-3 w-2/3 rounded-none ${shimmerClass}`} />
    <div className={`h-3 w-1/4 rounded-none ${shimmerClass}`} />
  </div>
);

// Full Skeleton หน้า Menu (ใช้กับ route-level fallback เท่านั้น)
export const LiffMenuSkeleton = () => (
  <div className="min-h-screen bg-[#fcfcf9] pt-[60px]">
    <BannerSkeleton />
    <CategorySkeleton />
    <div className="mt-2">
      <MenuRowSkeleton />
    </div>
    <style jsx global>{`
      @keyframes shimmer {
        100% {
          transform: translateX(100%);
        }
      }
    `}</style>
  </div>
);
