/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'oracledb'],
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
