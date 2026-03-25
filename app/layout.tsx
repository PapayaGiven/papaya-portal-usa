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
  title: 'Papaya Social Club',
  description: 'Private Members Portal for TikTok Creators in Germany',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-dm-sans antialiased bg-brand-light-pink min-h-screen">
        {children}
      </body>
    </html>
  )
}
