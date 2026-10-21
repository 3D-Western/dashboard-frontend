import type { MetadataRoute } from 'next';

// Colours are the dashboard's default (dark) theme: --background in src/app/globals.css (.dark).
const BACKGROUND = '#0b0d10';

// Icons are the official badge (public/brand/mark-for-dark.svg) centred on that background, as
// PNG: 192 and 512 for "any", and a maskable 512 with extra padding so Android's circle/squircle
// crop never cuts the badge. The iPhone icon is src/app/apple-icon.png (Next links it for us).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/dashboard',
    name: '3D Western',
    short_name: '3D Western',
    description: "Western's 3D printing and makerspace dashboard",
    // Opens the dashboard; the sign-in pages live outside /dashboard, so the scope is the whole site
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: BACKGROUND,
    theme_color: BACKGROUND,
    categories: ['education', 'utilities'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
