import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import RotaProtegida from './components/RotaProtegida'
import PainelLayout from './components/PainelLayout'
import Home from './pages/Home'
import Entrar from './pages/Entrar'
import Cadastro from './pages/Cadastro'
import NaoEncontrado from './pages/NaoEncontrado'
import Visao from './pages/painel/Visao'
import NovoVoo from './pages/painel/NovoVoo'
import Voo from './pages/painel/Voo'
import Historico from './pages/painel/Historico'
import Conta from './pages/painel/Conta'
import Equipe from './pages/painel/Equipe'
import Frotas from './pages/painel/Frotas'

function RolarParaTopo() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <>
      <RolarParaTopo />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/comprar" element={<Navigate to="/#proprietario" replace />} />
          <Route path="/painel" element={<RotaProtegida><PainelLayout /></RotaProtegida>}>
            <Route index element={<Visao />} />
            <Route path="voos/novo" element={<NovoVoo />} />
            <Route path="voos/:id" element={<Voo />} />
            <Route path="historico" element={<Historico />} />
            <Route path="frotas" element={<Frotas />} />
            <Route path="equipe" element={<Equipe />} />
            <Route path="conta" element={<Conta />} />
          </Route>
          <Route path="*" element={<NaoEncontrado />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
