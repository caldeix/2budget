/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/2budget',
  assetPrefix: '/2budget/',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  }
};

export default nextConfig;