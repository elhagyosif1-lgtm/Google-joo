/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  headers: async () => [{
    source: '/:path*',
    headers: [
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Cache-Control', value: 'no-store' },
    ],
  }],
};
