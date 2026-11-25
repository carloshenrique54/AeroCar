import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { dataHora, erroAmigavel, numero, STATUS_VEICULO, STATUS_VOO } from '../../lib/format'
import { comSinal, useAgora } from '../../lib/sinal'
import VincularVeiculo from '../../components/VincularVeiculo'

export default function Visao() {
  const { user, papel } = useAuth()
  const titular = papel === 'titular'
  const pessoal = papel === 'pessoal'
  const piloto = papel === 'piloto'
  const gestor = papel === 'titular' || papel === 'gerente'
  const agora = useAgora()
  const [params, setParams] = useSearchParams()
  const restrito = useLocation().state?.restrito
  const filtroFrota = params.get('frota') || ''
  const [busca, setBusca] = useState('')
  const [veiculos, setVeiculos] = useState([])
  const [frotas, setFrotas] = useState([])
  const [pilotos, setPilotos] = useState([])
  const [voos, setVoos] = useState([])
  const [alertas, setAlertas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [vinculando, setVinculando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

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
    const [{ data, error }, fr, pi] = await Promise.all([
      supabase.from('veiculos').select('*').order('matricula'),
      supabase.from('frotas').select('*').order('nome'),
      supabase.from('membros').select('user_id, frota_id, perfis(nome)').eq('papel', 'piloto').eq('ativo', true),
    ])
    if (error) setErro(erroAmigavel(error))
    setVeiculos(data ?? [])
    setFrotas(fr.data ?? [])
    setPilotos((pi.data ?? []).sort((a, b) => (a.perfis?.nome ?? '').localeCompare(b.perfis?.nome ?? '')))
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

  const mover = async (v, frotaId) => {
    setErro('')
    const { error } = await supabase.rpc('mover_veiculo', { p_veiculo: v.id, p_frota: frotaId || null })
    if (error) return setErro(erroAmigavel(error))
    setVeiculos((lista) => lista.map((x) => (x.id === v.id ? { ...x, frota_id: frotaId || null } : x)))
    const nome = frotas.find((f) => f.id === frotaId)?.nome
    setAviso(`${v.matricula} ${nome ? `agora está na ${nome}` : 'agora está sem frota'}.`)
  }

  const designar = async (v, pilotoId) => {
    setErro('')
    const { data, error } = await supabase.rpc('designar_piloto', { p_veiculo: v.id, p_piloto: pilotoId || null })
    if (error) return setErro(erroAmigavel(error))
    // Um veículo por piloto: o anterior dele fica livre
    setVeiculos((lista) =>
      lista.map((x) => (x.id === v.id ? { ...x, piloto_id: data.piloto_id } : pilotoId && x.piloto_id === pilotoId ? { ...x, piloto_id: null } : x)),
    )
    const nome = pilotos.find((p) => p.user_id === pilotoId)?.perfis?.nome
    setAviso(nome ? `${nome} agora é o piloto do ${v.matricula}.` : `${v.matricula} ficou sem piloto designado.`)
  }

  const marcarLido = async (id) => {
    await supabase.from('alertas').update({ lido: true }).eq('id', id)
    setAlertas((a) => a.filter((x) => x.id !== id))
  }

  const escolherFrota = (valor) => {
    const p = new URLSearchParams(params)
    if (valor) p.set('frota', valor)
    else p.delete('frota')
    setParams(p, { replace: true })
  }

  if (carregando) return <p className="carregando">Carregando…</p>

  if (!veiculos.length && !titular && !pessoal) {
    return (
      <div className="vazio">
        <h1 className="titulo-pag">{piloto ? 'Nenhum veículo designado para você' : 'Nenhum veículo na sua frota'}</h1>
        <p className="muted">
          {piloto
            ? 'Quando o gerente ou o titular designar um AeroCar para você, ele aparece aqui.'
            : 'Quando o titular da conta colocar veículos na sua frota, eles aparecem aqui.'}
        </p>
      </div>
    )
  }

  if (!veiculos.length) {
    return (
      <div className="vazio largo">
        <h1 className="titulo-pag">{titular ? 'Vincule os veículos da empresa' : 'Vincule o seu AeroCar'}</h1>
        <p className="muted">Para acompanhar a telemetria e registrar planos de voo, vincule o veículo à sua conta.</p>
        <VincularVeiculo frotas={titular ? frotas : undefined} onVinculado={carregar} />
      </div>
    )
  }

  const frotaAtual = frotas.find((f) => f.id === filtroFrota)
  const q = busca.trim().toLowerCase()
  const lista = veiculos.filter((v) => {
    if (filtroFrota === 'sem' && v.frota_id) return false
    if (filtroFrota && filtroFrota !== 'sem' && v.frota_id !== filtroFrota) return false
    return !q || `${v.matricula} ${v.apelido ?? ''}`.toLowerCase().includes(q)
  })
  const idsLista = new Set(lista.map((v) => v.id))
  const voosLista = voos.filter((v) => idsLista.has(v.veiculo_id))
  const online = lista.filter((v) => comSinal(v.ultimo_sinal, agora)).length
  const emVoo = lista.filter((v) => v.status === 'em_voo').length
  const nomeFrota = (id) => frotas.find((f) => f.id === id)?.nome

  const titulo = pessoal
    ? veiculos.length > 1 ? 'Meus veículos' : 'Meu AeroCar'
    : piloto ? 'Meu veículo'
    : frotaAtual ? `Veículos · ${frotaAtual.nome}` : filtroFrota === 'sem' ? 'Veículos sem frota' : 'Veículos'

  return (
    <>
      <div className="cab-pag">
        <div>
          <h1 className="titulo-pag">{titulo}</h1>
          {frotaAtual?.base && <p className="muted">Base: {frotaAtual.base}</p>}
        </div>
        <div className="cabine-acoes">
          {titular && (
            <button className="btn ghost" type="button" onClick={() => setVinculando((v) => !v)}>Vincular veículo</button>
          )}
          <Link className="btn red" to="/painel/voos/novo">Novo plano de voo</Link>
        </div>
      </div>

      {vinculando && (
        <VincularVeiculo
          frotas={titular ? frotas : undefined}
          frotaInicial={frotaAtual?.id ?? ''}
          onVinculado={() => {
            setVinculando(false)
            carregar()
          }}
          onCancelar={() => setVinculando(false)}
        />
      )}

      {gestor && (
        <div className="filtros">
          {frotas.length > 0 && (
            <label htmlFor="filtro-frota">Frota
              <select id="filtro-frota" value={filtroFrota} onChange={(e) => escolherFrota(e.target.value)}>
                <option value="">Todas as frotas</option>
                {frotas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                {titular && <option value="sem">Sem frota</option>}
              </select>
            </label>
          )}
          <label htmlFor="busca-veiculo">Buscar veículo
            <input id="busca-veiculo" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Matrícula ou apelido" />
          </label>
        </div>
      )}

      {gestor && (
        <div className="numeros">
          <div><b>{lista.length}</b><span>veículos{filtroFrota ? ' no filtro' : ''}</span></div>
          <div><b>{online}</b><span>com sinal agora</span></div>
          <div><b>{emVoo}</b><span>em voo</span></div>
        </div>
      )}

      {restrito && <p className="aviso erro" role="alert">Acesso restrito: essa página é só para o titular e os gerentes da conta.</p>}
      {erro && <p className="aviso erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso ok" role="status">{aviso}</p>}

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

      {voosLista.length > 0 && (
        <div className="bloco">
          <h2 className="h-bloco">Voos em andamento e planejados</h2>
          <ul className="lista">
            {voosLista.map((v) => (
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

      {lista.length ? (
        <div className="veiculos">
          {lista.map((v) => (
            <CartaoVeiculo
              key={v.id}
              v={v}
              online={comSinal(v.ultimo_sinal, agora)}
              frota={pessoal ? null : nomeFrota(v.frota_id) || 'Sem frota'}
              frotas={titular ? frotas : null}
              piloto={pilotos.find((p) => p.user_id === v.piloto_id)?.perfis?.nome}
              souPiloto={piloto}
              pilotosDisponiveis={gestor ? pilotos.filter((p) => !v.frota_id || p.frota_id === v.frota_id) : null}
              onDesignar={designar}
              podeRenomear={titular || pessoal}
              onRenomear={renomear}
              onMover={mover}
              voo={voos.find((x) => x.veiculo_id === v.id && x.status === 'em_voo')}
            />
          ))}
        </div>
      ) : (
        <p className="muted">Nenhum veículo {filtroFrota ? 'nesta frota' : 'encontrado'}.</p>
      )}
    </>
  )
}

function CartaoVeiculo({ v, voo, online, frota, frotas, piloto, souPiloto, pilotosDisponiveis, podeRenomear, onRenomear, onMover, onDesignar }) {
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
              {frota && !frotas && !souPiloto ? ` · ${frota}` : ''}
              {souPiloto ? ' · designado para você' : piloto && !pilotosDisponiveis ? ` · piloto ${piloto}` : ''}
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

      {frotas && (
        <label htmlFor={`frota-${v.id}`}>Frota
          <select id={`frota-${v.id}`} value={v.frota_id ?? ''} onChange={(e) => onMover(v, e.target.value)}>
            <option value="">Sem frota</option>
            {frotas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </label>
      )}

      {pilotosDisponiveis && (
        <label htmlFor={`piloto-${v.id}`}>Piloto designado
          <select id={`piloto-${v.id}`} value={v.piloto_id ?? ''} onChange={(e) => onDesignar(v, e.target.value)}>
            <option value="">Nenhum</option>
            {pilotosDisponiveis.map((p) => <option key={p.user_id} value={p.user_id}>{p.perfis?.nome}</option>)}
          </select>
        </label>
      )}

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
