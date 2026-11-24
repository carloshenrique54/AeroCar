import { Link } from 'react-router-dom'

export default function Logo({ to = '/' }) {
  return (
    <Link className="logo" to={to} aria-label="AeroCar, página inicial">
      <svg viewBox="0 0 34 16" aria-hidden="true">
        <rect x="0" y="1" width="26" height="3" fill="#EFE4DC" />
        <rect x="4" y="7" width="22" height="3" fill="#DB0B15" />
        <rect x="8" y="13" width="18" height="2.5" fill="#DB0B15" />
      </svg>
      <span>
        AERO<span className="c">CAR</span>
      </span>
    </Link>
  )
}
