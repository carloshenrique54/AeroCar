import { useMemo } from 'react'

function gerarCidade() {
  let s = 7
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  const longe = []
  const perto = []
  const janelas = []
  const carros = []
  for (let x = -20; x < 1460; ) {
    const w = 40 + r() * 70
    const h = 120 + r() * 180
    longe.push({ x, y: 420 - h, w, h })
    x += w + 4
  }
  for (let x = -10; x < 1460; ) {
    const w = 50 + r() * 90
    const h = 70 + r() * 130
    perto.push({ x, y: 420 - h, w, h })
    for (let wy = 420 - h + 14; wy < 410; wy += 18)
      for (let wx = x + 8; wx < x + w - 10; wx += 14) if (r() > 0.72) janelas.push({ x: wx, y: wy })
    x += w + 6
  }
  for (let x = 10; x < 1440; x += 34) carros.push(x)
  return { longe, perto, janelas, carros }
}

export default function CityScene() {
  const c = useMemo(gerarCidade, [])
  return (
    <div className="scene" role="img" aria-label="AeroCar voando sobre a cidade, com o trânsito parado embaixo">
      <svg viewBox="0 0 1440 460" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#222F4B" />
            <stop offset="1" stopColor="#303C56" />
          </linearGradient>
          <linearGradient id="carroceria" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a4766" />
            <stop offset="1" stopColor="#151b28" />
          </linearGradient>
          <linearGradient id="vidro" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8fa3c9" />
            <stop offset="1" stopColor="#2a3550" />
          </linearGradient>
          <radialGradient id="brilho">
            <stop offset="0" stopColor="#DB0B15" stopOpacity=".55" />
            <stop offset="1" stopColor="#DB0B15" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1440" height="460" fill="url(#sk)" />
        <g fill="#2a3653">{c.longe.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} />)}</g>
        <g fill="#1E2535">{c.perto.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} />)}</g>
        <g fill="#EFE4DC" opacity=".5">{c.janelas.map((j, i) => <rect key={i} x={j.x} y={j.y} width="6" height="8" />)}</g>
        <rect x="0" y="420" width="1440" height="40" fill="#161c29" />
        <g>
          {c.carros.map((x) => (
            <g key={x}>
              <rect x={x} y="430" width="22" height="9" rx="2" fill="#303C56" />
              <rect x={x + 18} y="432" width="4" height="3" fill="#DB0B15" />
            </g>
          ))}
        </g>
        <g className="aerocar">
          <ellipse cx="760" cy="250" rx="230" ry="40" fill="url(#brilho)" />
          <path d="M560 205 Q600 160 700 150 L800 148 Q880 150 935 180 L980 200 Q990 214 975 222 L580 226 Q555 222 560 205Z" fill="url(#carroceria)" />
          <path d="M660 160 Q700 120 770 118 Q830 120 868 152 L800 150 L700 152Z" fill="url(#vidro)" />
          <path d="M600 190 L940 186" stroke="#DB0B15" strokeWidth="3" />
          <path d="M575 214 L965 212" stroke="#EFE4DC" strokeOpacity=".25" strokeWidth="1.5" />
          <g fill="#151b28">
            <ellipse cx="620" cy="232" rx="62" ry="13" />
            <ellipse cx="910" cy="232" rx="62" ry="13" />
          </g>
          <g fill="none" stroke="#DB0B15" strokeWidth="2.5">
            <ellipse cx="620" cy="232" rx="62" ry="13" />
            <ellipse cx="910" cy="232" rx="62" ry="13" />
          </g>
          <rect x="420" y="178" width="110" height="5" fill="#EFE4DC" opacity=".9" />
          <rect x="450" y="192" width="90" height="5" fill="#DB0B15" />
          <rect x="478" y="206" width="66" height="4" fill="#DB0B15" />
        </g>
      </svg>
    </div>
  )
}
