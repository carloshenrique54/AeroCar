import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { erroAmigavel } from '../../lib/format'
import { telefone, telefoneValido } from '../../lib/mascaras'

export default function Conta() {
  const { user, perfil, conta, papel, recarregarPerfil } = useAuth()
  const membro = papel === 'gerente' || papel === 'piloto'
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
    const { error } = await supabase.rpc('alterar_tipo_conta', { p_tipo: 'executivo' })
    setTrocando(false)
    if (error) return setMsgPlano({ tipo: 'erro', txt: erroAmigavel(error) })
    await recarregarPerfil()
    setMsgPlano({ tipo: 'ok', txt: 'Plano Executivo ativado. Agora você pode criar frotas, vincular vários veículos e cadastrar a equipe.' })
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
      {membro ? (
        <div className="plano">
          <b>{papel === 'gerente' ? 'Gerente' : 'Piloto'}{conta?.frota_nome ? ` da ${conta.frota_nome}` : ''}</b>
          <span>
            Você faz parte da conta Executiva {conta?.empresa ? `da ${conta.empresa}` : ''}{conta?.titular ? `, cujo titular é ${conta.titular}` : ''}.
            {papel === 'gerente'
              ? ' Você acompanha os veículos e todos os voos da sua frota.'
              : ' Você planeja e faz voos com o veículo designado para você.'}
          </span>
        </div>
      ) : executivo ? null : (
        <div className="plano">
          <b>Conta pessoal</b>
          <span>
            Acompanhe o seu AeroCar com telemetria em tempo real, alertas de segurança e histórico de voos.
            Com o plano Executivo, você acompanha vários veículos no mesmo painel.
          </span>
          <div className="cabine-acoes">
            <button className="btn red peq" type="button" onClick={trocarPlano} disabled={trocando}>Ativar plano Executivo</button>
          </div>
          {msgPlano.txt && <p className={`aviso ${msgPlano.tipo}`} role="status">{msgPlano.txt}</p>}
        </div>
      )}
      {executivo && msgPlano.tipo === 'ok' && <p className="aviso ok" role="status">{msgPlano.txt}</p>}
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
