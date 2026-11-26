import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { erroAmigavel } from '../../lib/format'
import { telefone, telefoneValido } from '../../lib/mascaras'
import { useNavigate } from 'react-router-dom'
import { ConfirmarExclusao } from '../../components/Gestao'

export default function Conta() {
  const { user, perfil, conta, papel, recarregarPerfil } = useAuth()
  const membro = papel === 'gerente' || papel === 'piloto'
  const [f, setF] = useState({ nome: '', telefone: '' })
  const [msg, setMsg] = useState({ tipo: '', txt: '' })
  const [senha, setSenha] = useState('')
  const [msgSenha, setMsgSenha] = useState({ tipo: '', txt: '' })
  const [excluindo, setExcluindo] = useState(false)
  const navigate = useNavigate()

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

  const excluirConta = async () => {
    const { error } = await supabase.rpc('excluir_minha_conta')
    if (error) return erroAmigavel(error)
    await supabase.auth.signOut().catch(() => {})
    navigate('/', { replace: true })
    return null
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
      ) : null}
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

      <section className="zona-perigo">
        <h2 className="h-bloco">Excluir conta</h2>
        {membro ? (
          <p className="muted">
            {papel === 'gerente'
              ? 'A conta de gerente só pode ser excluída pelo titular da conta Executiva que cadastrou você.'
              : 'A conta de piloto só pode ser excluída pelo titular da conta Executiva ou pelo gerente da sua frota.'}
          </p>
        ) : (
          <>
            <p className="muted">
              {papel === 'titular'
                ? 'Apaga sua conta Executiva, as frotas, as contas de gerentes e pilotos e todo o histórico de voos. Os veículos ficam livres para serem vinculados de novo.'
                : 'Apaga sua conta e todo o histórico de voos. O veículo fica livre para ser vinculado de novo.'}
            </p>
            <button className="btn ghost perigo" type="button" onClick={() => setExcluindo(true)}>Excluir minha conta</button>
          </>
        )}
      </section>

      {excluindo && (
        <ConfirmarExclusao
          titulo="Excluir minha conta"
          rotuloCampo="Para confirmar, digite o seu e-mail"
          esperado={user.email}
          botao="Excluir definitivamente"
          onCancelar={() => setExcluindo(false)}
          onConfirmar={excluirConta}
        >
          <p>Esta ação não pode ser desfeita. {papel === 'titular' ? 'Todas as contas da sua equipe também serão excluídas.' : ''}</p>
          <p className="muted">Conta: <b>{user.email}</b></p>
        </ConfirmarExclusao>
      )}
    </>
  )
}
