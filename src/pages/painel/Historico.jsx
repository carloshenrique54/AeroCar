import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { dataHora, duracao, erroAmigavel, numero, STATUS_VOO } from '../../lib/format'

export default function Historico() {
  const { papel } = useAuth()
  const comPiloto = papel === 'titular' || papel === 'gerente'
  const [voos, setVoos] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase
      .from('voos_resumo')
      .select('*')
      .order('criado_em', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErro(erroAmigavel(error))
        setVoos(data ?? [])
        setCarregando(false)
      })
  }, [])

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

      {lista.length ? (
        <div className="scroll">
          <table className="tabela">
            <thead>
              <tr>
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
