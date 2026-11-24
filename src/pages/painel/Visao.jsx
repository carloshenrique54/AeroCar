import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { dataHora, erroAmigavel, numero, STATUS_VEICULO, STATUS_VOO } from '../../lib/format'
import { comSinal, useAgora } from '../../lib/sinal'
import VincularVeiculo from '../../components/VincularVeiculo'

export default function Visao() {
  const { user } = useAuth()
  const agora = useAgora()
  const [veiculos, setVeiculos] = useState([])
  const [voos, setVoos] = useState([])
  const [alertas, setAlertas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [vinculando, setVinculando] = useState(false)
  const [erro, setErro] = useState('')

  const carregarVoos = useCallback(async () => {
    const [vo, a] = await Promise.all([
      supabase.from('voos_resumo').select('*').in('status', ['planejado', 'em_voo']).order('criado_em', { ascending: false }),
      supabase.from('alertas').select('*, voos(origem, destino)').eq('lido', false).order('criado_em', { ascending: false }).limit(5),
    ])
    if (vo.error || a.error) setErro(erroAmigavel(vo.error || a.error))
    setVoos(vo.data ?? [])
    setAlertas(a.data ?? [])
  }, [])

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('veiculos').select('*').order('matricula')
    if (error) setErro(erroAmigavel(error))
    setVeiculos(data ?? [])
    await carregarVoos()
    setCarregando(false)
  }, [carregarVoos])

  useEffect(() => {
    carregar()
    const canal = supabase
      .channel(`painel-${user.id}`)
      // O veículo atualiza bateria e sinal a cada segundo: só troca aquele cartão
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'veiculos', filter: `user_id=eq.${user.id}` }, (p) =>
        setVeiculos((lista) => (lista.some((v) => v.id === p.new.id) ? lista.map((v) => (v.id === p.new.id ? { ...v, ...p.new } : v)) : lista)),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voos', filter: `user_id=eq.${user.id}` }, carregarVoos)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alertas', filter: `user_id=eq.${user.id}` }, carregarVoos)
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [carregar, carregarVoos, user.id])

  const renomear = async (id, apelido) => {
    const { error } = await supabase.from('veiculos').update({ apelido: apelido.trim() || null }).eq('id', id)
    if (error) return setErro(erroAmigavel(error))
    setVeiculos((lista) => lista.map((v) => (v.id === id ? { ...v, apelido: apelido.trim() || null } : v)))
  }

  const marcarLido = async (id) => {
    await supabase.from('alertas').update({ lido: true }).eq('id', id)
    setAlertas((a) => a.filter((x) => x.id !== id))
  }

  if (carregando) return <p className="carregando">Carregando…</p>

  if (!veiculos.length) {
    return (
      <div className="vazio largo">
        <h1 className="titulo-pag">Vincule o seu AeroCar</h1>
        <p className="muted">Para acompanhar a telemetria e registrar planos de voo, vincule o veículo à sua conta.</p>
        <VincularVeiculo onVinculado={carregar} />
      </div>
    )
  }

  const online = veiculos.filter((v) => comSinal(v.ultimo_sinal, agora)).length
  const emVoo = veiculos.filter((v) => v.status === 'em_voo').length

  return (
    <>
      <div className="cab-pag">
        <h1 className="titulo-pag">{veiculos.length > 1 ? 'Meus veículos' : 'Meu AeroCar'}</h1>
        <div className="cabine-acoes">
          <button className="btn ghost" type="button" onClick={() => setVinculando((v) => !v)}>Vincular outro veículo</button>
          <Link className="btn red" to="/painel/voos/novo">Novo plano de voo</Link>
        </div>
      </div>

      {vinculando && (
        <VincularVeiculo
          onVinculado={() => {
            setVinculando(false)
            carregar()
          }}
          onCancelar={() => setVinculando(false)}
        />
      )}

      {veiculos.length > 1 && (
        <div className="numeros">
          <div><b>{veiculos.length}</b><span>veículos na conta</span></div>
          <div><b>{online}</b><span>com sinal agora</span></div>
          <div><b>{emVoo}</b><span>em voo</span></div>
        </div>
      )}

      {erro && <p className="aviso erro" role="alert">{erro}</p>}

      {alertas.length > 0 && (
        <div className="alertas">
          {alertas.map((a) => (
            <div key={a.id} className="alerta show">
              <div>
                <b>{a.mensagem}</b>
                <small>{a.voos ? `${a.voos.origem} a ${a.voos.destino} · ` : ''}{dataHora(a.criado_em)}</small>
              </div>
              <div className="alerta-acoes">
                <Link to={`/painel/voos/${a.voo_id}`}>Ver voo</Link>
                <button type="button" className="link-btn" onClick={() => marcarLido(a.id)}>Dispensar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {voos.length > 0 && (
        <div className="bloco">
          <h2 className="h-bloco">Voos em andamento e planejados</h2>
          <ul className="lista">
            {voos.map((v) => (
              <li key={v.id}>
                <div>
                  <b>{v.origem} a {v.destino}</b>
                  <small>{v.apelido || v.matricula} · até {v.altitude_max} m</small>
                </div>
                <span className={`selo ${v.status}`}>{STATUS_VOO[v.status]}</span>
                <Link className="btn ghost peq" to={`/painel/voos/${v.id}`}>{v.status === 'em_voo' ? 'Acompanhar' : 'Ir para a cabine'}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="veiculos">
        {veiculos.map((v) => (
          <CartaoVeiculo
            key={v.id}
            v={v}
            online={comSinal(v.ultimo_sinal, agora)}
            onRenomear={renomear}
            voo={voos.find((x) => x.veiculo_id === v.id && x.status === 'em_voo')}
          />
        ))}
      </div>
    </>
  )
}

function CartaoVeiculo({ v, voo, online, onRenomear }) {
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(v.apelido ?? '')
  const [copiado, setCopiado] = useState(false)
  const bat = Number(v.bateria)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(v.token_dispositivo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* o usuário ainda pode selecionar o texto */
    }
  }

  return (
    <article className="veiculo">
      <div className="veiculo-topo">
        {editando ? (
          <form
            className="renomear"
            onSubmit={(e) => {
              e.preventDefault()
              onRenomear(v.id, nome)
              setEditando(false)
            }}
          >
            <label className="sr" htmlFor={`ap-${v.id}`}>Apelido</label>
            <input id={`ap-${v.id}`} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: AeroCar da família" />
            <button className="btn ghost peq" type="submit">Salvar</button>
          </form>
        ) : (
          <div>
            <h3>{v.apelido || 'AeroCar'}</h3>
            <small className="muted">Matrícula {v.matricula} · <button type="button" className="link-btn" onClick={() => setEditando(true)}>renomear</button></small>
          </div>
        )}
        <span className={`selo ${v.status}`}>{STATUS_VEICULO[v.status]}</span>
      </div>

      <div className={`ao-vivo ${online ? 'on' : ''}`}>
        <i />
        {online ? 'Conectado' : v.ultimo_sinal ? `Sem sinal desde ${dataHora(v.ultimo_sinal)}` : 'Aguardando a primeira conexão'}
      </div>

      <div className={`medidor ${bat <= 20 ? 'critico' : ''}`}>
        <span>Bateria</span>
        <b>{numero(bat)}%</b>
        <div className="barra"><i style={{ width: `${bat}%` }} /></div>
      </div>

      <div className="veiculo-acoes">
        {voo ? (
          <Link className="btn red peq" to={`/painel/voos/${voo.id}`}>Acompanhar voo</Link>
        ) : (
          <Link className="btn red peq" to={`/painel/voos/novo?veiculo=${v.id}`}>Planejar voo</Link>
        )}
      </div>

      <details className="dispositivo">
        <summary>Configuração do dispositivo</summary>
        <p className="muted">Token usado pelo computador de bordo para enviar a telemetria deste veículo.</p>
        <div className="token">
          <code>{v.token_dispositivo}</code>
          <button className="btn ghost peq" type="button" onClick={copiar}>{copiado ? 'Copiado' : 'Copiar'}</button>
        </div>
      </details>
    </article>
  )
}
