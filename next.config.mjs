/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'pino'],
  eslint: {
    dirs: ['app', 'src'],
  },
};

export default nextConfig;
