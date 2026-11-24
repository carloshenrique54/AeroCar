import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { erroAmigavel } from '../../lib/format'

export default function Conta() {
  const { user, perfil, recarregarPerfil } = useAuth()
  const [f, setF] = useState({ nome: '', telefone: '' })
  const [msg, setMsg] = useState({ tipo: '', txt: '' })
  const [senha, setSenha] = useState('')
  const [msgSenha, setMsgSenha] = useState({ tipo: '', txt: '' })

  useEffect(() => {
    if (perfil) setF({ nome: perfil.nome ?? '', telefone: perfil.telefone ?? '' })
  }, [perfil])

  const mudar = (e) => setF({ ...f, [e.target.name]: e.target.value })

  const salvar = async (e) => {
    e.preventDefault()
    if (!f.nome.trim()) return setMsg({ tipo: 'erro', txt: 'Informe seu nome.' })
    const { error } = await supabase
      .from('perfis')
      .update({ nome: f.nome.trim(), telefone: f.telefone.trim() || null })
      .eq('id', user.id)
    if (error) return setMsg({ tipo: 'erro', txt: erroAmigavel(error) })
    await recarregarPerfil()
    setMsg({ tipo: 'ok', txt: 'Dados atualizados.' })
  }

  const trocarSenha = async (e) => {
    e.preventDefault()
    if (senha.length < 6) return setMsgSenha({ tipo: 'erro', txt: 'A senha precisa ter pelo menos 6 caracteres.' })
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) return setMsgSenha({ tipo: 'erro', txt: erroAmigavel(error) })
    setSenha('')
    setMsgSenha({ tipo: 'ok', txt: 'Senha alterada.' })
  }

  return (
    <>
      <h1 className="titulo-pag">Conta</h1>
      <div className="plano">
        <b>Plano Executivo</b>
        <span>Incluso com o seu AeroCar: telemetria em tempo real, alertas de segurança, histórico de voos e vários veículos na mesma conta.</span>
      </div>
      <div className="conta">
        <form className="compra-form" onSubmit={salvar} noValidate>
          <h2 className="h-bloco">Seus dados</h2>
          <p className="muted">{user.email}</p>
          <label htmlFor="nome">Nome<input id="nome" name="nome" value={f.nome} onChange={mudar} autoComplete="name" /></label>
          <label htmlFor="telefone">Telefone<input id="telefone" name="telefone" type="tel" value={f.telefone} onChange={mudar} autoComplete="tel" /></label>
          <button className="btn red" type="submit">Salvar</button>
          {msg.txt && <p className={`aviso ${msg.tipo}`} role="status">{msg.txt}</p>}
        </form>

        <form className="compra-form" onSubmit={trocarSenha} noValidate>
          <h2 className="h-bloco">Senha</h2>
          <label htmlFor="nova-senha">Nova senha<input id="nova-senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" /></label>
          <button className="btn ghost" type="submit">Alterar senha</button>
          {msgSenha.txt && <p className={`aviso ${msgSenha.tipo}`} role="status">{msgSenha.txt}</p>}
        </form>
      </div>
    </>
  )
}
