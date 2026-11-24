import { useSession } from './auth/useSession'
import AuthScreen from './screens/AuthScreen'
import Home from './screens/Home'

export default function App() {
  const { session, loading } = useSession()
  if (loading) return null
  return session ? <Home userId={session.user.id} /> : <AuthScreen />
}
