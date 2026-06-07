import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'World Cup 2026 Prediction Pool',
    short_name: 'WC 2026 Pool',
    description: 'World Cup 2026 Prediction Pool',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0b1120',
    theme_color: '#2A398D',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
