import './globals.css'
import { AuthProvider } from '@/lib/AuthContext'

export const metadata = {
  title: 'Fitness Tracker',
  description: 'AI-powered fitness tracking chatbot',
}

export default function RootLayout({ children }) {
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