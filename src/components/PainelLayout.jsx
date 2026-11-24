import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PAPEIS = {
  pessoal: 'Conta pessoal',
  titular: 'Plano Executivo',
  gerente: 'Gerente',
  piloto: 'Piloto',
}

export default function PainelLayout() {
  const { perfil, conta, papel } = useAuth()
  const membro = papel === 'gerente' || papel === 'piloto'
  const gestor = papel === 'titular' || papel === 'gerente'
  const detalhe = [PAPEIS[papel], membro ? conta?.frota_nome : null, conta?.empresa].filter(Boolean).join(' · ')

  return (
    <div className="painel band">
      <div className="wrap painel-in">
        <aside className="painel-menu" aria-label="Painel">
          <p className="painel-ola">
            Olá, {perfil?.nome?.split(' ')[0] || 'piloto'}
            <small>{detalhe}</small>
          </p>
          {gestor && <NavLink to="/painel/frotas">{papel === 'gerente' ? 'Minha frota' : 'Frotas'}</NavLink>}
          <NavLink end to="/painel">{papel === 'pessoal' ? 'Meu AeroCar' : 'Veículos'}</NavLink>
          {gestor && <NavLink to="/painel/equipe">Equipe</NavLink>}
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
