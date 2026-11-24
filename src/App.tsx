import { useSession } from './auth/useSession'
import AuthScreen from './screens/AuthScreen'
import ProfileScreen from './screens/ProfileScreen'

export default function App() {
  const { session, loading } = useSession()
  if (loading) return null
  return session ? <ProfileScreen userId={session.user.id} /> : <AuthScreen />
}
