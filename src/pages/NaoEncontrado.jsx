import { Link } from 'react-router-dom'

export default function NaoEncontrado() {
  return (
    <section className="band auth">
      <div className="cartao-form auth-form">
        <h1 className="auth-titulo">Página não encontrada</h1>
        <p className="muted">O endereço que você abriu não existe.</p>
        <Link className="btn red" to="/">Voltar ao início</Link>
      </div>
    </section>
  )
}
