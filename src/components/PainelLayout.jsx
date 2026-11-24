import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PainelLayout() {
  const { perfil } = useAuth()

  return (
    <div className="painel band">
      <div className="wrap painel-in">
        <aside className="painel-menu" aria-label="Painel">
          <p className="painel-ola">
            Olá, {perfil?.nome?.split(' ')[0] || 'piloto'}
            <small>Plano Executivo</small>
          </p>
          <NavLink end to="/painel">Meus veículos</NavLink>
          <NavLink to="/painel/voos/novo">Novo plano de voo</NavLink>
          <NavLink to="/painel/historico">Histórico de voos</NavLink>
          <NavLink to="/painel/conta">Conta</NavLink>
        </aside>
        <section className="painel-conteudo">
          <Outlet />
        </section>
      </div>
    </div>
  )
}
