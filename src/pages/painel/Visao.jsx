import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { dataHora, erroAmigavel, numero, STATUS_VEICULO, STATUS_VOO } from '../../lib/format'
import { comSinal, useAgora } from '../../lib/sinal'
import VincularVeiculo from '../../components/VincularVeiculo'

export default function Visao() {
  const { user, papel, conta } = useAuth()
  const titular = papel === 'titular'
  const pessoal = papel === 'pessoal'
  const agora = useAgora()
  const [veiculos, setVeiculos] = useState([])
  const [frotas, setFrotas] = useState([])
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
    const [{ data, error }, fr] = await Promise.all([
      supabase.from('veiculos').select('*').order('matricula'),
      supabase.from('frotas').select('*').order('nome'),
    ])
    if (error) setErro(erroAmigavel(error))
    setVeiculos(data ?? [])
    setFrotas(fr.data ?? [])
    await carregarVoos()
    setCarregando(false)
  }, [carregarVoos])

  useEffect(() => {
    carregar()
    const canal = supabase
      .channel(`painel-${user.id}`)
      // O veículo atualiza bateria e sinal a cada segundo: só troca aquele cartão.
      // Sem filtro: as regras de acesso do banco já entregam só o que cada papel pode ver.
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'veiculos' }, (p) =>
        setVeiculos((lista) => (lista.some((v) => v.id === p.new.id) ? lista.map((v) => (v.id === p.new.id ? { ...v, ...p.new } : v)) : lista)),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voos' }, carregarVoos)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alertas' }, carregarVoos)
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [carregar, carregarVoos, user.id])

  // Garantia: além do tempo real, confere bateria e sinal dos veículos a cada 3 s
  useEffect(() => {
    const timer = setInterval(async () => {
      const { data } = await supabase.from('veiculos').select('*').order('matricula')
      if (data) setVeiculos(data)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

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

  if (!veiculos.length && !titular && !pessoal) {
    return (
      <div className="vazio">
        <h1 className="titulo-pag">Nenhum veículo na sua frota</h1>
        <p className="muted">Quando o titular da conta colocar veículos na sua frota, eles aparecem aqui.</p>
      </div>
    )
  }

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
  const titulo = pessoal
    ? veiculos.length > 1 ? 'Meus veículos' : 'Meu AeroCar'
    : papel === 'titular' ? conta?.empresa || 'Frotas' : conta?.frota_nome || 'Veículos da frota'

  // Agrupa por frota (contas executivas); veículos sem frota ficam num grupo próprio
  const grupos = pessoal || !frotas.length
    ? [{ id: 'todos', nome: null, veiculos }]
    : [
        ...frotas.map((f) => ({ ...f, veiculos: veiculos.filter((v) => v.frota_id === f.id) })),
        { id: 'sem-frota', nome: 'Sem frota', veiculos: veiculos.filter((v) => !v.frota_id) },
      ].filter((g) => g.veiculos.length)
  const emVoo = veiculos.filter((v) => v.status === 'em_voo').length

  return (
    <>
      <div className="cab-pag">
        <h1 className="titulo-pag">{titulo}</h1>
        <div className="cabine-acoes">
          {titular && (
            <button className="btn ghost" type="button" onClick={() => setVinculando((v) => !v)}>Vincular outro veículo</button>
          )}
          <Link className="btn red" to="/painel/voos/novo">Novo plano de voo</Link>
        </div>
      </div>

      {vinculando && (
        <VincularVeiculo
          frotas={titular ? frotas : undefined}
          onVinculado={() => {
            setVinculando(false)
            carregar()
          }}
          onCancelar={() => setVinculando(false)}
        />
      )}

      {pessoal && (
        <p className="muted">Tem mais de um AeroCar? Com o <Link to="/painel/conta">plano Executivo</Link> você acompanha todos no mesmo painel.</p>
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
                  <small>{v.apelido || v.matricula}{!pessoal && v.piloto ? ` · ${v.piloto}` : ''} · até {v.altitude_max} m</small>
                </div>
                <span className={`selo ${v.status}`}>{STATUS_VOO[v.status]}</span>
                <Link className="btn ghost peq" to={`/painel/voos/${v.id}`}>{v.status === 'em_voo' ? 'Acompanhar' : 'Ir para a cabine'}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {grupos.map((g) => (
        <section key={g.id} className="grupo">
          {g.nome && (
            <div className="grupo-topo">
              <h2 className="h-bloco">{g.nome}</h2>
              {g.base && <span className="muted">Base: {g.base}</span>}
            </div>
          )}
          <div className="veiculos">
            {g.veiculos.map((v) => (
              <CartaoVeiculo
                key={v.id}
                v={v}
                online={comSinal(v.ultimo_sinal, agora)}
                podeRenomear={titular || pessoal}
                onRenomear={renomear}
                voo={voos.find((x) => x.veiculo_id === v.id && x.status === 'em_voo')}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

function CartaoVeiculo({ v, voo, online, podeRenomear, onRenomear }) {
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
            <small className="muted">
              Matrícula {v.matricula}
              {podeRenomear && <> · <button type="button" className="link-btn" onClick={() => setEditando(true)}>renomear</button></>}
            </small>
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
        ) : v.status === 'manutencao' ? (
          <span className="muted">Indisponível para voos durante a manutenção.</span>
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
