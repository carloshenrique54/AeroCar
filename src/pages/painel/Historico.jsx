import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { dataHora, duracao, erroAmigavel, numero, STATUS_VOO } from '../../lib/format'
import { Dialogo } from '../../components/Gestao'

export default function Historico() {
  const { papel } = useAuth()
  const comPiloto = papel === 'titular' || papel === 'gerente'
  // Só o dono dos veículos (conta pessoal ou titular da Executiva) apaga o histórico.
  const podeApagar = papel === 'pessoal' || papel === 'titular'
  const [selecionados, setSelecionados] = useState(() => new Set())
  const [confirmando, setConfirmando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [voos, setVoos] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('voos_resumo').select('*').order('criado_em', { ascending: false })
    if (error) setErro(erroAmigavel(error))
    setVoos(data ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const veiculos = useMemo(() => {
    const m = new Map()
    voos.forEach((v) => m.set(v.veiculo_id, v.apelido || v.matricula))
    return [...m.entries()]
  }, [voos])

  const lista = voos.filter((v) => {
    if (filtro !== 'todos' && v.veiculo_id !== filtro) return false
    const q = busca.trim().toLowerCase()
    return !q || `${v.origem} ${v.destino} ${v.piloto ?? ''}`.toLowerCase().includes(q)
  })

  const apagaveis = lista.filter((v) => v.status !== 'em_voo')
  const marcados = apagaveis.filter((v) => selecionados.has(v.id))
  const todosMarcados = apagaveis.length > 0 && marcados.length === apagaveis.length

  const alternar = (id) =>
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })

  const alternarTodos = () => setSelecionados(todosMarcados ? new Set() : new Set(apagaveis.map((v) => v.id)))

  const apagar = async () => {
    const ids = marcados.map((v) => v.id)
    const { data, error } = await supabase.rpc('excluir_voos', { p_ids: ids })
    if (error) return erroAmigavel(error)
    setConfirmando(false)
    setSelecionados(new Set())
    setAviso(data === 1 ? '1 voo apagado do histórico.' : `${data} voos apagados do histórico.`)
    window.dispatchEvent(new Event('aerocar:alertas'))
    await carregar()
    return null
  }

  const concluidos = voos.filter((v) => v.status === 'concluido')
  const minutos = Math.round(
    concluidos.reduce((s, v) => s + (v.fim && v.inicio ? new Date(v.fim) - new Date(v.inicio) : 0), 0) / 60000,
  )

  if (carregando) return <p className="carregando">Carregando…</p>

  return (
    <>
      <div className="cab-pag">
        <h1 className="titulo-pag">Histórico de voos</h1>
        <Link className="btn red" to="/painel/voos/novo">Novo plano de voo</Link>
      </div>

      {erro && <p className="aviso erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso ok" role="status">{aviso}</p>}
      {confirmando && (
        <Dialogo
          titulo={marcados.length === 1 ? 'Apagar 1 voo do histórico?' : `Apagar ${marcados.length} voos do histórico?`}
          confirmar="Apagar"
          voltar="Cancelar"
          onVoltar={() => setConfirmando(false)}
          onConfirmar={apagar}
        >
          <p>As leituras dos sensores e os alertas desses voos também serão apagados. Essa ação não pode ser desfeita.</p>
        </Dialogo>
      )}

      <div className="numeros">
        <div><b>{concluidos.length}</b><span>voos concluídos</span></div>
        <div><b>{minutos} min</b><span>no ar no total</span></div>
        <div><b>{concluidos.filter((v) => v.pouso_emergencia).length}</b><span>pousos de emergência</span></div>
      </div>

      <div className="filtros">
        <label htmlFor="busca">Buscar trecho<input id="busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={comPiloto ? 'Origem, destino ou piloto' : 'Origem ou destino'} /></label>
        {veiculos.length > 1 && (
          <label htmlFor="filtro">Veículo
            <select id="filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="todos">Todos</option>
              {veiculos.map(([vid, nome]) => <option key={vid} value={vid}>{nome}</option>)}
            </select>
          </label>
        )}
      </div>

      {podeApagar && apagaveis.length > 0 && (
        <div className="barra-selecao">
          <span className="muted">{marcados.length ? `${marcados.length} selecionado${marcados.length > 1 ? 's' : ''}` : 'Selecione voos para apagar do histórico.'}</span>
          <button className="btn ghost perigo" type="button" disabled={!marcados.length} onClick={() => setConfirmando(true)}>Apagar selecionados</button>
        </div>
      )}

      {lista.length ? (
        <div className="scroll">
          <table className="tabela">
            <thead>
              <tr>
                {podeApagar && (
                  <th className="sel">
                    <input type="checkbox" aria-label="Selecionar todos os voos" checked={todosMarcados} onChange={alternarTodos} disabled={!apagaveis.length} />
                  </th>
                )}
                <th>Trecho</th>
                <th>Veículo</th>
                {comPiloto && <th>Piloto</th>}
                <th>Data</th>
                <th>Duração</th>
                <th className="num">Alt. máx.</th>
                <th className="num">Bateria final</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => (
                <tr key={v.id}>
                  {podeApagar && (
                    <td className="sel">
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${v.origem} a ${v.destino}`}
                        checked={selecionados.has(v.id)}
                        onChange={() => alternar(v.id)}
                        disabled={v.status === 'em_voo'}
                        title={v.status === 'em_voo' ? 'Voo em andamento: registre o pouso antes de apagar.' : undefined}
                      />
                    </td>
                  )}
                  <td><Link to={`/painel/voos/${v.id}`}>{v.origem} a {v.destino}</Link></td>
                  <td>{v.apelido || v.matricula}</td>
                  {comPiloto && <td>{v.piloto || '—'}</td>}
                  <td className="nowrap">{dataHora(v.inicio || v.criado_em)}</td>
                  <td className="nowrap">{v.status === 'concluido' ? duracao(v.inicio, v.fim) : '—'}</td>
                  <td className="num">{v.altitude_pico != null ? `${numero(v.altitude_pico)} m` : '—'}</td>
                  <td className="num">{v.bateria_final != null ? `${numero(v.bateria_final)}%` : '—'}</td>
                  <td>
                    <span className={`selo ${v.status}`}>{STATUS_VOO[v.status]}</span>
                    {v.pouso_emergencia && <span className="selo emergencia">Emergência</span>}
                    {v.total_alertas > 0 && <small className="muted"> {v.total_alertas} alerta{v.total_alertas > 1 ? 's' : ''}</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">{voos.length ? 'Nenhum voo encontrado com esse filtro.' : 'Seus voos aparecem aqui depois do primeiro plano de voo.'}</p>
      )}
    </>
  )
}
