import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/providers/theme-provider';
import type { Metadata } from 'next';
import { Chakra_Petch, IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';

// Brand fonts, matching the website (website-2.0 src/lib/fonts.ts)
const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const chakraPetch = Chakra_Petch({
  variable: '--font-chakra-petch',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

const jersey = localFont({
  src: '../../public/fonts/Jersey25-Regular.ttf',
  variable: '--font-jersey',
  weight: '400',
});

export const metadata: Metadata = {
  title: {
    default: '3D Western',
    template: '%s | 3D Western',
  },
  description: "Western's official 3D printing club dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font variables go on <html> (as on the website) because Tailwind sets the default font there
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${chakraPetch.variable} ${ibmPlexMono.variable} ${jersey.variable}`}
    >
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster richColors />
      </body>
    </html>
  );
}
