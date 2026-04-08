import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Papaya Social Club — USA',
  description: 'La comunidad #1 de latinas en TikTok Shop',
  manifest: '/manifest.json',
  icons: {
    icon: 'https://nptkinihgouicdimytbf.supabase.co/storage/v1/object/public/PSC%20LOGOS/Sun_pink.png',
    apple: 'https://nptkinihgouicdimytbf.supabase.co/storage/v1/object/public/PSC%20LOGOS/Sun_pink.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Papaya USA',
  },
  other: {
    'theme-color': '#F4A7C3',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-dm-sans antialiased bg-brand-light-pink min-h-screen">
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js');
              });
            }
          `
        }} />
      </body>
    </html>
  )
}
