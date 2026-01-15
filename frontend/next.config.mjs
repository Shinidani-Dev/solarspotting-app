/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: isDev
          ? 'http://localhost:8000/api/v1/:path*'
          : 'https://solarspotting-app-production.up.railway.app/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
