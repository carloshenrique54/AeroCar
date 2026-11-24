import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { erroAmigavel } from '../../lib/format'
import { Confirmar, FormPessoa } from '../../components/Gestao'

const PAPEL = { gerente: 'Gerente', piloto: 'Piloto' }

export default function Equipe() {
  const { conta, papel, perfil } = useAuth()
  const titular = papel === 'titular'
  const [params, setParams] = useSearchParams()
  const filtroFrota = params.get('frota') || ''
  const [filtroPapel, setFiltroPapel] = useState('')
  const [busca, setBusca] = useState('')
  const [frotas, setFrotas] = useState([])
  const [membros, setMembros] = useState([])
  const [veiculos, setVeiculos] = useState([])
  const [cadastrando, setCadastrando] = useState(null) // 'gerente' | 'piloto'
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    const [f, m, v] = await Promise.all([
      supabase.from('frotas').select('*').order('nome'),
      supabase.from('membros').select('*, perfis(nome, telefone)').eq('ativo', true),
      supabase.from('veiculos').select('id, matricula, apelido, frota_id, piloto_id').order('matricula'),
    ])
    setVeiculos(v.data ?? [])
    const e = f.error || m.error || v.error
    if (e) setErro(erroAmigavel(e))
    setFrotas(f.data ?? [])
    setMembros((m.data ?? []).sort((a, b) => (a.perfis?.nome ?? '').localeCompare(b.perfis?.nome ?? '')))
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const executar = async (rpc, args, sucesso) => {
    setErro('')
    setAviso('')
    const { error } = await supabase.rpc(rpc, args)
    if (error) {
      setErro(erroAmigavel(error))
      return false
    }
    setAviso(sucesso)
    await carregar()
    return true
  }

  const escolherFrota = (valor) => {
    const p = new URLSearchParams(params)
    if (valor) p.set('frota', valor)
    else p.delete('frota')
    setParams(p, { replace: true })
  }

  const abrir = (p) => {
    setAviso('')
    setErro('')
    setCadastrando((atual) => (atual === p ? null : p))
  }

  if (carregando) return <p className="carregando">Carregando…</p>

  const nomeFrota = (id) => frotas.find((f) => f.id === id)?.nome
  const frotaAtual = frotas.find((f) => f.id === filtroFrota)
  const q = busca.trim().toLowerCase()
  const lista = membros.filter((m) => {
    if (papel === 'gerente' && m.frota_id !== conta?.frota_id) return false
    if (filtroFrota === 'sem' && m.frota_id) return false
    if (filtroFrota && filtroFrota !== 'sem' && m.frota_id !== filtroFrota) return false
    if (filtroPapel && m.papel !== filtroPapel) return false
    return !q || (m.perfis?.nome ?? '').toLowerCase().includes(q)
  })
  const nomeTitular = titular ? perfil?.nome : conta?.titular

  return (
    <>
      <div className="cab-pag">
        <div>
          <h1 className="titulo-pag">Equipe{frotaAtual ? ` · ${frotaAtual.nome}` : ''}</h1>
          <p className="muted">{conta?.empresa}{nomeTitular ? ` · titular ${nomeTitular}` : ''}</p>
        </div>
        <div className="cabine-acoes">
          {titular && <button className="btn ghost" type="button" onClick={() => abrir('gerente')}>Cadastrar gerente</button>}
          <button className="btn red" type="button" onClick={() => abrir('piloto')}>Cadastrar piloto</button>
        </div>
      </div>

      {cadastrando && (
        <FormPessoa
          key={cadastrando}
          papel={cadastrando}
          titular={titular}
          frotas={frotas}
          veiculos={veiculos}
          frotaInicial={frotaAtual?.id ?? frotas[0]?.id ?? ''}
          frotaDoGerente={frotas.find((f) => f.id === conta?.frota_id)}
          onCancelar={() => setCadastrando(null)}
          onCriada={async (msg) => {
            setCadastrando(null)
            setErro('')
            setAviso(msg)
            await carregar()
          }}
        />
      )}

      {erro && <p className="aviso erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso ok" role="status">{aviso}</p>}

      <div className="filtros">
        {titular && frotas.length > 0 && (
          <label htmlFor="eq-frota">Frota
            <select id="eq-frota" value={filtroFrota} onChange={(e) => escolherFrota(e.target.value)}>
              <option value="">Todas as frotas</option>
              {frotas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              <option value="sem">Sem frota</option>
            </select>
          </label>
        )}
        <label htmlFor="eq-papel">Papel
          <select id="eq-papel" value={filtroPapel} onChange={(e) => setFiltroPapel(e.target.value)}>
            <option value="">Gerentes e pilotos</option>
            <option value="gerente">Só gerentes</option>
            <option value="piloto">Só pilotos</option>
          </select>
        </label>
        <label htmlFor="eq-busca">Buscar<input id="eq-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome" /></label>
      </div>

      {lista.length ? (
        <ul className="lista equipe">
          {lista.map((m) => (
            <LinhaPessoa
              key={m.user_id}
              m={m}
              frota={nomeFrota(m.frota_id)}
              veiculo={veiculos.find((v) => v.piloto_id === m.user_id)}
              frotas={frotas}
              editavel={titular}
              removivel={titular || (papel === 'gerente' && m.papel === 'piloto' && m.frota_id === conta?.frota_id)}
              executar={executar}
            />
          ))}
        </ul>
      ) : (
        <p className="muted">{membros.length ? 'Ninguém encontrado com esse filtro.' : 'Ninguém na equipe ainda. Cadastre o primeiro gerente ou piloto.'}</p>
      )}
    </>
  )
}

function LinhaPessoa({ m, frota, veiculo, frotas, editavel, removivel, executar }) {
  const [editando, setEditando] = useState(false)
  const [papel, setPapel] = useState(m.papel)
  const [frotaId, setFrotaId] = useState(m.frota_id ?? '')
  const nome = m.perfis?.nome || 'Sem nome'

  return (
    <li className={editando ? 'editando' : ''}>
      <div>
        <b>{nome}</b>
        <small>
          {frota || 'Sem frota'}
          {m.papel === 'piloto' ? ` · ${veiculo ? `veículo ${veiculo.apelido ? `${veiculo.apelido} (${veiculo.matricula})` : veiculo.matricula}` : 'sem veículo designado'}` : ''}
          {' · '}{m.perfis?.telefone || 'sem telefone'}
        </small>
      </div>
      <span className={`selo papel-${m.papel}`}>{PAPEL[m.papel]}</span>

      {editando ? (
        <div className="editar-pessoa">
          <label htmlFor={`papel-${m.user_id}`}>Papel
            <select id={`papel-${m.user_id}`} value={papel} onChange={(e) => setPapel(e.target.value)}>
              <option value="gerente">Gerente</option>
              <option value="piloto">Piloto</option>
            </select>
          </label>
          <label htmlFor={`frota-${m.user_id}`}>Frota
            <select id={`frota-${m.user_id}`} value={frotaId} onChange={(e) => setFrotaId(e.target.value)}>
              <option value="">Sem frota</option>
              {frotas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </label>
          <div className="cabine-acoes">
            <button
              className="btn red peq"
              type="button"
              onClick={async () => {
                const ok = await executar('atualizar_membro', { p_user: m.user_id, p_papel: papel, p_frota: frotaId || null }, `${nome} atualizado.`)
                if (ok) setEditando(false)
              }}
            >
              Salvar
            </button>
            <button className="btn ghost peq" type="button" onClick={() => setEditando(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        (editavel || removivel) && (
          <span className="pessoa-acoes">
            {editavel && <button className="link-btn" type="button" onClick={() => setEditando(true)}>Editar</button>}
            {removivel && (
              <Confirmar
                link
                rotulo="Remover"
                pergunta={`Remover ${nome.split(' ')[0]}? O acesso é bloqueado; o histórico de voos continua.`}
                onConfirmar={() => executar('remover_membro', { p_user: m.user_id }, `${nome} removido da equipe.`)}
              />
            )}
          </span>
        )
      )}
    </li>
  )
}
