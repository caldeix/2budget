/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/2budget' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/2budget/' : '',
  // Los errores de tipos paran la build (antes se ignoraban y se colaban a producción).
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  }
};

export default nextConfig;