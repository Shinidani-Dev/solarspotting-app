/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'https://solarspotting-app-production.up.railway.app/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
