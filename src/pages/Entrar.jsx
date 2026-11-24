import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { erroAmigavel } from '../lib/format'
import { supabase } from '../lib/supabase'

export default function Entrar() {
  const { user, entrar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destino = location.state?.de || '/painel'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [info, setInfo] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (user) return <Navigate to={destino} replace />

  const enviar = async (e) => {
    e.preventDefault()
    setErro('')
    setInfo('')
    setEnviando(true)
    const { error } = await entrar(email.trim(), senha)
    setEnviando(false)
    if (error) return setErro(erroAmigavel(error))
    navigate(destino, { replace: true })
  }

  const recuperar = async () => {
    setErro('')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErro('Digite seu e-mail acima para receber o link de redefinição.')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/painel/conta`,
    })
    if (error) return setErro(erroAmigavel(error))
    setInfo('Enviamos um link para redefinir sua senha. Confira seu e-mail.')
  }

  return (
    <section className="band auth">
      <form className="cartao-form auth-form" onSubmit={enviar} noValidate>
        <h1 className="auth-titulo">Entrar</h1>
        <p className="muted">Acesse o painel do seu AeroCar.</p>
        <label htmlFor="email">E-mail<input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
        <label htmlFor="senha">Senha<input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required /></label>
        <button className="btn red" type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        <button className="link-btn" type="button" onClick={recuperar}>Esqueci minha senha</button>
        {erro && <p className="aviso erro" role="alert">{erro}</p>}
        {info && <p className="aviso ok" role="status">{info}</p>}
        <p className="muted">Ainda não tem conta? <Link to="/cadastro" state={location.state}>Cadastre-se</Link></p>
      </form>
    </section>
  )
}
