/** @type {import('next').NextKey} */
const nextConfig = {
  output: 'standalone', // Enable standalone output for deployment
  typescript: {
    
    ignoreBuildErrors: true, // Ignore TypeScript build errors during production build
  },
};

export default nextConfig;