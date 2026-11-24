import { useEffect, useRef, useState } from 'react'

const hora = (iso) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

/**
 * Gráfico de linha em SVG, desenhado no tamanho real do contêiner.
 * titulo:  texto acima do gráfico
 * series:  [{ nome, cor, valores: number[] }]
 * unidade: sufixo dos valores do eixo (ex.: 'm', '%', '°')
 * limite:  { valor, rotulo } linha tracejada opcional
 * tempos:  horários (ISO) de cada ponto, para o eixo de baixo
 */
export default function LineChart({ titulo, series, max, unidade = '', limite, tempos, altura = 160 }) {
  const ref = useRef(null)
  const [largura, setLargura] = useState(600)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(200, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const m = { t: 12, r: 12, b: tempos?.length ? 26 : 12, l: 56 }
  const W = largura
  const H = altura
  const n = Math.max(2, ...series.map((s) => s.valores.length))
  const topo = max ?? Math.max(10, ...series.flatMap((s) => s.valores)) * 1.1
  const x = (i) => m.l + (i * (W - m.l - m.r)) / (n - 1)
  const y = (v) => H - m.b - (Math.max(0, v) / topo) * (H - m.t - m.b)
  const ticks = [0, topo / 2, topo].map((t) => Math.round(t))
  const sufixo = unidade === '%' || unidade === '°' ? unidade : unidade ? ` ${unidade}` : ''

  // Horários no eixo de baixo: início, meio e fim (só início e fim em telas estreitas)
  const marcas = tempos?.length > 1
    ? (W < 420 ? [0, tempos.length - 1] : [0, Math.floor((tempos.length - 1) / 2), tempos.length - 1])
    : []
  const vazio = series.every((s) => !s.valores.length)

  return (
    <figure className="grafico">
      <figcaption className="grafico-topo">
        {titulo && <b>{titulo}</b>}
        <span className="legenda">
          {series.map((s) => (
            <span key={s.nome}><i style={{ background: s.cor }} />{s.nome}</span>
          ))}
          {limite && <span><i className="tracejado" />{limite.rotulo}</span>}
        </span>
      </figcaption>
      <div ref={ref} className="grafico-area">
        <svg width={W} height={H} role="img" aria-label={titulo}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="grade" />
              <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="eixo">{t}{sufixo}</text>
            </g>
          ))}
          {limite && (
            <line x1={m.l} x2={W - m.r} y1={y(limite.valor)} y2={y(limite.valor)} className="limite" />
          )}
          {series.map((s) =>
            s.valores.length ? (
              <path
                key={s.nome}
                d={s.valores.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('')}
                fill="none"
                stroke={s.cor}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            ) : null,
          )}
          {marcas.map((i, k) => (
            <text
              key={i}
              x={x(i)}
              y={H - 6}
              textAnchor={k === 0 ? 'start' : k === marcas.length - 1 ? 'end' : 'middle'}
              className="eixo"
            >
              {hora(tempos[i])}
            </text>
          ))}
          {vazio && (
            <text x={(m.l + W - m.r) / 2} y={(m.t + H - m.b) / 2} textAnchor="middle" className="eixo">
              As leituras aparecem aqui depois da decolagem
            </text>
          )}
        </svg>
      </div>
    </figure>
  )
}
