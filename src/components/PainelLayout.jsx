import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

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
  const { pathname } = useLocation()
  const [naoLidos, setNaoLidos] = useState(0)

  // Contador de alertas não lidos no menu: recarrega ao navegar, quando chega
  // um alerta novo e quando a página de alertas marca algum como lido.
  useEffect(() => {
    let ativo = true
    const contar = async () => {
      const { count } = await supabase.from('alertas').select('id', { count: 'exact', head: true }).eq('lido', false)
      if (ativo) setNaoLidos(count ?? 0)
    }
    contar()
    const canal = supabase
      .channel(`menu-alertas-${perfil?.id ?? 'eu'}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alertas' }, contar)
      .subscribe()
    window.addEventListener('aerocar:alertas', contar)
    return () => {
      ativo = false
      supabase.removeChannel(canal)
      window.removeEventListener('aerocar:alertas', contar)
    }
  }, [pathname, perfil?.id])

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
          <NavLink to="/painel/alertas">
            Alertas e leituras
            {naoLidos > 0 && <span className="contador" aria-label={`${naoLidos} não lidos`}>{naoLidos}</span>}
          </NavLink>
          <NavLink to="/painel/conta">Conta</NavLink>
        </aside>
        <section className="painel-conteudo">
          <Outlet />
        </section>
      </div>
    </div>
  )
}
