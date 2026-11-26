import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { dataHora, erroAmigavel, numero } from '../../lib/format'
import { Dialogo } from '../../components/Gestao'

const TIPOS = {
  bateria_critica: 'Bateria crítica',
  altitude_excedida: 'Altitude acima do plano',
  inclinacao: 'Inclinação insegura',
}

const LIMITE_LEITURAS = 500

const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

// Avisa o menu do painel para recontar os alertas não lidos.
const avisarMenu = () => window.dispatchEvent(new Event('aerocar:alertas'))

export default function Alertas() {
  const { user, papel } = useAuth()
  const podeApagar = papel === 'pessoal' || papel === 'titular'
  const [params, setParams] = useSearchParams()
  const aba = params.get('aba') === 'leituras' ? 'leituras' : 'alertas'
  const [voos, setVoos] = useState([])
  const [alertas, setAlertas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const [vo, al] = await Promise.all([
      supabase.from('voos_resumo').select('*').order('criado_em', { ascending: false }),
      supabase.from('alertas').select('*').order('criado_em', { ascending: false }).limit(500),
    ])
    if (vo.error || al.error) setErro(erroAmigavel(vo.error || al.error))
    setVoos(vo.data ?? [])
    setAlertas(al.data ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
    const canal = supabase
      .channel(`alertas-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alertas' }, carregar)
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [carregar, user.id])

  const vooPorId = useMemo(() => new Map(voos.map((v) => [v.id, v])), [voos])

  const trocarAba = (nova) => {
    const p = new URLSearchParams(params)
    if (nova === 'leituras') p.set('aba', 'leituras')
    else p.delete('aba')
    setParams(p, { replace: true })
  }

  if (carregando) return <p className="carregando">Carregando…</p>

  const naoLidos = alertas.filter((a) => !a.lido).length

  return (
    <>
      <h1 className="titulo-pag">Alertas e leituras</h1>
      {erro && <p className="aviso erro" role="alert">{erro}</p>}

      <div className="abas" role="tablist" aria-label="Alertas e leituras">
        <button type="button" role="tab" aria-selected={aba === 'alertas'} className={aba === 'alertas' ? 'ativa' : ''} onClick={() => trocarAba('alertas')}>
          Alertas{naoLidos > 0 && <span className="contador">{naoLidos}</span>}
        </button>
        <button type="button" role="tab" aria-selected={aba === 'leituras'} className={aba === 'leituras' ? 'ativa' : ''} onClick={() => trocarAba('leituras')}>
          Leituras dos sensores
        </button>
      </div>

      {aba === 'alertas' ? (
        <ListaAlertas alertas={alertas} setAlertas={setAlertas} vooPorId={vooPorId} setErro={setErro} podeApagar={podeApagar} />
      ) : (
        <Leituras voos={voos} vooInicial={params.get('voo')} setErro={setErro} />
      )}
    </>
  )
}

function rotuloVeiculo(v) {
  return v ? v.apelido || v.matricula : '—'
}

function ListaAlertas({ alertas, setAlertas, vooPorId, setErro, podeApagar }) {
  const [selecionados, setSelecionados] = useState(() => new Set())
  const [confirmando, setConfirmando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [situacao, setSituacao] = useState('todos')
  const [tipo, setTipo] = useState('')
  const [veiculo, setVeiculo] = useState('')

  const veiculos = useMemo(() => {
    const m = new Map()
    alertas.forEach((a) => {
      const v = vooPorId.get(a.voo_id)
      if (v) m.set(v.veiculo_id, rotuloVeiculo(v))
    })
    return [...m.entries()]
  }, [alertas, vooPorId])

  const lista = alertas.filter((a) => {
    if (situacao === 'nao_lidos' && a.lido) return false
    if (tipo && a.tipo !== tipo) return false
    if (veiculo && vooPorId.get(a.voo_id)?.veiculo_id !== veiculo) return false
    return true
  })
  const pendentes = lista.filter((a) => !a.lido)
  const marcados = lista.filter((a) => selecionados.has(a.id))
  const todosMarcados = lista.length > 0 && marcados.length === lista.length

  const alternar = (id) =>
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })

  const apagar = async () => {
    const ids = marcados.map((a) => a.id)
    const { data, error } = await supabase.rpc('excluir_alertas', { p_ids: ids })
    if (error) return erroAmigavel(error)
    setAlertas((l) => l.filter((a) => !ids.includes(a.id)))
    setSelecionados(new Set())
    setConfirmando(false)
    setAviso(data === 1 ? '1 alerta apagado.' : `${data} alertas apagados.`)
    avisarMenu()
    return null
  }

  const marcarLidos = async (ids) => {
    if (!ids.length) return
    const { error } = await supabase.from('alertas').update({ lido: true }).in('id', ids)
    if (error) return setErro(erroAmigavel(error))
    setAlertas((l) => l.map((a) => (ids.includes(a.id) ? { ...a, lido: true } : a)))
    avisarMenu()
  }

  return (
    <>
      <div className="filtros">
        <label htmlFor="f-situacao">Situação
          <select id="f-situacao" value={situacao} onChange={(e) => setSituacao(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="nao_lidos">Não lidos</option>
          </select>
        </label>
        <label htmlFor="f-tipo">Tipo
          <select id="f-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(TIPOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
        </label>
        {veiculos.length > 1 && (
          <label htmlFor="f-veiculo">Veículo
            <select id="f-veiculo" value={veiculo} onChange={(e) => setVeiculo(e.target.value)}>
              <option value="">Todos</option>
              {veiculos.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </label>
        )}
      </div>

      {aviso && <p className="aviso ok" role="status">{aviso}</p>}
      {confirmando && (
        <Dialogo
          titulo={marcados.length === 1 ? 'Apagar 1 alerta?' : `Apagar ${marcados.length} alertas?`}
          confirmar="Apagar"
          voltar="Cancelar"
          onVoltar={() => setConfirmando(false)}
          onConfirmar={apagar}
        >
          <p>Os alertas saem do histórico. Os voos e as leituras dos sensores continuam. Essa ação não pode ser desfeita.</p>
        </Dialogo>
      )}

      {(pendentes.length > 1 || (podeApagar && lista.length > 0)) && (
        <div className="barra-selecao">
          {pendentes.length > 1 ? (
            <button className="link-btn" type="button" onClick={() => marcarLidos(pendentes.map((a) => a.id))}>Marcar {pendentes.length} como lidos</button>
          ) : <span />}
          {podeApagar && lista.length > 0 && (
            <button className="btn ghost perigo" type="button" disabled={!marcados.length} onClick={() => setConfirmando(true)}>
              {marcados.length ? `Apagar ${marcados.length} selecionado${marcados.length > 1 ? 's' : ''}` : 'Apagar selecionados'}
            </button>
          )}
        </div>
      )}

      {lista.length ? (
        <div className="scroll">
          <table className="tabela">
            <thead>
              <tr>
                {podeApagar && (
                  <th className="sel">
                    <input type="checkbox" aria-label="Selecionar todos os alertas" checked={todosMarcados} onChange={() => setSelecionados(todosMarcados ? new Set() : new Set(lista.map((a) => a.id)))} />
                  </th>
                )}
                <th>Data</th>
                <th>Alerta</th>
                <th>Voo</th>
                <th>Veículo</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => {
                const v = vooPorId.get(a.voo_id)
                return (
                  <tr key={a.id} className={a.lido ? 'lido' : 'nao-lido'}>
                    {podeApagar && (
                      <td className="sel">
                        <input type="checkbox" aria-label={`Selecionar alerta de ${dataHora(a.criado_em)}`} checked={selecionados.has(a.id)} onChange={() => alternar(a.id)} />
                      </td>
                    )}
                    <td className="nowrap">{dataHora(a.criado_em)}</td>
                    <td>
                      <span className={`selo alerta-${a.tipo}`}>{TIPOS[a.tipo] ?? a.tipo}</span>
                      <small className="alerta-msg">{a.mensagem}</small>
                    </td>
                    <td>{v ? <Link to={`/painel/voos/${v.id}`}>{v.origem} a {v.destino}</Link> : '—'}</td>
                    <td>{rotuloVeiculo(v)}</td>
                    <td className="nowrap">
                      {a.lido ? (
                        <span className="muted">Lido</span>
                      ) : (
                        <button className="link-btn" type="button" onClick={() => marcarLidos([a.id])}>Marcar como lido</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">{alertas.length ? 'Nenhum alerta com esse filtro.' : 'Nenhum alerta registrado. Eles aparecem aqui quando o veículo passa de algum limite durante o voo.'}</p>
      )}
    </>
  )
}

function Leituras({ voos, vooInicial, setErro }) {
  const voados = voos.filter((v) => v.status === 'em_voo' || v.status === 'concluido')
  const [vooId, setVooId] = useState(() => (voados.some((v) => v.id === vooInicial) ? vooInicial : voados[0]?.id ?? ''))
  const [leituras, setLeituras] = useState([])
  const [carregando, setCarregando] = useState(false)
  const voo = voados.find((v) => v.id === vooId)

  useEffect(() => {
    if (!vooId) return undefined
    let ativo = true
    setCarregando(true)
    supabase
      .from('telemetria')
      .select('id, altitude, inclinacao, bateria, registrado_em')
      .eq('voo_id', vooId)
      .order('registrado_em', { ascending: false })
      .limit(LIMITE_LEITURAS)
      .then(({ data, error }) => {
        if (!ativo) return
        if (error) setErro(erroAmigavel(error))
        setLeituras(data ?? [])
        setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [vooId, setErro])

  if (!voados.length) return <p className="muted">As leituras dos sensores aparecem aqui depois do primeiro voo.</p>

  const alts = leituras.map((l) => Number(l.altitude))
  const incs = leituras.map((l) => Math.abs(Number(l.inclinacao)))
  const bats = leituras.map((l) => Number(l.bateria))

  return (
    <>
      <div className="filtros">
        <label htmlFor="f-voo">Voo
          <select id="f-voo" value={vooId} onChange={(e) => setVooId(e.target.value)}>
            {voados.map((v) => (
              <option key={v.id} value={v.id}>
                {dataHora(v.inicio || v.criado_em)} · {v.origem} a {v.destino} · {rotuloVeiculo(v)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {carregando ? (
        <p className="carregando">Carregando leituras…</p>
      ) : leituras.length ? (
        <>
          <div className="numeros">
            <div><b>{leituras.length}{leituras.length === LIMITE_LEITURAS ? '+' : ''}</b><span>leituras</span></div>
            <div><b>{numero(Math.max(...alts))} m</b><span>altitude máxima{voo ? ` (plano: ${voo.altitude_max} m)` : ''}</span></div>
            <div><b>{numero(Math.max(...incs), 1)}°</b><span>maior inclinação</span></div>
            <div><b>{numero(Math.min(...bats))}%</b><span>menor bateria</span></div>
          </div>
          <div className="scroll">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Horário</th>
                  <th className="num">Altitude</th>
                  <th className="num">Inclinação</th>
                  <th className="num">Bateria</th>
                </tr>
              </thead>
              <tbody>
                {leituras.map((l) => {
                  const alt = Number(l.altitude)
                  const inc = Number(l.inclinacao)
                  const bat = Number(l.bateria)
                  return (
                    <tr key={l.id}>
                      <td className="nowrap">{hora(l.registrado_em)}</td>
                      <td className={`num ${voo && alt > voo.altitude_max ? 'fora' : ''}`}>{numero(alt, 1)} m</td>
                      <td className={`num ${Math.abs(inc) > 30 ? 'fora' : ''}`}>{numero(inc, 1)}°</td>
                      <td className={`num ${bat <= 20 ? 'fora' : ''}`}>{numero(bat)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {leituras.length === LIMITE_LEITURAS && <p className="muted">Mostrando as {LIMITE_LEITURAS} leituras mais recentes deste voo.</p>}
          <p className="muted">Valores em vermelho passaram do limite: altitude do plano, inclinação de 30° ou bateria de 20%.</p>
        </>
      ) : (
        <p className="muted">Este voo não tem leituras registradas.</p>
      )}
    </>
  )
}
