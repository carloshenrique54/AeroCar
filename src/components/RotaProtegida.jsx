import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RotaProtegida({ children }) {
  const { user, carregando } = useAuth()
  const location = useLocation()

  if (carregando) return <div className="band wrap carregando">Carregando…</div>
  if (!user) return <Navigate to="/entrar" replace state={{ de: location.pathname }} />
  return children
}
