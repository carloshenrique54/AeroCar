import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { erroAmigavel } from '../lib/format'

export default function Cadastro() {
  const { user, cadastrar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destino = location.state?.de || '/painel'
  const [f, setF] = useState({ nome: '', email: '', senha: '', telefone: '' })
  const [erro, setErro] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  const [enviando, setEnviando] = useState(false)

  if (user) return <Navigate to={destino} replace />

  const mudar = (e) => setF({ ...f, [e.target.name]: e.target.value })

  const enviar = async (e) => {
    e.preventDefault()
    setErro('')
    if (!f.nome.trim()) return setErro('Informe seu nome.')
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErro('Informe um e-mail válido.')
    if (f.senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')

    setEnviando(true)
    const { data, error } = await cadastrar({
      email: f.email.trim(),
      senha: f.senha,
      nome: f.nome.trim(),
      telefone: f.telefone.trim(),
    })
    setEnviando(false)
    if (error) return setErro(erroAmigavel(error))
    if (data.session) navigate(destino, { replace: true })
    else setConfirmar(true)
  }

  if (confirmar) {
    return (
      <section className="band auth">
        <div className="cartao-form auth-form">
          <h1 className="auth-titulo">Confirme seu e-mail</h1>
          <p>Enviamos um link de confirmação para <b>{f.email}</b>. Depois de confirmar, entre na conta e vincule o seu AeroCar.</p>
          <Link className="btn red" to="/entrar" state={location.state}>Ir para o login</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="band auth">
      <form className="cartao-form auth-form" onSubmit={enviar} noValidate>
        <h1 className="auth-titulo">Criar conta</h1>
        <div className="plano">
          <b>Plano Executivo</b>
          <span>Incluso com o seu AeroCar, sem mensalidade. Depois do cadastro, vincule o veículo com a matrícula e o código de ativação.</span>
        </div>

        <label htmlFor="nome">Nome completo<input id="nome" name="nome" value={f.nome} onChange={mudar} autoComplete="name" required /></label>
        <label htmlFor="telefone">Telefone<input id="telefone" name="telefone" type="tel" value={f.telefone} onChange={mudar} autoComplete="tel" /></label>
        <label htmlFor="email">E-mail<input id="email" name="email" type="email" value={f.email} onChange={mudar} autoComplete="email" required /></label>
        <label htmlFor="senha">Senha<input id="senha" name="senha" type="password" value={f.senha} onChange={mudar} autoComplete="new-password" required /></label>

        <button className="btn red" type="submit" disabled={enviando}>{enviando ? 'Criando conta…' : 'Criar conta'}</button>
        {erro && <p className="aviso erro" role="alert">{erro}</p>}
        <p className="muted">Já tem conta? <Link to="/entrar" state={location.state}>Entrar</Link></p>
      </form>
    </section>
  )
}
