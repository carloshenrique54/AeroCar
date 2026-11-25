import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RotaProtegida({ children, papeis }) {
  const { user, carregando, papel } = useAuth()
  const location = useLocation()

  if (carregando) return <div className="band wrap carregando">Carregando…</div>
  if (!user) return <Navigate to="/entrar" replace state={{ de: location.pathname }} />
  // Página restrita a alguns papéis (ex.: Frotas e Equipe só para titular e gerente)
  if (papeis && !papeis.includes(papel)) return <Navigate to="/painel" replace state={{ restrito: true }} />
  return children
}
