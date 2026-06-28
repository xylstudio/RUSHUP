/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is stable in Next.js 13.4+, no need for experimental.appDir
  eslint: {
    // Ignore ESLint during builds for rapid iteration
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore type errors for rapid iteration
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Improve chunk loading stability
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    return config
  },
  swcMinify: true,
  // Prevent chunk loading errors
  productionBrowserSourceMaps: false,
  async rewrites() {
    return [
      {
        source: '/menu',
        destination: '/liff/menu',
      },
    ]
  },
}

module.exports = nextConfig
