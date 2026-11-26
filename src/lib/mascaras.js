// Formatação automática de campos enquanto a pessoa digita

const digitos = (v) => String(v ?? '').replace(/\D/g, '')

/** (11) 91234-5678 ou (11) 1234-5678 */
export function telefone(v) {
  const d = digitos(v).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** 000.000.000-00 */
export function cpf(v) {
  const d = digitos(v).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

/** 00000-000 */
export function cep(v) {
  const d = digitos(v).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/** Matrícula do veículo: AC-001, AC-3F9B2 */
export function matricula(v) {
  const s = String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (/^\d/.test(s)) return `AC-${s.slice(0, 5)}`
  if (s.length <= 2) return s
  return s.startsWith('AC') ? `AC-${s.slice(2, 7)}` : s.slice(0, 7)
}

/** Código de ativação: 6 letras ou números, em maiúsculas */
export function codigoAtivacao(v) {
  return String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

/** Código de ativação da conta Executiva: EX-XXXX-XXXX */
export function codigoConta(v) {
  let s = String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (s.startsWith('EX')) s = s.slice(2)
  s = s.slice(0, 8)
  if (!s) return ''
  return `EX-${s.slice(0, 4)}${s.length > 4 ? `-${s.slice(4)}` : ''}`
}

/** Telefone completo: 10 ou 11 dígitos (fixo ou celular) */
export const telefoneValido = (v) => [10, 11].includes(digitos(v).length)

/** CPF com dígitos verificadores corretos */
export function cpfValido(v) {
  const d = digitos(v)
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  const dv = (n) => {
    let soma = 0
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i)
    const r = (soma * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10])
}
