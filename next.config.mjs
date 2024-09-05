/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/my-resume',
  images: {
    unoptimized: true
  }
};

export default nextConfig;
