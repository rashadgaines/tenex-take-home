import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Image optimization for external domains (Google profile images)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },

  // Ensure proper handling of server actions
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Webpack configuration for aliasing node-domexception
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias['node-domexception'] = path.resolve(__dirname, 'shims/node-domexception/index.js');
    }
    return config;
  },

  // Turbopack configuration for aliasing
  turbopack: {
    resolveAlias: {
      'node-domexception': './shims/node-domexception/index.js',
    },
  },
};

export default nextConfig;
