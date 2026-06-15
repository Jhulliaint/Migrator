/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // L'application est purement locale : aucune dépendance externe au build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
