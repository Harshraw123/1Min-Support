// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   // Performance optimizations
//   compress: true,
//   poweredByHeader: false,
  
//   // Bundle optimization (SWC minification is enabled by default)
  
//   // Image optimization
//   images: {
//     formats: ['image/webp', 'image/avif'],
//     deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
//     imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
//   },
  
//   // Experimental optimizations
//   experimental: {
//     optimizeCss: true,
//     optimizePackageImports: ['lucide-react', '@phosphor-icons/react'],
//   },
  
//   // Compiler optimizations
//   compiler: {
//     removeConsole: process.env.NODE_ENV === 'production',
//   },
  
//   // Headers for caching
//   async headers() {
//     return [
//       {
//         source: '/_next/static/(.*)',
//         headers: [
//           {
//             key: 'Cache-Control',
//             value: 'public, max-age=31536000, immutable',
//           },
//         ],
//       },
//       {
//         source: '/images/(.*)',
//         headers: [
//           {
//             key: 'Cache-Control',
//             value: 'public, max-age=86400',
//           },
//         ],
//       },
//     ];
//   },
  
//   // Redirects for SEO
//   async redirects() {
//     return [];
//   },
// };

// export default nextConfig;
