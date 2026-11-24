import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { erroAmigavel, numero } from '../../lib/format'

export default function NovoVoo() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [veiculos, setVeiculos] = useState([])
  const [f, setF] = useState({ veiculo_id: params.get('veiculo') || '', origem: '', destino: '', altitude_max: 300 })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase
      .from('veiculos')
      .select('*')
      .order('matricula')
      .then(({ data }) => {
        const lista = data ?? []
        setVeiculos(lista)
        setF((atual) => ({
          ...atual,
          veiculo_id: atual.veiculo_id || lista.find((v) => v.status === 'em_solo' && Number(v.bateria) >= 30)?.id || lista.find((v) => v.status === 'em_solo')?.id || lista[0]?.id || '',
        }))
        setCarregando(false)
      })
  }, [])

  const mudar = (e) => setF({ ...f, [e.target.name]: e.target.value })
  const sel = veiculos.find((v) => v.id === f.veiculo_id)

  const enviar = async (e) => {
    e.preventDefault()
    setErro('')
    if (!f.veiculo_id) return setErro('Escolha o veículo.')
    if (!f.origem.trim() || !f.destino.trim()) return setErro('Informe origem e destino.')
    if (f.origem.trim().toLowerCase() === f.destino.trim().toLowerCase()) return setErro('Origem e destino precisam ser diferentes.')
    const alt = Number(f.altitude_max)
    if (!(alt >= 30 && alt <= 400)) return setErro('A altitude máxima deve ficar entre 30 e 400 m.')

    setEnviando(true)
    const { data, error } = await supabase
      .from('voos')
      .insert({ user_id: user.id, veiculo_id: f.veiculo_id, origem: f.origem.trim(), destino: f.destino.trim(), altitude_max: alt })
      .select()
      .single()
    setEnviando(false)
    if (error) return setErro(erroAmigavel(error))
    navigate(`/painel/voos/${data.id}`)
  }

  if (carregando) return <p className="carregando">Carregando…</p>
  if (!veiculos.length) {
    return (
      <div className="vazio">
        <h1 className="titulo-pag">Nenhum veículo na conta</h1>
        <p className="muted">Para registrar um plano de voo, vincule primeiro o seu AeroCar.</p>
        <Link className="btn red" to="/painel">Vincular meu AeroCar</Link>
      </div>
    )
  }

  return (
    <form className="compra-form estreito" onSubmit={enviar} noValidate>
      <h1 className="titulo-pag">Novo plano de voo</h1>
      <p className="muted">Antes de decolar, registre origem, destino e a altitude máxima. A plataforma acompanha o voo com base neste plano.</p>

      <label htmlFor="veiculo_id">Veículo
        <select id="veiculo_id" name="veiculo_id" value={f.veiculo_id} onChange={mudar}>
          {veiculos.map((v) => (
            <option key={v.id} value={v.id}>
              {(v.apelido || 'AeroCar') + ' · ' + v.matricula + ' · ' + (v.status === 'manutencao' ? 'em manutenção' : numero(v.bateria) + '%')}
            </option>
          ))}
        </select>
      </label>
      {sel && Number(sel.bateria) < 30 && (
        <p className="aviso erro">Bateria em {numero(sel.bateria)}%. Recarregue o veículo no painel antes de decolar.</p>
      )}

      <div className="grade-campos">
        <label htmlFor="origem">Origem<input id="origem" name="origem" value={f.origem} onChange={mudar} placeholder="Ex.: Pinheiros" /></label>
        <label htmlFor="destino">Destino<input id="destino" name="destino" value={f.destino} onChange={mudar} placeholder="Ex.: Avenida Paulista" /></label>
      </div>

      <label htmlFor="altitude_max">Altitude máxima: <b>{f.altitude_max} m</b>
        <input id="altitude_max" name="altitude_max" type="range" min="30" max="400" step="10" value={f.altitude_max} onChange={mudar} />
      </label>

      {erro && <p className="aviso erro" role="alert">{erro}</p>}
      <button className="btn red" type="submit" disabled={enviando}>{enviando ? 'Registrando…' : 'Registrar plano e ir para a cabine'}</button>
    </form>
  )
}
