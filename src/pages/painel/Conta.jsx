import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { erroAmigavel } from '../../lib/format'
import { telefone, telefoneValido } from '../../lib/mascaras'

export default function Conta() {
  const { user, perfil, recarregarPerfil } = useAuth()
  const [f, setF] = useState({ nome: '', telefone: '' })
  const [msg, setMsg] = useState({ tipo: '', txt: '' })
  const [senha, setSenha] = useState('')
  const [msgSenha, setMsgSenha] = useState({ tipo: '', txt: '' })
  const [msgPlano, setMsgPlano] = useState({ tipo: '', txt: '' })
  const [trocando, setTrocando] = useState(false)
  const executivo = perfil?.tipo === 'executivo'

  const trocarPlano = async () => {
    setMsgPlano({ tipo: '', txt: '' })
    setTrocando(true)
    const { error } = await supabase.rpc('alterar_tipo_conta', { p_tipo: executivo ? 'pessoal' : 'executivo' })
    setTrocando(false)
    if (error) return setMsgPlano({ tipo: 'erro', txt: erroAmigavel(error) })
    await recarregarPerfil()
    setMsgPlano({ tipo: 'ok', txt: executivo ? 'Sua conta voltou a ser pessoal.' : 'Plano Executivo ativado. Agora você pode vincular vários veículos.' })
  }

  useEffect(() => {
    if (perfil) setF({ nome: perfil.nome ?? '', telefone: telefone(perfil.telefone) })
  }, [perfil])

  const mudar = (e) => {
    const { name, value } = e.target
    setF({ ...f, [name]: name === 'telefone' ? telefone(value) : value })
  }

  const salvar = async (e) => {
    e.preventDefault()
    if (!f.nome.trim()) return setMsg({ tipo: 'erro', txt: 'Informe seu nome.' })
    if (f.telefone && !telefoneValido(f.telefone)) return setMsg({ tipo: 'erro', txt: 'Telefone incompleto. Use DDD + número.' })
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
        <b>{executivo ? 'Plano Executivo' : 'Conta pessoal'}</b>
        <span>
          {executivo
            ? 'Vários veículos na mesma conta, com telemetria em tempo real, alertas de segurança e histórico de voos.'
            : 'Acompanhe o seu AeroCar com telemetria em tempo real, alertas de segurança e histórico de voos. Com o plano Executivo, você acompanha vários veículos no mesmo painel.'}
        </span>
        <div className="cabine-acoes">
          <button className={`btn ${executivo ? 'ghost' : 'red'} peq`} type="button" onClick={trocarPlano} disabled={trocando}>
            {executivo ? 'Voltar para conta pessoal' : 'Ativar plano Executivo'}
          </button>
        </div>
        {msgPlano.txt && <p className={`aviso ${msgPlano.tipo}`} role="status">{msgPlano.txt}</p>}
      </div>
      <div className="conta">
        <form className="compra-form" onSubmit={salvar} noValidate>
          <h2 className="h-bloco">Seus dados</h2>
          <p className="muted">{user.email}</p>
          <label htmlFor="nome">Nome<input id="nome" name="nome" value={f.nome} onChange={mudar} autoComplete="name" /></label>
          <label htmlFor="telefone">Telefone<input id="telefone" name="telefone" type="tel" inputMode="tel" value={f.telefone} onChange={mudar} autoComplete="tel" placeholder="(11) 91234-5678" maxLength={15} /></label>
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
