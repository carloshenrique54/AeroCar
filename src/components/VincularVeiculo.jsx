import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { erroAmigavel } from '../lib/format'
import { codigoAtivacao, matricula as mascaraMatricula } from '../lib/mascaras'

/** Vincula um AeroCar à conta. Com `frotas`, o titular já escolhe em qual frota ele entra. */
export default function VincularVeiculo({ frotas, frotaInicial = '', onVinculado, onCancelar }) {
  const [matricula, setMatricula] = useState('')
  const [codigo, setCodigo] = useState('')
  const [frota, setFrota] = useState(frotaInicial)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setErro('')
    if (!matricula.trim() || !codigo.trim()) return setErro('Informe a matrícula e o código de ativação.')
    setEnviando(true)
    const { data, error } = await supabase.rpc('vincular_veiculo', { p_matricula: matricula, p_codigo: codigo })
    if (error) {
      setEnviando(false)
      return setErro(erroAmigavel(error))
    }
    let veiculo = data
    if (frota) {
      const r = await supabase.rpc('mover_veiculo', { p_veiculo: data.id, p_frota: frota })
      if (r.error) {
        setEnviando(false)
        return setErro(`Veículo vinculado, mas não foi possível colocá-lo na frota: ${erroAmigavel(r.error)}`)
      }
      veiculo = r.data
    }
    setEnviando(false)
    setMatricula('')
    setCodigo('')
    onVinculado?.(veiculo)
  }

  return (
    <form className="cartao-form vincular" onSubmit={enviar} noValidate>
      <h2 className="h-bloco">Vincular um AeroCar</h2>
      <p className="muted">A matrícula e o código de ativação estão no cartão entregue junto com o veículo.</p>
      <div className="grade-campos">
        <label htmlFor="matricula">Matrícula
          <input id="matricula" value={matricula} onChange={(e) => setMatricula(mascaraMatricula(e.target.value))} placeholder="AC-001" autoCapitalize="characters" autoComplete="off" maxLength={8} />
        </label>
        <label htmlFor="codigo">Código de ativação
          <input id="codigo" value={codigo} onChange={(e) => setCodigo(codigoAtivacao(e.target.value))} placeholder="AERO01" autoCapitalize="characters" autoComplete="off" maxLength={6} />
        </label>
        {frotas?.length > 0 && (
          <label className="largo" htmlFor="vinc-frota">Frota
            <select id="vinc-frota" value={frota} onChange={(e) => setFrota(e.target.value)}>
              <option value="">Sem frota por enquanto</option>
              {frotas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </label>
        )}
      </div>
      {erro && <p className="aviso erro" role="alert">{erro}</p>}
      <div className="cabine-acoes">
        <button className="btn red" type="submit" disabled={enviando}>{enviando ? 'Vinculando…' : 'Vincular veículo'}</button>
        {onCancelar && <button className="btn ghost" type="button" onClick={onCancelar}>Cancelar</button>}
      </div>
    </form>
  )
}
