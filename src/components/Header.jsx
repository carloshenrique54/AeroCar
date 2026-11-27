import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

export default function Header() {
  const { user, sair } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const noSite = pathname === '/'

  const fechar = () => setAberto(false)

  return (
    <header className="topo">
      <div className="wrap topo-in">
        <Logo />
        <button
          className="menu-btn"
          type="button"
          aria-expanded={aberto}
          aria-controls="menu"
          onClick={() => setAberto((a) => !a)}
        >
          Menu
        </button>
        <nav id="menu" className={`links ${aberto ? 'aberto' : ''}`} aria-label="Principal">
          {noSite && (
            <>
              <a href="#problema" onClick={fechar}>O desafio</a>
              <a href="#solucao" onClick={fechar}>Solução</a>
              <a href="#plataforma" onClick={fechar}>Plataforma</a>
              <a href="#executivo" onClick={fechar}>Executivo</a>
              <a href="#missao" onClick={fechar}>Missão</a>
            </>
          )}
          {!noSite && <Link to="/" onClick={fechar}>Site</Link>}
          {user ? (
            <>
              <NavLink to="/painel" onClick={fechar}>Meu painel</NavLink>
              <button
                type="button"
                className="link-btn"
                onClick={async () => {
                  fechar()
                  await sair()
                  navigate('/')
                }}
              >
                Sair
              </button>
            </>
          ) : (
            <NavLink to="/entrar" onClick={fechar}>Entrar</NavLink>
          )}
          {!user && <Link className="btn red" to="/cadastro" onClick={fechar}>Criar conta</Link>}
        </nav>
      </div>
    </header>
  )
}
