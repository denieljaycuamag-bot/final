import type { ReactNode } from 'react'
import './globals.css'
import { AuthProvider } from '@/lib/AuthContext'

export const metadata = {
  title: 'Fitness Tracker',
  description: 'AI-powered fitness tracking chatbot',
}

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}