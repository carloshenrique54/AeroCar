import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Medidores from '../../components/Medidores'
import LineChart from '../../components/LineChart'
import { dataHora, duracao, erroAmigavel, numero, STATUS_VOO } from '../../lib/format'
import { comSinal, useAgora } from '../../lib/sinal'

export default function Voo() {
  const { id } = useParams()
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
    setLeituras((atual) => (atual.some((l) => l.id === nova.id) ? atual : [...atual, nova]))
  }, [])

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
      const [t, a] = await Promise.all([
        supabase.from('telemetria').select('*').eq('voo_id', id).order('registrado_em'),
        supabase.from('alertas').select('*').eq('voo_id', id).order('criado_em', { ascending: false }),
      ])
      if (!ativo) return
      const { veiculos, ...resto } = v
      setVoo(resto)
      setVeiculo(veiculos)
      setLeituras(t.data ?? [])
      setAlertas(a.data ?? [])
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

  const cancelar = async () => {
    const { error } = await supabase.from('voos').update({ status: 'cancelado' }).eq('id', id)
    if (error) return setErro(erroAmigavel(error))
    navigate('/painel')
  }

  if (carregando) return <p className="carregando">Carregando…</p>
  if (!voo) return <div className="vazio"><p className="aviso erro">{erro}</p><Link to="/painel">Voltar ao painel</Link></div>

  const ultima = leituras[leituras.length - 1]
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
      <div className="cab-pag">
        <div>
          <h1 className="titulo-pag">{voo.origem} a {voo.destino}</h1>
          <p className="muted">
            {veiculo?.apelido || 'AeroCar'} · {veiculo?.matricula} · altitude máxima {voo.altitude_max} m
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
          series={[{ nome: 'Altitude (m)', cor: '#EFE4DC', valores: leituras.map((l) => Number(l.altitude)) }]}
          max={alturaTopo}
          limite={{ valor: voo.altitude_max, rotulo: 'limite do plano' }}
          altura={180}
          rotulo="Altitude ao longo do voo"
        />
        <LineChart
          series={[{ nome: 'Bateria (%)', cor: '#DB0B15', valores: leituras.map((l) => Number(l.bateria)) }]}
          max={100}
          limite={{ valor: 20, rotulo: 'nível crítico' }}
          altura={120}
          rotulo="Bateria ao longo do voo"
        />

        <div className="cabine-acoes">
          {voo.status === 'planejado' && (
            <>
              <button className="btn red" type="button" onClick={decolar} disabled={enviando || !online}>Decolar</button>
              <button className="btn ghost" type="button" onClick={cancelar}>Cancelar plano</button>
              <span className="muted">
                {online ? `Veículo conectado · bateria ${numero(veiculo?.bateria)}%` : 'Ligue o veículo para liberar a decolagem.'}
              </span>
            </>
          )}
          {emVoo && (
            <>
              <button className="btn ghost" type="button" onClick={registrarPouso} disabled={enviando}>Registrar pouso</button>
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
