import { Link } from 'react-router-dom'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="rodape band">
      <div className="wrap rodape-in">
        <div>
          <Logo />
          <p className="rodape-txt">
            Carro voador pessoal com telemetria em tempo real. Projeto nº 2 do Projeto Integrador Fábrica do Futuro.
          </p>
        </div>
        <div>
          <h3>Navegação</h3>
          <p>
            <Link to="/#problema">O desafio</Link><br />
            <Link to="/#solucao">Solução</Link><br />
            <Link to="/#plataforma">Plataforma</Link><br />
            <Link to="/cadastro">Criar conta</Link>
          </p>
        </div>
        <div>
          <h3>Contato</h3>
          <p>
            contato@aerocar.com.br<br />
            (11) 5555-0100<br />
            São Paulo, SP
          </p>
        </div>
        <div className="rodape-fim">
          <p>© 2026 AeroCar</p>
          <p>
            <Link to="/entrar">Área do proprietário</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
