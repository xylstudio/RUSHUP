import { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  subtext?: string;
  loading?: boolean;
}

export default function StatCard({ icon, value, label, subtext, loading = false }: StatCardProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100/50 p-6 flex flex-col gap-3 min-w-[180px] relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 hover:border-orange-200 group cursor-pointer">
      {/* Icon with orange gradient background */}
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-orange-600 transition-transform duration-300 group-hover:scale-110 shadow-sm shadow-orange-100">
        {icon}
      </div>
      
      {loading ? (
        // Skeleton loading state
        <div className="mt-2">
          <div className="h-8 bg-stone-200 rounded-lg animate-pulse mb-3 w-1/2"></div>
          <div className="h-4 bg-stone-100 rounded-md animate-pulse w-3/4"></div>
        </div>
      ) : (
        <div className="mt-1">
          <div className="text-3xl font-extrabold text-stone-900 transition-colors duration-300">{value}</div>
          <div className="text-[13px] text-stone-500 font-bold mt-1 transition-colors duration-300 group-hover:text-stone-700">{label}</div>
          {subtext && <div className="text-[11px] text-stone-400 mt-1.5 transition-colors duration-300 font-medium">{subtext}</div>}
        </div>
      )}
      
      {/* Subtle background pattern on hover */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-tl from-orange-500/5 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-2xl"></div>
    </div>
  );
} 