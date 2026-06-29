import { motion } from 'framer-motion';

export function RUSHUPLogo({ size = 40, className = "", onClick }: { size?: number, className?: string, onClick?: () => void }) {
  return (
    <motion.div 
      className={`relative flex items-center justify-center ${onClick ? 'cursor-pointer' : ''} ${className}`} 
      style={{ width: size, height: size / 2 }}
      onClick={onClick}
      whileHover={{ scale: 1.1, filter: "brightness(1.1)" }}
      whileTap={{ scale: 0.9 }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <svg
        viewBox="0 0 64 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id="energetic-gradient" x1="4" y1="16" x2="60" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FB923C" /> {/* Peach */}
            <stop offset="100%" stopColor="#EF4444" /> {/* Coral */}
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Base Path (Soft Shadow/Glow) */}
        <path
          d="M32 16 C 32 16, 38 6, 48 6 C 56 6, 60 10, 60 16 C 60 22, 56 26, 48 26 C 38 26, 32 16, 32 16 C 32 16, 26 6, 16 6 C 8 6, 4 10, 4 16 C 4 22, 8 26, 16 26 C 26 26, 32 16, 32 16 Z"
          stroke="rgba(239, 68, 68, 0.15)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="blur-[1px]"
        />

        {/* Main Gradient Path */}
        <path
          d="M32 16 C 32 16, 38 6, 48 6 C 56 6, 60 10, 60 16 C 60 22, 56 26, 48 26 C 38 26, 32 16, 32 16 C 32 16, 26 6, 16 6 C 8 6, 4 10, 4 16 C 4 22, 8 26, 16 26 C 26 26, 32 16, 32 16 Z"
          stroke="url(#energetic-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
        />

        {/* Animated Beacon (White Dot) */}
        <motion.circle
          r="2"
          fill="#FFFFFF"
          initial={{ "offset-distance": "0%" }}
          animate={{ "offset-distance": "100%" }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            offsetPath: "path('M32 16 C 32 16, 38 6, 48 6 C 56 6, 60 10, 60 16 C 60 22, 56 26, 48 26 C 38 26, 32 16, 32 16 C 32 16, 26 6, 16 6 C 8 6, 4 10, 4 16 C 4 22, 8 26, 16 26 C 26 26, 32 16, 32 16 Z')",
            filter: "drop-shadow(0 0 2px rgba(255,255,255,0.8))"
          }}
        />
      </svg>
    </motion.div>
  );
}