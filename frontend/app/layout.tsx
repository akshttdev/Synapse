import type { Metadata } from 'next'
import './globals.css'
import { Instrument_Serif, Inter, JetBrains_Mono } from 'next/font/google'
import SmoothScroll from '@/components/motion/SmoothScroll'
import BurstLayer from '@/components/BurstLayer'

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Synapse',
  description:
    'A 1024-Dimensional Embedding Space For Image, Audio, Video, And Text. Query With Anything, Retrieve Anything.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${inter.variable} ${mono.variable}`}>
      <body className="bg-[#f6f5f0] text-[#0a0a0c] antialiased">
        <SmoothScroll>{children}</SmoothScroll>
        <BurstLayer />
      </body>
    </html>
  )
}
