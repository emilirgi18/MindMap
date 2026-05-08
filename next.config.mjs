/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  // three.js / react-force-graph-3d use browser globals — exclude from SSR.
  // The graph component is also lazy-loaded via next/dynamic with ssr:false,
  // but this stops webpack from even trying to bundle them on the server.
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        'three',
        'react-force-graph-3d',
      ]
    }
    return config
  },
}

export default nextConfig
