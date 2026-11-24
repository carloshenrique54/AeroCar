import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { erroAmigavel, numero, STATUS_VEICULO } from '../../lib/format'
import { telefone as mascaraTelefone, telefoneValido } from '../../lib/mascaras'
import { comSinal, useAgora } from '../../lib/sinal'
import VincularVeiculo from '../../components/VincularVeiculo'

const PAPEL = { gerente: 'Gerente', piloto: 'Piloto' }

export default function Equipe() {
  const { conta, papel, perfil } = useAuth()
  const agora = useAgora()
  const titular = papel === 'titular'
  const gerente = papel === 'gerente'
  const [frotas, setFrotas] = useState([])
  const [membros, setMembros] = useState([])
  const [veiculos, setVeiculos] = useState([])
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [painel, setPainel] = useState(null) // 'frota' | 'pessoa' | 'veiculo'
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    const [f, m, v] = await Promise.all([
      supabase.from('frotas').select('*').order('nome'),
      supabase.from('membros').select('*, perfis(nome, telefone)').eq('ativo', true),
      supabase.from('veiculos').select('id, matricula, apelido, status, bateria, ultimo_sinal, frota_id').order('matricula'),
    ])
    const e = f.error || m.error || v.error
    if (e) setErro(erroAmigavel(e))
    setFrotas(f.data ?? [])
    setMembros((m.data ?? []).sort((a, b) => (a.perfis?.nome ?? '').localeCompare(b.perfis?.nome ?? '')))
    setVeiculos(v.data ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Executa uma ação no banco, mostra o erro ou a mensagem de sucesso e recarrega
  const executar = async (rpc, args, sucesso) => {
    setErro('')
    setAviso('')
    const { error } = await supabase.rpc(rpc, args)
    if (error) {
      setErro(erroAmigavel(error))
      return false
    }
    if (sucesso) setAviso(sucesso)
    await carregar()
    return true
  }

  const alternar = (p) => {
    setAviso('')
    setErro('')
    setPainel((atual) => (atual === p ? null : p))
  }

  if (carregando) return <p className="carregando">Carregando…</p>

  // Gerente e piloto veem a própria frota; o titular vê todas
  const visiveis = conta?.frota_id ? frotas.filter((f) => f.id === conta.frota_id) : frotas
  const nomeTitular = titular ? perfil?.nome : conta?.titular
  const semFrotaPessoas = membros.filter((m) => !m.frota_id)
  const semFrotaVeiculos = veiculos.filter((v) => !v.frota_id)

  const props = { titular, gerente, frotas, agora, executar, minhaFrota: conta?.frota_id }

  return (
    <>
      <div className="cab-pag">
        <div>
          <h1 className="titulo-pag">{papel === 'piloto' ? 'Minha frota' : 'Frotas e equipe'}</h1>
          <p className="muted">{conta?.empresa}{nomeTitular ? ` · titular ${nomeTitular}` : ''}</p>
        </div>
        {(titular || gerente) && (
          <div className="cabine-acoes">
            {titular && <button className="btn ghost" type="button" onClick={() => alternar('frota')}>Nova frota</button>}
            {titular && <button className="btn ghost" type="button" onClick={() => alternar('veiculo')}>Vincular veículo</button>}
            <button className="btn red" type="button" onClick={() => alternar('pessoa')}>
              {titular ? 'Adicionar pessoa' : 'Adicionar piloto'}
            </button>
          </div>
        )}
      </div>

      {erro && <p className="aviso erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso ok" role="status">{aviso}</p>}

      {painel === 'frota' && (
        <FormFrota
          onCancelar={() => setPainel(null)}
          onCriar={async (nome, base) => {
            const ok = await executar('criar_frota', { p_nome: nome, p_base: base }, `Frota ${nome} criada.`)
            if (ok) setPainel(null)
            return ok
          }}
        />
      )}

      {painel === 'veiculo' && (
        <VincularVeiculo
          frotas={frotas}
          onCancelar={() => setPainel(null)}
          onVinculado={async (v) => {
            setPainel(null)
            setAviso(`${v.matricula} vinculado à conta.`)
            await carregar()
          }}
        />
      )}

      {painel === 'pessoa' && (
        <FormPessoa
          titular={titular}
          frotas={frotas}
          frotaDoGerente={frotas.find((f) => f.id === conta?.frota_id)}
          onCancelar={() => setPainel(null)}
          onCriada={async (msg) => {
            setPainel(null)
            setErro('')
            setAviso(msg)
            await carregar()
          }}
        />
      )}

      {titular && (
        <div className="numeros">
          <div><b>{frotas.length}</b><span>frotas</span></div>
          <div><b>{veiculos.length}</b><span>veículos</span></div>
          <div><b>{membros.filter((m) => m.papel === 'gerente').length}</b><span>gerentes</span></div>
          <div><b>{membros.filter((m) => m.papel === 'piloto').length}</b><span>pilotos</span></div>
        </div>
      )}

      {!visiveis.length && (
        <p className="muted">{titular ? 'Nenhuma frota ainda. Crie a primeira em "Nova frota".' : 'Nenhuma frota definida para você.'}</p>
      )}

      {visiveis.map((f) => (
        <CartaoFrota
          key={f.id}
          frota={f}
          pessoas={membros.filter((m) => m.frota_id === f.id)}
          veiculos={veiculos.filter((v) => v.frota_id === f.id)}
          {...props}
        />
      ))}

      {titular && (semFrotaPessoas.length > 0 || semFrotaVeiculos.length > 0) && (
        <CartaoFrota frota={{ id: null, nome: 'Sem frota definida' }} pessoas={semFrotaPessoas} veiculos={semFrotaVeiculos} {...props} />
      )}
    </>
  )
}

function CartaoFrota({ frota, pessoas, veiculos, titular, gerente, frotas, agora, executar, minhaFrota }) {
  const gerentes = pessoas.filter((m) => m.papel === 'gerente')
  const pilotos = pessoas.filter((m) => m.papel === 'piloto')
  const podeRemoverPiloto = titular || (gerente && frota.id === minhaFrota)

  return (
    <article className="frota">
      <div className="grupo-topo">
        <div>
          <h2 className="h-bloco">{frota.nome}</h2>
          {frota.base && <span className="muted">Base: {frota.base}</span>}
        </div>
        {titular && frota.id && (
          <Confirmar
            rotulo="Excluir frota"
            pergunta="Excluir? Veículos e pessoas ficam sem frota."
            onConfirmar={() => executar('excluir_frota', { p_frota: frota.id }, `Frota ${frota.nome} excluída.`)}
          />
        )}
      </div>
      <div className="frota-cols">
        <div>
          <h3 className="rotulo">Gerente{gerentes.length > 1 ? 's' : ''}</h3>
          {gerentes.length ? (
            <ul className="pessoas">
              {gerentes.map((m) => (
                <LinhaPessoa key={m.user_id} m={m} editavel={titular} removivel={titular} frotas={frotas} executar={executar} />
              ))}
            </ul>
          ) : <p className="muted">Sem gerente</p>}
          <h3 className="rotulo">Pilotos</h3>
          {pilotos.length ? (
            <ul className="pessoas">
              {pilotos.map((m) => (
                <LinhaPessoa key={m.user_id} m={m} editavel={titular} removivel={podeRemoverPiloto} frotas={frotas} executar={executar} />
              ))}
            </ul>
          ) : <p className="muted">Nenhum piloto</p>}
        </div>
        <div>
          <h3 className="rotulo">Veículos</h3>
          {veiculos.length ? (
            <ul className="lista">
              {veiculos.map((v) => {
                const online = comSinal(v.ultimo_sinal, agora)
                return (
                  <li key={v.id}>
                    <div>
                      <b>{v.apelido || v.matricula}</b>
                      <small>{v.matricula} · bateria {numero(v.bateria)}%</small>
                    </div>
                    <span className={`ao-vivo ${online ? 'on' : ''}`}><i />{online ? 'Conectado' : 'Sem sinal'}</span>
                    <span className={`selo ${v.status}`}>{STATUS_VEICULO[v.status]}</span>
                    {titular && (
                      <label className="mover">
                        <span className="sr">Frota do {v.matricula}</span>
                        <select
                          value={v.frota_id ?? ''}
                          onChange={(e) =>
                            executar('mover_veiculo', { p_veiculo: v.id, p_frota: e.target.value || null }, `${v.matricula} atualizado.`)
                          }
                        >
                          <option value="">Sem frota</option>
                          {frotas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                        </select>
                      </label>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="muted">Nenhum veículo nesta frota.</p>
          )}
        </div>
      </div>
    </article>
  )
}

function LinhaPessoa({ m, editavel, removivel, frotas, executar }) {
  const [editando, setEditando] = useState(false)
  const [papel, setPapel] = useState(m.papel)
  const [frota, setFrota] = useState(m.frota_id ?? '')
  const nome = m.perfis?.nome || 'Sem nome'

  if (editando) {
    return (
      <li className="editando">
        <b>{nome}</b>
        <div className="grade-campos">
          <label htmlFor={`papel-${m.user_id}`}>Papel
            <select id={`papel-${m.user_id}`} value={papel} onChange={(e) => setPapel(e.target.value)}>
              <option value="gerente">Gerente</option>
              <option value="piloto">Piloto</option>
            </select>
          </label>
          <label htmlFor={`frota-${m.user_id}`}>Frota
            <select id={`frota-${m.user_id}`} value={frota} onChange={(e) => setFrota(e.target.value)}>
              <option value="">Sem frota</option>
              {frotas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </label>
        </div>
        <div className="cabine-acoes">
          <button
            className="btn red peq"
            type="button"
            onClick={async () => {
              const ok = await executar('atualizar_membro', { p_user: m.user_id, p_papel: papel, p_frota: frota || null }, `${nome} atualizado.`)
              if (ok) setEditando(false)
            }}
          >
            Salvar
          </button>
          <button className="btn ghost peq" type="button" onClick={() => setEditando(false)}>Cancelar</button>
        </div>
      </li>
    )
  }

  return (
    <li>
      <b>{nome}</b>
      <small>{PAPEL[m.papel]} · {m.perfis?.telefone || 'sem telefone'}</small>
      {(editavel || removivel) && (
        <span className="pessoa-acoes">
          {editavel && <button className="link-btn" type="button" onClick={() => setEditando(true)}>editar</button>}
          {removivel && (
            <Confirmar
              rotulo="remover"
              link
              pergunta={`Remover ${nome.split(' ')[0]}? O acesso é bloqueado; o histórico de voos continua.`}
              onConfirmar={() => executar('remover_membro', { p_user: m.user_id }, `${nome} removido da equipe.`)}
            />
          )}
        </span>
      )}
    </li>
  )
}

function Confirmar({ rotulo, pergunta, onConfirmar, link }) {
  const [aberto, setAberto] = useState(false)
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
      <button className="btn red peq" type="button" onClick={async () => { await onConfirmar(); setAberto(false) }}>Confirmar</button>
      <button className="btn ghost peq" type="button" onClick={() => setAberto(false)}>Cancelar</button>
    </span>
  )
}

function FormFrota({ onCriar, onCancelar }) {
  const [nome, setNome] = useState('')
  const [base, setBase] = useState('')
  const [enviando, setEnviando] = useState(false)

  return (
    <form
      className="cartao-form vincular"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault()
        if (!nome.trim()) return
        setEnviando(true)
        const ok = await onCriar(nome.trim(), base.trim())
        setEnviando(false)
        if (ok) {
          setNome('')
          setBase('')
        }
      }}
    >
      <h2 className="h-bloco">Nova frota</h2>
      <div className="grade-campos">
        <label htmlFor="frota-nome">Nome<input id="frota-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Frota Zona Sul" /></label>
        <label htmlFor="frota-base">Base de operação<input id="frota-base" value={base} onChange={(e) => setBase(e.target.value)} placeholder="Ex.: Heliponto Berrini" /></label>
      </div>
      <div className="cabine-acoes">
        <button className="btn red" type="submit" disabled={enviando || !nome.trim()}>{enviando ? 'Criando…' : 'Criar frota'}</button>
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

function FormPessoa({ titular, frotas, frotaDoGerente, onCriada, onCancelar }) {
  const [f, setF] = useState({ nome: '', email: '', telefone: '', papel: 'piloto', frota: frotas[0]?.id ?? '', senha: gerarSenha() })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

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
    const papel = titular ? f.papel : 'piloto'
    const { error } = await supabase.rpc('cadastrar_membro', {
      p_nome: f.nome.trim(),
      p_email: f.email.trim(),
      p_telefone: f.telefone,
      p_papel: papel,
      p_frota: titular ? f.frota || null : null,
      p_senha: f.senha,
    })
    setEnviando(false)
    if (error) return setErro(erroAmigavel(error))
    onCriada(
      `${f.nome.trim()} foi cadastrado como ${papel}. Acesso: ${f.email.trim().toLowerCase()} · senha ${f.senha}. ` +
        'Passe esses dados para a pessoa; ela pode trocar a senha na página Conta.',
    )
  }

  return (
    <form className="cartao-form vincular" onSubmit={enviar} noValidate>
      <h2 className="h-bloco">{titular ? 'Adicionar pessoa à equipe' : `Adicionar piloto${frotaDoGerente ? ` à ${frotaDoGerente.nome}` : ''}`}</h2>
      <div className="grade-campos">
        <label htmlFor="p-nome">Nome completo<input id="p-nome" name="nome" value={f.nome} onChange={mudar} autoComplete="off" /></label>
        <label htmlFor="p-email">E-mail<input id="p-email" name="email" type="email" value={f.email} onChange={mudar} autoComplete="off" /></label>
        <label htmlFor="p-telefone">Telefone<input id="p-telefone" name="telefone" type="tel" inputMode="tel" value={f.telefone} onChange={mudar} placeholder="(11) 91234-5678" maxLength={15} /></label>
        <label htmlFor="p-senha">Senha inicial
          <span className="campo-acao">
            <input id="p-senha" name="senha" value={f.senha} onChange={mudar} autoComplete="new-password" />
            <button className="btn ghost peq" type="button" onClick={() => setF({ ...f, senha: gerarSenha() })}>Gerar</button>
          </span>
        </label>
        {titular && (
          <>
            <label htmlFor="p-papel">Papel
              <select id="p-papel" name="papel" value={f.papel} onChange={mudar}>
                <option value="piloto">Piloto</option>
                <option value="gerente">Gerente</option>
              </select>
            </label>
            <label htmlFor="p-frota">Frota
              <select id="p-frota" name="frota" value={f.frota} onChange={mudar}>
                <option value="">Sem frota (vê a conta toda)</option>
                {frotas.map((fr) => <option key={fr.id} value={fr.id}>{fr.nome}</option>)}
              </select>
            </label>
          </>
        )}
      </div>
      {erro && <p className="aviso erro" role="alert">{erro}</p>}
      <div className="cabine-acoes">
        <button className="btn red" type="submit" disabled={enviando}>{enviando ? 'Cadastrando…' : 'Cadastrar'}</button>
        <button className="btn ghost" type="button" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  )
}
