import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { erroAmigavel } from '../lib/format'
import { telefone as mascaraTelefone, telefoneValido } from '../lib/mascaras'

/** Botão que pede confirmação antes de uma ação destrutiva */
export function Confirmar({ rotulo, pergunta, onConfirmar, link }) {
  const [aberto, setAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  if (!aberto) {
    return (
      <button className={link ? 'link-btn' : 'btn ghost peq'} type="button" onClick={() => setAberto(true)}>
        {rotulo}
      </button>
    )
  }
  return (
    <span className="confirmar">
      <span>{pergunta}</span>
      <button
        className="btn red peq"
        type="button"
        disabled={enviando}
        onClick={async () => {
          setEnviando(true)
          await onConfirmar()
          setEnviando(false)
          setAberto(false)
        }}
      >
        Confirmar
      </button>
      <button className="btn ghost peq" type="button" onClick={() => setAberto(false)}>Cancelar</button>
    </span>
  )
}

export function FormFrota({ onCriada, onCancelar }) {
  const [nome, setNome] = useState('')
  const [base, setBase] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setErro('')
    if (!nome.trim()) return setErro('Informe o nome da frota.')
    setEnviando(true)
    const { data, error } = await supabase.rpc('criar_frota', { p_nome: nome.trim(), p_base: base.trim() })
    setEnviando(false)
    if (error) return setErro(erroAmigavel(error))
    onCriada?.(data)
  }

  return (
    <form className="cartao-form vincular" onSubmit={enviar} noValidate>
      <h2 className="h-bloco">Criar frota</h2>
      <div className="grade-campos">
        <label htmlFor="frota-nome">Nome<input id="frota-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Frota Zona Sul" /></label>
        <label htmlFor="frota-base">Base de operação<input id="frota-base" value={base} onChange={(e) => setBase(e.target.value)} placeholder="Ex.: Heliponto Berrini" /></label>
      </div>
      {erro && <p className="aviso erro" role="alert">{erro}</p>}
      <div className="cabine-acoes">
        <button className="btn red" type="submit" disabled={enviando}>{enviando ? 'Criando…' : 'Criar frota'}</button>
        <button className="btn ghost" type="button" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  )
}

const gerarSenha = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const r = new Uint32Array(10)
  crypto.getRandomValues(r)
  return Array.from(r, (n) => c[n % c.length]).join('')
}

/**
 * Cadastra gerente ou piloto com login próprio.
 * Titular escolhe a frota; o gerente cadastra pilotos na própria frota.
 */
export function FormPessoa({ papel, titular, frotas, frotaInicial, frotaDoGerente, onCriada, onCancelar }) {
  const [f, setF] = useState({ nome: '', email: '', telefone: '', frota: frotaInicial ?? '', senha: gerarSenha() })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const nomePapel = papel === 'gerente' ? 'gerente' : 'piloto'

  const mudar = (e) => {
    const { name, value } = e.target
    setF({ ...f, [name]: name === 'telefone' ? mascaraTelefone(value) : value })
  }

  const enviar = async (e) => {
    e.preventDefault()
    setErro('')
    if (!f.nome.trim()) return setErro('Informe o nome.')
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErro('Informe um e-mail válido.')
    if (f.telefone && !telefoneValido(f.telefone)) return setErro('Telefone incompleto. Use DDD + número.')
    if (f.senha.length < 6) return setErro('A senha inicial precisa ter pelo menos 6 caracteres.')

    setEnviando(true)
    const { error } = await supabase.rpc('cadastrar_membro', {
      p_nome: f.nome.trim(),
      p_email: f.email.trim(),
      p_telefone: f.telefone,
      p_papel: nomePapel,
      p_frota: titular ? f.frota || null : null,
      p_senha: f.senha,
    })
    setEnviando(false)
    if (error) return setErro(erroAmigavel(error))
    onCriada(
      `${f.nome.trim()} foi cadastrado como ${nomePapel}. Acesso: ${f.email.trim().toLowerCase()} · senha ${f.senha}. ` +
        'Passe esses dados para a pessoa; ela pode trocar a senha na página Conta.',
    )
  }

  return (
    <form className="cartao-form vincular" onSubmit={enviar} noValidate>
      <h2 className="h-bloco">
        Cadastrar {nomePapel}
        {!titular && frotaDoGerente ? ` na ${frotaDoGerente.nome}` : ''}
      </h2>
      <div className="grade-campos">
        <label htmlFor="p-nome">Nome completo<input id="p-nome" name="nome" value={f.nome} onChange={mudar} autoComplete="off" /></label>
        <label htmlFor="p-email">E-mail<input id="p-email" name="email" type="email" value={f.email} onChange={mudar} autoComplete="off" /></label>
        <label htmlFor="p-telefone">Telefone<input id="p-telefone" name="telefone" type="tel" inputMode="tel" value={f.telefone} onChange={mudar} placeholder="(11) 91234-5678" maxLength={15} /></label>
        {titular && (
          <label htmlFor="p-frota">Frota
            <select id="p-frota" name="frota" value={f.frota} onChange={mudar}>
              <option value="">Sem frota (vê a conta toda)</option>
              {frotas.map((fr) => <option key={fr.id} value={fr.id}>{fr.nome}</option>)}
            </select>
          </label>
        )}
        <label className={titular ? 'largo' : ''} htmlFor="p-senha">Senha inicial
          <span className="campo-acao">
            <input id="p-senha" name="senha" value={f.senha} onChange={mudar} autoComplete="new-password" />
            <button className="btn ghost peq" type="button" onClick={() => setF({ ...f, senha: gerarSenha() })}>Gerar outra</button>
          </span>
        </label>
      </div>
      {erro && <p className="aviso erro" role="alert">{erro}</p>}
      <div className="cabine-acoes">
        <button className="btn red" type="submit" disabled={enviando}>{enviando ? 'Cadastrando…' : `Cadastrar ${nomePapel}`}</button>
        <button className="btn ghost" type="button" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  )
}
