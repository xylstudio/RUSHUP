interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({ 
  className = '', 
  width, 
  height, 
  rounded = 'md' 
}: SkeletonProps) {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`bg-gray-200 animate-pulse ${roundedClasses[rounded]} ${className}`}
      style={style}
    />
  );
}

// Predefined skeleton components
export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton width={40} height={40} rounded="lg" />
          <div className="flex-1">
            <Skeleton height={20} className="w-1/2 mb-2" />
            <Skeleton height={16} className="w-3/4" />
          </div>
        </div>
        <SkeletonText lines={3} />
        <div className="flex gap-2">
          <Skeleton height={32} className="w-20" />
          <Skeleton height={32} className="w-24" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonForm({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="space-y-2">
        <Skeleton height={16} className="w-24" />
        <Skeleton height={40} className="w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton height={16} className="w-32" />
        <Skeleton height={40} className="w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton height={16} className="w-28" />
        <Skeleton height={100} className="w-full" />
      </div>
      <div className="flex gap-4">
        <Skeleton height={44} className="flex-1" />
        <Skeleton height={44} className="flex-1" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="grid grid-cols-4 gap-4">
          <Skeleton height={16} className="w-20" />
          <Skeleton height={16} className="w-24" />
          <Skeleton height={16} className="w-16" />
          <Skeleton height={16} className="w-20" />
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4">
            <div className="grid grid-cols-4 gap-4">
              <Skeleton height={16} className="w-32" />
              <Skeleton height={16} className="w-40" />
              <Skeleton height={16} className="w-24" />
              <div className="flex gap-2">
                <Skeleton height={24} className="w-16" />
                <Skeleton height={24} className="w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 