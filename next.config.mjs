/** @type {import('next').NextConfig} */
const strapiHost = new URL(
  process.env.NEXT_PUBLIC_STRAPI_URL || 'https://cms.fxnstudio.com'
).hostname;

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  skipTrailingSlashRedirect: true,
  allowedDevOrigins: ['nxtsmarthomes.fxnstudio.com', 'nxtsmart.homes'],
  async redirects() {
    return [
      { source: "/contact-us", destination: "/contact", statusCode: 301 },
      // /about-us is a commonly guessed URL and returned a live 404. The long
      // WordPress slug below already redirected; the short form did not.
      { source: "/about-us", destination: "/about", statusCode: 301 },
      { source: "/about-us-find-the-top-smart-home-devices-expert-guides", destination: "/about", statusCode: 301 },
      { source: "/privacy-policy", destination: "/legal/privacy", statusCode: 301 },
      { source: "/terms-of-use", destination: "/legal/terms", statusCode: 301 },
      { source: "/category/how-to-guides", destination: "/how-to-guides", statusCode: 301 },
      { source: "/category/informative-articles", destination: "/informative-articles", statusCode: 301 },
      { source: "/category/product-comparisons", destination: "/product-comparisons", statusCode: 301 },
      { source: "/category/product-reviews", destination: "/product-reviews", statusCode: 301 },
      { source: "/category/smart-home-automation", destination: "/smart-home-automation", statusCode: 301 },
      { source: "/category/smart-home-devices", destination: "/smart-home-devices", statusCode: 301 },
      { source: "/category/smart-home-energy", destination: "/smart-home-energy", statusCode: 301 },
      { source: "/category/smart-home-entertainment", destination: "/smart-home-entertainment", statusCode: 301 },
      { source: "/category/smart-home-integration", destination: "/smart-home-integration", statusCode: 301 },
      { source: "/category/smart-home-security", destination: "/smart-home-security", statusCode: 301 },
      { source: "/category/top-rated", destination: "/top-rated", statusCode: 301 },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: strapiHost },
      { protocol: 'https', hostname: 'nxtsmart.homes' },
      { protocol: 'https', hostname: 'nxtsmart-homes.b-cdn.net' },
      { protocol: 'https', hostname: 'i0.wp.com' },
      { protocol: 'https', hostname: 'i1.wp.com' },
      { protocol: 'https', hostname: 'i2.wp.com' },
      { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
      { protocol: 'https', hostname: 'm.media-amazon.com' },
    ],
  },
};

export default nextConfig;
