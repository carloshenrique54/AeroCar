import { numero } from '../lib/format'

export default function Medidores({ leitura, altitudeMax = 150 }) {
  const alt = Number(leitura?.altitude ?? 0)
  const inc = Number(leitura?.inclinacao ?? 0)
  const bat = Number(leitura?.bateria ?? 100)
  const critica = bat <= 20

  return (
    <div className="medidores">
      <div className="medidor">
        <span>Altitude</span>
        <b>{numero(alt)} m</b>
        <div className="barra"><i style={{ width: `${Math.min(100, (alt / altitudeMax) * 100)}%` }} /></div>
      </div>
      <div className={`medidor ${Math.abs(inc) > 25 ? 'critico' : ''}`}>
        <span>Inclinação</span>
        <b>{numero(inc, 1)}°</b>
        <div className="barra"><i style={{ width: `${Math.min(100, (Math.abs(inc) / 30) * 100)}%` }} /></div>
      </div>
      <div className={`medidor ${critica ? 'critico' : ''}`}>
        <span>Bateria</span>
        <b>{numero(bat)}%</b>
        <div className="barra"><i style={{ width: `${bat}%` }} /></div>
      </div>
    </div>
  )
}
