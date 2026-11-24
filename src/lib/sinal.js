import { useEffect, useState } from 'react'

/** O veículo envia leituras a cada 1 s; sem nada há mais de 10 s, está sem sinal. */
export const LIMITE_SINAL_MS = 10000

export const comSinal = (ultimoSinal, agora = Date.now()) =>
  Boolean(ultimoSinal) && agora - new Date(ultimoSinal).getTime() < LIMITE_SINAL_MS

/** Relógio que atualiza a tela de tempos em tempos, para o status de sinal mudar sozinho. */
export function useAgora(intervaloMs = 2000) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), intervaloMs)
    return () => clearInterval(t)
  }, [intervaloMs])
  return agora
}
