// app/layout.js
import './globals.css'   // <-- this is required for styles to load
import AuthWrapper from '@/components/AuthWrapper'
import { Toaster } from 'sonner'

export const metadata = {
  title: 'Basketball Courts POC',
  description: 'Find courts, RSVP, and check in to play',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthWrapper>
          {children}
        </AuthWrapper>
        <Toaster richColors />
      </body>
    </html>
  )
}
