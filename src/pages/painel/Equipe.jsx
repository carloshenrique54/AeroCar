import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { erroAmigavel, numero, STATUS_VEICULO } from '../../lib/format'
import { comSinal, useAgora } from '../../lib/sinal'

export default function Equipe() {
  const { conta, papel, perfil } = useAuth()
  const agora = useAgora()
  const [frotas, setFrotas] = useState([])
  const [membros, setMembros] = useState([])
  const [veiculos, setVeiculos] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('frotas').select('*').order('nome'),
      supabase.from('membros').select('*, perfis(nome, telefone)'),
      supabase.from('veiculos').select('id, matricula, apelido, status, bateria, ultimo_sinal, frota_id').order('matricula'),
    ]).then(([f, m, v]) => {
      const e = f.error || m.error || v.error
      if (e) setErro(erroAmigavel(e))
      setFrotas(f.data ?? [])
      setMembros(m.data ?? [])
      setVeiculos(v.data ?? [])
      setCarregando(false)
    })
  }, [])

  if (carregando) return <p className="carregando">Carregando…</p>

  // Gerente e piloto veem a própria frota; o titular vê todas
  const visiveis = conta?.frota_id ? frotas.filter((f) => f.id === conta.frota_id) : frotas
  const nomeTitular = papel === 'titular' ? perfil?.nome : conta?.titular
  const semFrota = membros.filter((m) => !m.frota_id)

  return (
    <>
      <div className="cab-pag">
        <div>
          <h1 className="titulo-pag">{papel === 'piloto' ? 'Minha frota' : 'Frotas e equipe'}</h1>
          <p className="muted">{conta?.empresa}{nomeTitular ? ` · titular ${nomeTitular}` : ''}</p>
        </div>
      </div>

      {erro && <p className="aviso erro" role="alert">{erro}</p>}

      {papel === 'titular' && (
        <div className="numeros">
          <div><b>{frotas.length}</b><span>frotas</span></div>
          <div><b>{veiculos.length}</b><span>veículos</span></div>
          <div><b>{membros.filter((m) => m.papel === 'gerente').length}</b><span>gerentes</span></div>
          <div><b>{membros.filter((m) => m.papel === 'piloto').length}</b><span>pilotos</span></div>
        </div>
      )}

      {!visiveis.length && <p className="muted">Nenhuma frota cadastrada nesta conta.</p>}

      {visiveis.map((f) => {
        const daFrota = membros.filter((m) => m.frota_id === f.id)
        const gerentes = daFrota.filter((m) => m.papel === 'gerente')
        const pilotos = daFrota.filter((m) => m.papel === 'piloto')
        const vs = veiculos.filter((v) => v.frota_id === f.id)
        return (
          <article key={f.id} className="frota">
            <div className="grupo-topo">
              <h2 className="h-bloco">{f.nome}</h2>
              {f.base && <span className="muted">Base: {f.base}</span>}
            </div>
            <div className="frota-cols">
              <div>
                <h3 className="rotulo">Gerente{gerentes.length > 1 ? 's' : ''}</h3>
                <Pessoas lista={gerentes} vazio="Sem gerente" />
                <h3 className="rotulo">Pilotos</h3>
                <Pessoas lista={pilotos} vazio="Nenhum piloto" />
              </div>
              <div>
                <h3 className="rotulo">Veículos</h3>
                {vs.length ? (
                  <ul className="lista">
                    {vs.map((v) => {
                      const online = comSinal(v.ultimo_sinal, agora)
                      return (
                        <li key={v.id}>
                          <div>
                            <b>{v.apelido || v.matricula}</b>
                            <small>{v.matricula} · bateria {numero(v.bateria)}%</small>
                          </div>
                          <span className={`ao-vivo ${online ? 'on' : ''}`}><i />{online ? 'Conectado' : 'Sem sinal'}</span>
                          <span className={`selo ${v.status}`}>{STATUS_VEICULO[v.status]}</span>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="muted">Nenhum veículo nesta frota.</p>
                )}
              </div>
            </div>
          </article>
        )
      })}

      {papel === 'titular' && semFrota.length > 0 && (
        <article className="frota">
          <h2 className="h-bloco">Sem frota definida</h2>
          <Pessoas lista={semFrota} vazio="" mostrarPapel />
        </article>
      )}
    </>
  )
}

function Pessoas({ lista, vazio, mostrarPapel }) {
  if (!lista.length) return <p className="muted">{vazio}</p>
  return (
    <ul className="pessoas">
      {lista.map((m) => (
        <li key={m.user_id}>
          <b>{m.perfis?.nome || 'Sem nome'}</b>
          <small>
            {mostrarPapel ? `${m.papel === 'gerente' ? 'Gerente' : 'Piloto'} · ` : ''}
            {m.perfis?.telefone || 'sem telefone'}
          </small>
        </li>
      ))}
    </ul>
  )
}
