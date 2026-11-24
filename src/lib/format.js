export const PRECO_UNITARIO = 630000

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
export const dinheiro = (v) => brl.format(Number(v) || 0)

export const numero = (v, casas = 0) =>
  (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

export const dataHora = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export const duracao = (inicio, fim) => {
  if (!inicio) return '—'
  const ms = (fim ? new Date(fim) : new Date()) - new Date(inicio)
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  return m ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`
}

export const STATUS_VOO = {
  planejado: 'Planejado',
  em_voo: 'Em voo',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

export const STATUS_VEICULO = {
  em_solo: 'Em solo',
  em_voo: 'Em voo',
  manutencao: 'Manutenção',
}

export const erroAmigavel = (error) => {
  const msg = error?.message ?? String(error ?? '')
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/User already registered/i.test(msg)) return 'Já existe uma conta com este e-mail.'
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'
  if (/Password should be at least/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sem conexão com o servidor. Tente novamente.'
  return msg || 'Algo deu errado. Tente novamente.'
}
