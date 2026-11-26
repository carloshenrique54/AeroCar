import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { erroAmigavel } from '../lib/format'
import { codigoConta } from '../lib/mascaras'

/** Titular da conta Executiva: adiciona os veículos de um novo contrato com o código da conta. */
export default function AdicionarVeiculos({ frotas, frotaInicial = '', onAdicionados, onCancelar }) {
  const [codigo, setCodigo] = useState('')
  const [frota, setFrota] = useState(frotaInicial)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setErro('')
    if (codigo.replace(/[^A-Z0-9]/g, '').length < 10) return setErro('Informe o código de ativação da conta (EX-XXXX-XXXX).')
    setEnviando(true)
    const { data, error } = await supabase.rpc('resgatar_codigo_conta', { p_codigo: codigo })
    if (error) {
      setEnviando(false)
      return setErro(erroAmigavel(error))
    }
    if (frota) {
      for (const id of data.ids ?? []) {
        const r = await supabase.rpc('mover_veiculo', { p_veiculo: id, p_frota: frota })
        if (r.error) {
          setEnviando(false)
          return setErro(`Veículos adicionados, mas não foi possível colocá-los na frota: ${erroAmigavel(r.error)}`)
        }
      }
    }
    setEnviando(false)
    setCodigo('')
    onAdicionados?.(data.veiculos)
  }

  return (
    <form className="cartao-form vincular" onSubmit={enviar} noValidate>
      <h2 className="h-bloco">Adicionar veículos</h2>
      <p className="muted">Em cada nova compra, a AeroCar envia um código de ativação da conta. Os veículos do contrato entram na sua conta de uma vez.</p>
      <div className="grade-campos">
        <label htmlFor="codigo-conta">Código de ativação da conta
          <input id="codigo-conta" value={codigo} onChange={(e) => setCodigo(codigoConta(e.target.value))} placeholder="EX-XXXX-XXXX" autoCapitalize="characters" autoComplete="off" maxLength={12} />
        </label>
        {frotas?.length > 0 && (
          <label htmlFor="add-frota">Frota
            <select id="add-frota" value={frota} onChange={(e) => setFrota(e.target.value)}>
              <option value="">Sem frota por enquanto</option>
              {frotas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </label>
        )}
      </div>
      {erro && <p className="aviso erro" role="alert">{erro}</p>}
      <div className="cabine-acoes">
        <button className="btn red" type="submit" disabled={enviando}>{enviando ? 'Adicionando…' : 'Adicionar veículos'}</button>
        {onCancelar && <button className="btn ghost" type="button" onClick={onCancelar}>Cancelar</button>}
      </div>
    </form>
  )
}
