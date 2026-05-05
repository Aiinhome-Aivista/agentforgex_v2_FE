import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext'
import AppRoutes from './AppRoutes'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function App() {
  const tree = (
    <AuthProvider>
      <BrowserRouter basename="/agentforcex">
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
  // Only mount the Google provider if a client ID exists, so the app still
  // boots cleanly in environments where Google sign-in isn't configured yet.
  return GOOGLE_CLIENT_ID
    ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{tree}</GoogleOAuthProvider>
    : tree
}