import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // beforeFiles rewrites are checked before Next.js pages/API routes
      // We use afterFiles so Next.js API routes (like /api/auth/[...nextauth]) take priority
      afterFiles: [
        {
          source: '/api/v1/:path*',
          destination: `${BACKEND_URL}/api/v1/:path*`,
        },
        {
          source: '/api/users/:path*',
          destination: `${BACKEND_URL}/api/users/:path*`,
        },
        {
          // Only proxy /api/auth/sync and /api/auth/me — NOT /api/auth/[...nextauth]
          source: '/api/auth/sync',
          destination: `${BACKEND_URL}/api/auth/sync`,
        },
        {
          source: '/api/auth/me',
          destination: `${BACKEND_URL}/api/auth/me`,
        },
      ],
    };
  },
};

export default nextConfig;
