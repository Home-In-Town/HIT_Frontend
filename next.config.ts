import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-daa9113fecb449cfb19044d3d822effd.r2.dev',
      },
    ],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const prodUrl = 'https://sales-website-backend-624770114041.asia-south1.run.app/api';
    const backendUrl = (apiUrl && apiUrl.startsWith('http')) 
      ? apiUrl 
      : (process.env.NODE_ENV === 'production' ? prodUrl : 'http://localhost:5001/api');

    return [
      {
        source: '/api/:path*',
        destination: backendUrl + '/:path*',
      },
    ];
  },
};

export default nextConfig;
