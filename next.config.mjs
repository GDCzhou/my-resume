/** @type {import('next').NextConfig} */


const deployNextConfig = {
  output: 'export',
  // GitHub Pages 部署在 /my-resume 子路径；Cloudflare Pages（构建时自动设置 CF_PAGES=1）等平台走根路径
  basePath: process.env.CF_PAGES ? undefined : '/my-resume',
  images: {
    unoptimized: true
  }
}

const devNextConfig = {

}

const nextConfig = process.env.NODE_ENV === 'production' ? deployNextConfig : devNextConfig

export default nextConfig;


