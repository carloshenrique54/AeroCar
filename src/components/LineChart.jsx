import { useEffect, useRef, useState } from 'react'

/**
 * Gráfico de linha simples em SVG, desenhado no tamanho real do contêiner.
 * series: [{ nome, cor, valores: number[] }]
 * limite: { valor, rotulo } linha tracejada opcional
 */
export default function LineChart({ series, max, limite, altura = 160, rotulo }) {
  const ref = useRef(null)
  const [largura, setLargura] = useState(600)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(200, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const m = { t: 18, r: 12, b: 20, l: 40 }
  const W = largura
  const H = altura
  const n = Math.max(2, ...series.map((s) => s.valores.length))
  const topo = max ?? Math.max(10, ...series.flatMap((s) => s.valores)) * 1.1
  const x = (i) => m.l + (i * (W - m.l - m.r)) / (n - 1)
  const y = (v) => H - m.b - (Math.max(0, v) / topo) * (H - m.t - m.b)
  const ticks = [0, topo / 2, topo].map((t) => Math.round(t))

  return (
    <div ref={ref} className="grafico" aria-label={rotulo} role="img">
      <svg width={W} height={H}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="grade" />
            <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="eixo">{t}</text>
          </g>
        ))}
        {limite && (
          <g>
            <line x1={m.l} x2={W - m.r} y1={y(limite.valor)} y2={y(limite.valor)} className="limite" />
            <text x={W - m.r} y={y(limite.valor) - 6} textAnchor="end" className="eixo">{limite.rotulo}</text>
          </g>
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
      </svg>
      {series.length > 1 && (
        <div className="legenda">
          {series.map((s) => (
            <span key={s.nome}><i style={{ background: s.cor }} />{s.nome}</span>
          ))}
        </div>
      )}
    </div>
  )
}
