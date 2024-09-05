/** @type {import('next').NextConfig} */


const deployNextConfig = {
  output: 'export',
  basePath: '/my-resume',
  images: {
    unoptimized: true
  }
}

const devNextConfig = {
  
}

const nextConfig = process.env.NODE_ENV === 'production' ? deployNextConfig : devNextConfig

export default nextConfig;
