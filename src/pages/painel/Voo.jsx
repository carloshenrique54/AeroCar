import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Medidores from '../../components/Medidores'
import LineChart from '../../components/LineChart'
import { dataHora, duracao, erroAmigavel, numero, STATUS_VOO } from '../../lib/format'
import { comSinal, useAgora } from '../../lib/sinal'
import { Dialogo } from '../../components/Gestao'

export default function Voo() {
  const { id } = useParams()
  const { user, papel } = useAuth()
  const [piloto, setPiloto] = useState('')
  const navigate = useNavigate()
  const agora = useAgora(1000)
  const [voo, setVoo] = useState(null)
  const [veiculo, setVeiculo] = useState(null)
  const [leituras, setLeituras] = useState([])
  const [alertas, setAlertas] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const juntarLeitura = useCallback((nova) => {
    setLeituras((atual) => (atual.some((l) => l.id === nova.id) ? atual : [...atual, nova].sort((a, b) => a.id - b.id)))
  }, [])
  const ultimoId = useRef(0)

  const juntarAlerta = useCallback((novo) => {
    setAlertas((atual) => (atual.some((a) => a.id === novo.id) ? atual : [novo, ...atual]))
  }, [])

  // Carga inicial
  useEffect(() => {
    let ativo = true
    ;(async () => {
      const { data: v, error } = await supabase.from('voos').select('*, veiculos(*)').eq('id', id).maybeSingle()
      if (!ativo) return
      if (error || !v) {
        setErro(error ? erroAmigavel(error) : 'Voo não encontrado.')
        setCarregando(false)
        return
      }
      const [t, a, p] = await Promise.all([
        supabase.from('telemetria').select('*').eq('voo_id', id).order('registrado_em'),
        supabase.from('alertas').select('*').eq('voo_id', id).order('criado_em', { ascending: false }),
        supabase.from('perfis').select('nome').eq('id', v.user_id).maybeSingle(),
      ])
      if (!ativo) return
      const { veiculos, ...resto } = v
      setVoo(resto)
      setVeiculo(veiculos)
      setLeituras(t.data ?? [])
      setAlertas(a.data ?? [])
      setPiloto(p.data?.nome ?? '')
      setCarregando(false)
    })()
    return () => {
      ativo = false
    }
  }, [id])

  // Tempo real: leituras do veículo, alertas, status do voo e sinal do veículo
  const veiculoId = veiculo?.id
  useEffect(() => {
    if (!veiculoId) return
    const canal = supabase
      .channel(`voo-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telemetria', filter: `voo_id=eq.${id}` }, (p) => juntarLeitura(p.new))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alertas', filter: `voo_id=eq.${id}` }, (p) => juntarAlerta(p.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'voos', filter: `id=eq.${id}` }, (p) => setVoo((v) => ({ ...v, ...p.new })))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'veiculos', filter: `id=eq.${veiculoId}` }, (p) => setVeiculo((v) => ({ ...v, ...p.new })))
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [id, veiculoId, juntarLeitura, juntarAlerta])

  // Garantia: além do tempo real, confere o banco a cada 2 s enquanto o voo está ativo
  useEffect(() => {
    ultimoId.current = leituras.length ? leituras[leituras.length - 1].id : 0
  }, [leituras])

  const ativo = voo?.status === 'planejado' || voo?.status === 'em_voo'
  useEffect(() => {
    if (!ativo || !veiculoId) return
    let parado = false
    const conferir = async () => {
      const [t, ve, vo, a] = await Promise.all([
        supabase.from('telemetria').select('*').eq('voo_id', id).gt('id', ultimoId.current).order('id'),
        supabase.from('veiculos').select('*').eq('id', veiculoId).maybeSingle(),
        supabase.from('voos').select('*').eq('id', id).maybeSingle(),
        supabase.from('alertas').select('*').eq('voo_id', id).order('criado_em', { ascending: false }),
      ])
      if (parado) return
      ;(t.data ?? []).forEach(juntarLeitura)
      if (ve.data) setVeiculo((v) => ({ ...v, ...ve.data }))
      if (vo.data) setVoo((v) => ({ ...v, ...vo.data }))
      ;(a.data ?? []).forEach(juntarAlerta)
    }
    const timer = setInterval(conferir, 2000)
    return () => {
      parado = true
      clearInterval(timer)
    }
  }, [ativo, id, veiculoId, juntarLeitura, juntarAlerta])

  const decolar = async () => {
    setErro('')
    setEnviando(true)
    const { data, error } = await supabase.rpc('iniciar_voo', { p_voo: id })
    setEnviando(false)
    if (error) return setErro(erroAmigavel(error))
    setVoo(data)
  }

  const registrarPouso = async () => {
    setErro('')
    setEnviando(true)
    const { data, error } = await supabase.rpc('finalizar_voo', { p_voo: id, p_emergencia: false })
    setEnviando(false)
    if (error) return setErro(erroAmigavel(error))
    setVoo(data)
  }

  // Plano de voo que ainda não decolou: só sai da página cancelando o plano.
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const saindoCancelado = useRef(false)
  const planoAberto = voo?.status === 'planejado' && voo?.user_id === user.id
  const bloqueio = useBlocker(
    ({ currentLocation, nextLocation }) =>
      planoAberto && !saindoCancelado.current && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!planoAberto) return undefined
    const avisar = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [planoAberto])

  const cancelarPlano = async () => {
    const { error } = await supabase.from('voos').update({ status: 'cancelado' }).eq('id', id)
    if (error) return erroAmigavel(error)
    saindoCancelado.current = true
    return null
  }

  const cancelar = async () => {
    const msg = await cancelarPlano()
    if (msg) return msg
    navigate('/painel')
    return null
  }

  const sairCancelando = async () => {
    const msg = await cancelarPlano()
    if (msg) return msg
    bloqueio.proceed?.()
    return null
  }

  if (carregando) return <p className="carregando">Carregando…</p>
  if (!voo) return <div className="vazio"><p className="aviso erro">{erro}</p><Link to="/painel">Voltar ao painel</Link></div>

  const ultima = leituras[leituras.length - 1]
  const meuVoo = voo.user_id === user.id
  const gestor = papel === 'titular' || papel === 'gerente'
  const online = comSinal(veiculo?.ultimo_sinal, agora)
  const emVoo = voo.status === 'em_voo'
  const bateriaAtual = emVoo && ultima ? Number(ultima.bateria) : Number(veiculo?.bateria ?? 0)
  const critica = emVoo && bateriaAtual <= 20
  const alturaTopo = Math.max(voo.altitude_max * 1.15, ...leituras.map((l) => Number(l.altitude)))
  const leituraTela = emVoo && ultima ? ultima : { altitude: 0, inclinacao: 0, bateria: bateriaAtual }

  let estado = STATUS_VOO[voo.status]
  if (emVoo) estado = online ? 'Em voo' : 'Em voo · sem sinal'
  if (voo.status === 'planejado') estado = online ? 'Pronto para decolar' : 'Veículo sem sinal'

  return (
    <>
      {confirmarCancelar && (
        <Dialogo
          titulo="Cancelar plano de voo?"
          confirmar="Cancelar plano"
          voltar="Manter plano"
          onVoltar={() => setConfirmarCancelar(false)}
          onConfirmar={cancelar}
        >
          <p>O plano {voo.origem} a {voo.destino} fica no histórico como cancelado. Para voar, será preciso criar um novo plano.</p>
        </Dialogo>
      )}
      {bloqueio.state === 'blocked' && (
        <Dialogo
          titulo="Sair e cancelar o plano?"
          confirmar="Cancelar plano e sair"
          voltar="Ficar no plano"
          onVoltar={() => bloqueio.reset?.()}
          onConfirmar={sairCancelando}
        >
          <p>Este plano de voo ainda não decolou. Se você sair desta página, ele será cancelado e ficará no histórico como cancelado.</p>
        </Dialogo>
      )}
      <div className="cab-pag">
        <div>
          <h1 className="titulo-pag">{voo.origem} a {voo.destino}</h1>
          <p className="muted">
            {veiculo?.apelido || 'AeroCar'} · {veiculo?.matricula}{!meuVoo && piloto ? ` · piloto ${piloto}` : ''} · altitude máxima {voo.altitude_max} m
          </p>
        </div>
        <div className={`ao-vivo ${online && voo.status !== 'concluido' && voo.status !== 'cancelado' ? 'on' : ''}`}>
          <i />
          {estado}
        </div>
      </div>

      {erro && <p className="aviso erro" role="alert">{erro}</p>}

      <div className="cabine grande" aria-live="polite">
        <Medidores leitura={leituraTela} altitudeMax={voo.altitude_max} />

        {critica && (
          <div className="alerta show forte" role="alert">
            <div><b>Bateria crítica.</b> Pouso imediato recomendado no ponto seguro mais próximo.</div>
          </div>
        )}
        {emVoo && !online && (
          <div className="alerta show" role="status">
            <div><b>Sem sinal do veículo.</b> Última leitura em {dataHora(veiculo?.ultimo_sinal)}. Os dados voltam assim que a conexão for restabelecida.</div>
          </div>
        )}

        <LineChart
          titulo="Altitude"
          series={[{ nome: 'Altitude do veículo', cor: '#EFE4DC', valores: leituras.map((l) => Number(l.altitude)) }]}
          max={alturaTopo}
          unidade="m"
          limite={{ valor: voo.altitude_max, rotulo: `Altitude máxima do plano (${voo.altitude_max} m)` }}
          tempos={leituras.map((l) => l.registrado_em)}
          altura={180}
        />
        <LineChart
          titulo="Inclinação"
          series={[{ nome: 'Inclinação do veículo', cor: '#8fa3c9', valores: leituras.map((l) => Math.abs(Number(l.inclinacao))) }]}
          max={Math.max(40, ...leituras.map((l) => Math.abs(Number(l.inclinacao)) * 1.1))}
          unidade="°"
          limite={{ valor: 30, rotulo: 'Limite seguro (30°)' }}
          tempos={leituras.map((l) => l.registrado_em)}
          altura={130}
        />
        <LineChart
          titulo="Bateria"
          series={[{ nome: 'Carga da bateria', cor: '#DB0B15', valores: leituras.map((l) => Number(l.bateria)) }]}
          max={100}
          unidade="%"
          limite={{ valor: 20, rotulo: 'Nível crítico (20%)' }}
          tempos={leituras.map((l) => l.registrado_em)}
          altura={130}
        />

        <div className="cabine-acoes">
          {voo.status === 'planejado' && !meuVoo && (
            <span className="muted">Aguardando a decolagem{piloto ? ` de ${piloto}` : ''}.</span>
          )}
          {voo.status === 'planejado' && meuVoo && (
            <>
              <button className="btn red" type="button" onClick={decolar} disabled={enviando || !online}>Decolar</button>
              <button className="btn ghost" type="button" onClick={() => setConfirmarCancelar(true)}>Cancelar plano</button>
              <span className="muted">
                {online ? `Veículo conectado · bateria ${numero(veiculo?.bateria)}%` : 'Ligue o veículo para liberar a decolagem.'}
              </span>
            </>
          )}
          {emVoo && (
            <>
              {(meuVoo || gestor) && (
                <button className="btn ghost" type="button" onClick={registrarPouso} disabled={enviando}>Registrar pouso</button>
              )}
              <span className="muted">Tempo de voo: {duracao(voo.inicio)}</span>
            </>
          )}
          {voo.status === 'concluido' && (
            <>
              <Link className="btn red" to="/painel/voos/novo">Planejar outro voo</Link>
              <Link className="btn ghost" to="/painel/historico">Ver histórico</Link>
            </>
          )}
        </div>
      </div>

      {voo.status === 'concluido' && (
        <div className="numeros">
          <div><b>{duracao(voo.inicio, voo.fim)}</b><span>duração</span></div>
          <div><b>{numero(Math.max(0, ...leituras.map((l) => Number(l.altitude))))} m</b><span>altitude máxima atingida</span></div>
          <div><b>{ultima ? `${numero(ultima.bateria)}%` : '—'}</b><span>bateria no pouso</span></div>
          <div><b>{voo.pouso_emergencia ? 'Emergência' : 'Normal'}</b><span>tipo de pouso</span></div>
        </div>
      )}

      <div className="bloco">
        <h2 className="h-bloco">Alertas deste voo</h2>
        {alertas.length ? (
          <ul className="lista">
            {alertas.map((a) => (
              <li key={a.id}>
                <div><b>{a.mensagem}</b><small>{dataHora(a.criado_em)}</small></div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nenhum alerta registrado.</p>
        )}
      </div>
    </>
  )
}
