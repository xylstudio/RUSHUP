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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-2 min-w-[180px] relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-green-xylem/20 group cursor-pointer">
      {/* Accent top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-green-xylem transition-all duration-300 group-hover:h-1.5"></div>
      
      {/* Icon with green color */}
      <div className="mb-2 text-green-xylem transition-transform duration-300 group-hover:scale-110">{icon}</div>
      
      {loading ? (
        // Skeleton loading state
        <>
          <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse mb-1 w-3/4"></div>
          {subtext && <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>}
        </>
      ) : (
        <>
          <div className="text-3xl font-bold text-gray-900 transition-colors duration-300 group-hover:text-green-xylem">{value}</div>
          <div className="text-sm text-gray-500 font-medium uppercase tracking-wide transition-colors duration-300 group-hover:text-gray-700">{label}</div>
          {subtext && <div className="text-xs text-gray-400 mt-1 transition-colors duration-300 group-hover:text-gray-500">{subtext}</div>}
        </>
      )}
      
      {/* Subtle background pattern on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-xylem/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    </div>
  );
} 