import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { erroAmigavel } from '../lib/format'
import { codigoAtivacao, matricula as mascaraMatricula } from '../lib/mascaras'

export default function VincularVeiculo({ onVinculado, onCancelar }) {
  const [matricula, setMatricula] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setErro('')
    if (!matricula.trim() || !codigo.trim()) return setErro('Informe a matrícula e o código de ativação.')
    setEnviando(true)
    const { data, error } = await supabase.rpc('vincular_veiculo', { p_matricula: matricula, p_codigo: codigo })
    setEnviando(false)
    if (error) return setErro(erroAmigavel(error))
    setMatricula('')
    setCodigo('')
    onVinculado?.(data)
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
      </div>
      {erro && <p className="aviso erro" role="alert">{erro}</p>}
      <div className="cabine-acoes">
        <button className="btn red" type="submit" disabled={enviando}>{enviando ? 'Vinculando…' : 'Vincular veículo'}</button>
        {onCancelar && <button className="btn ghost" type="button" onClick={onCancelar}>Cancelar</button>}
      </div>
    </form>
  )
}
