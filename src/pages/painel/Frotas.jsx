import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { erroAmigavel } from '../../lib/format'
import { comSinal, useAgora } from '../../lib/sinal'
import { Confirmar, FormFrota } from '../../components/Gestao'

export default function Frotas() {
  const { papel, conta } = useAuth()
  const titular = papel === 'titular'
  const agora = useAgora(3000)
  const [frotas, setFrotas] = useState([])
  const [membros, setMembros] = useState([])
  const [veiculos, setVeiculos] = useState([])
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    const [f, m, v] = await Promise.all([
      supabase.from('frotas').select('*').order('nome'),
      supabase.from('membros').select('user_id, papel, frota_id, perfis(nome)').eq('ativo', true),
      supabase.from('veiculos').select('id, status, ultimo_sinal, frota_id'),
    ])
    const e = f.error || m.error || v.error
    if (e) setErro(erroAmigavel(e))
    setFrotas(f.data ?? [])
    setMembros(m.data ?? [])
    setVeiculos(v.data ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const excluir = async (f) => {
    setErro('')
    const { error } = await supabase.rpc('excluir_frota', { p_frota: f.id })
    if (error) return setErro(erroAmigavel(error))
    setAviso(`Frota ${f.nome} excluída. Os veículos e as pessoas dela ficaram sem frota.`)
    carregar()
  }

  if (carregando) return <p className="carregando">Carregando…</p>

  // Gerente vê só a própria frota
  const visiveis = conta?.frota_id ? frotas.filter((f) => f.id === conta.frota_id) : frotas
  const resumo = (id) => {
    const vs = veiculos.filter((v) => (id ? v.frota_id === id : !v.frota_id))
    const ms = membros.filter((m) => (id ? m.frota_id === id : !m.frota_id))
    return {
      veiculos: vs.length,
      conectados: vs.filter((v) => comSinal(v.ultimo_sinal, agora)).length,
      emVoo: vs.filter((v) => v.status === 'em_voo').length,
      gerentes: ms.filter((m) => m.papel === 'gerente').map((m) => m.perfis?.nome).filter(Boolean),
      pilotos: ms.filter((m) => m.papel === 'piloto').length,
    }
  }
  const semFrota = resumo(null)

  return (
    <>
      <div className="cab-pag">
        <div>
          <h1 className="titulo-pag">Frotas</h1>
          <p className="muted">{conta?.empresa ? `${conta.empresa}. ` : ''}Clique numa frota para ver os veículos dela.</p>
        </div>
        {titular && (
          <button className="btn red" type="button" onClick={() => setCriando((c) => !c)}>Criar frota</button>
        )}
      </div>

      {criando && (
        <FormFrota
          onCancelar={() => setCriando(false)}
          onCriada={(f) => {
            setCriando(false)
            setAviso(`${/^frota\b/i.test(f.nome) ? f.nome : `Frota ${f.nome}`} criada. Agora coloque veículos nela pela lista de veículos ou cadastre a equipe.`)
            carregar()
          }}
        />
      )}

      {erro && <p className="aviso erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso ok" role="status">{aviso}</p>}

      {!visiveis.length && (
        <div className="vazio">
          <p className="muted">{titular ? 'Nenhuma frota ainda. Crie a primeira para organizar veículos, gerentes e pilotos.' : 'Nenhuma frota definida para você.'}</p>
        </div>
      )}

      <div className="frotas">
        {visiveis.map((f) => {
          const r = resumo(f.id)
          return (
            <article key={f.id} className="frota-card">
              <Link className="frota-link" to={`/painel?frota=${f.id}`}>
                <h2 className="h-bloco">{f.nome}</h2>
                <span className="muted">{f.base ? `Base: ${f.base}` : 'Sem base definida'}</span>
                <span className="frota-numeros">
                  <span><b>{r.veiculos}</b> veículo{r.veiculos === 1 ? '' : 's'}</span>
                  <span><b>{r.conectados}</b> com sinal</span>
                  <span><b>{r.emVoo}</b> em voo</span>
                  <span><b>{r.pilotos}</b> piloto{r.pilotos === 1 ? '' : 's'}</span>
                </span>
                <span className="muted">Gerente: {r.gerentes.length ? r.gerentes.join(', ') : 'sem gerente'}</span>
                <span className="frota-ir">Ver veículos</span>
              </Link>
              <div className="frota-acoes">
                <Link to={`/painel/equipe?frota=${f.id}`}>Ver equipe</Link>
                {titular && (
                  <Confirmar
                    link
                    rotulo="Excluir frota"
                    pergunta="Excluir? Veículos e pessoas ficam sem frota."
                    onConfirmar={() => excluir(f)}
                  />
                )}
              </div>
            </article>
          )
        })}

        {titular && (semFrota.veiculos > 0 || semFrota.pilotos > 0 || semFrota.gerentes.length > 0) && (
          <article className="frota-card sem">
            <Link className="frota-link" to="/painel?frota=sem">
              <h2 className="h-bloco">Sem frota</h2>
              <span className="muted">Veículos e pessoas que ainda não estão em nenhuma frota</span>
              <span className="frota-numeros">
                <span><b>{semFrota.veiculos}</b> veículo{semFrota.veiculos === 1 ? '' : 's'}</span>
                <span><b>{semFrota.pilotos + semFrota.gerentes.length}</b> pessoa{semFrota.pilotos + semFrota.gerentes.length === 1 ? '' : 's'}</span>
              </span>
              <span className="frota-ir">Ver veículos</span>
            </Link>
            <div className="frota-acoes">
              <Link to="/painel/equipe?frota=sem">Ver equipe</Link>
            </div>
          </article>
        )}
      </div>
    </>
  )
}
