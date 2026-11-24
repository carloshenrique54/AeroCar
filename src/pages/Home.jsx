import { useState } from 'react'
import { Link } from 'react-router-dom'
import CityScene from '../components/CityScene'
import Medidores from '../components/Medidores'
import LineChart from '../components/LineChart'
import { supabase } from '../lib/supabase'
import { dinheiro, erroAmigavel, PRECO_UNITARIO } from '../lib/format'
import { useAuth } from '../context/AuthContext'

const VOO_EXEMPLO = [0, 16, 33, 49, 66, 82, 98, 115, 131, 143, 142, 145, 147, 144, 141, 143, 146, 145, 142, 144]

export default function Home() {
  const { user } = useAuth()

  return (
    <>
      <section className="band hero" id="inicio">
        <div className="wrap hero-top">
          <div>
            <h1>O trânsito fica embaixo.</h1>
            <p className="lede">
              Carro voador pessoal com telemetria em tempo real. Altitude, estabilidade e bateria acompanhadas do plano de voo ao pouso.
            </p>
            <div className="ctas">
              <a className="btn red" href="#proprietario">Agende uma demonstração</a>
              <a className="btn ghost" href="#plataforma">Conheça a plataforma</a>
            </div>
          </div>
          <div className="hud" aria-label="O que a plataforma monitora">
            <div><b>Altitude</b><span>em tempo real</span></div>
            <div><b>Inclinação</b><span>estabilidade do voo</span></div>
            <div><b>Bateria</b><span>alerta de pouso</span></div>
          </div>
        </div>
        <CityScene />
      </section>

      <section className="band light" id="problema">
        <div className="wrap split">
          <div>
            <p className="label">Quem usa carro em São Paulo</p>
            <p className="big">2h28</p>
            <p className="big-txt">por dia em deslocamentos, em média, somando ida e volta de todas as atividades.</p>
            <p className="src">Fonte: Rede Nossa São Paulo / Ipec, Viver em SP 2024 – Mobilidade Urbana.</p>
          </div>
          <div className="vr">
            <span className="dash" />
            <p className="label">O desafio</p>
            <h2>Não existe uma forma segura de o proprietário acompanhar o próprio veículo aéreo.</h2>
            <p className="lede">
              Quem voa precisa saber, a cada instante, em que altitude está, se o veículo está estável e quanto de bateria resta para pousar com segurança.
            </p>
            <div className="chips"><span>Altitude</span><span>Estabilidade</span><span>Bateria</span></div>
          </div>
        </div>
      </section>

      <section className="band" id="solucao">
        <div className="wrap">
          <p className="label">Solução</p>
          <h2 className="h2-largo">Um carro voador pessoal que conversa com você durante todo o voo.</h2>
          <div className="cols">
            <div><span className="dash" /><h3>Alerta de pouso imediato</h3><p>Acionado automaticamente quando a bateria atinge o nível crítico.</p></div>
            <div><span className="dash" /><h3>Histórico de cada voo</h3><p>Origem, destino e leituras de cada viagem ficam registrados e podem ser consultados na plataforma.</p></div>
            <div><span className="dash" /><h3>Todos os veículos num painel</h3><p>Quem tem mais de um AeroCar acompanha todos ao mesmo tempo, na mesma conta.</p></div>
          </div>
        </div>
      </section>

      <section className="band deep" id="plataforma">
        <div className="wrap plat">
          <div>
            <p className="label">Como funciona</p>
            <h2>Do plano de voo ao pouso, tudo monitorado.</h2>
            <ol className="passos">
              <li><span className="n">1</span><div><h3>Plano de voo</h3><p>Antes de decolar, o piloto registra origem, destino e altitude máxima.</p></div></li>
              <li><span className="n">2</span><div><h3>Telemetria em voo</h3><p>O veículo envia altitude, inclinação e bateria em tempo real para a plataforma.</p></div></li>
              <li><span className="n">3</span><div><h3>Alerta de segurança</h3><p>Com bateria crítica, a plataforma alerta e recomenda pouso imediato.</p></div></li>
            </ol>
            <Link className="btn ghost" to={user ? '/painel' : '/entrar'}>Acessar meu painel</Link>
          </div>
          <div className="cabine">
            <div className="cabine-topo">
              <div className="rota">De Pinheiros à Paulista<small>Altitude máxima do plano: 150 m</small></div>
              <div className="ao-vivo on"><i />Em voo</div>
            </div>
            <Medidores leitura={{ altitude: 144, inclinacao: 1.8, bateria: 71 }} altitudeMax={150} />
            <LineChart
              titulo="Altitude"
              series={[{ nome: 'Altitude do veículo', cor: '#EFE4DC', valores: VOO_EXEMPLO }]}
              max={170}
              unidade="m"
              limite={{ valor: 150, rotulo: 'Altitude máxima do plano' }}
              altura={130}
            />
          </div>
        </div>
      </section>

      <section className="band light" id="missao">
        <div className="wrap">
          <p className="label">Nossa missão</p>
          <p className="missao">Tirar as pessoas do trânsito e levá-las pelo céu, com segurança em cada voo.</p>
          <div className="mv">
            <div><span className="dash" /><h3>Visão</h3><p>Ser referência em mobilidade aérea urbana, com cada voo planejado, monitorado e seguro, do plano de voo ao pouso.</p></div>
            <div>
              <span className="dash" /><h3>Valores</h3>
              <ul className="valores">
                <li>Segurança em primeiro lugar</li>
                <li>Tempo de volta para as pessoas</li>
                <li>Inovação com responsabilidade</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="band" id="proprietario">
        <div className="wrap buy">
          <div>
            <p className="label">Área do proprietário</p>
            <h2 className="h2-sec">Já tem um AeroCar? Crie a sua conta.</h2>
            <p className="lede">Vincule o veículo com a matrícula e o código de ativação entregues junto com ele e acompanhe cada voo pela plataforma.</p>
            <ul className="inclui">
              <li><span>Telemetria em tempo real</span><span>Todas as contas</span></li>
              <li><span>Alertas de bateria, altitude e inclinação</span><span>Todas as contas</span></li>
              <li><span>Histórico de cada voo</span><span>Todas as contas</span></li>
              <li><span>Vários veículos no mesmo painel</span><span>Plano Executivo</span></li>
            </ul>
            <div className="ctas">
              <Link className="btn red" to={user ? '/painel' : '/cadastro'}>{user ? 'Ir para o meu painel' : 'Criar minha conta'}</Link>
              {!user && <Link className="btn ghost" to="/entrar">Já tenho conta</Link>}
            </div>
            <p className="src">AeroCar a partir de {dinheiro(PRECO_UNITARIO)}, com a plataforma inclusa.</p>
          </div>
          <FormDemonstracao />
        </div>
      </section>
    </>
  )
}

function FormDemonstracao() {
  const [form, setForm] = useState({ nome: '', email: '', uso: 'pessoal', cidade: '' })
  const [estado, setEstado] = useState({ tipo: null, msg: '' })
  const [enviando, setEnviando] = useState(false)

  const mudar = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const enviar = async (e) => {
    e.preventDefault()
    if (!form.nome.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) {
      setEstado({ tipo: 'erro', msg: 'Preencha seu nome e um e-mail válido.' })
      return
    }
    setEnviando(true)
    const { error } = await supabase.from('demonstracoes').insert({
      nome: form.nome.trim(),
      email: form.email.trim().toLowerCase(),
      uso: form.uso,
      cidade: form.cidade.trim() || null,
    })
    setEnviando(false)
    if (error) {
      setEstado({ tipo: 'erro', msg: erroAmigavel(error) })
      return
    }
    setEstado({ tipo: 'ok', msg: `Obrigado, ${form.nome.trim().split(' ')[0]}. Nossa equipe vai entrar em contato por e-mail para agendar sua demonstração.` })
    setForm({ nome: '', email: '', uso: 'pessoal', cidade: '' })
  }

  return (
    <form className="cartao-form" onSubmit={enviar} noValidate>
      <h3>Ainda não tem o seu? Agende uma demonstração</h3>
      <label htmlFor="demo-nome">Nome<input id="demo-nome" name="nome" value={form.nome} onChange={mudar} autoComplete="name" required /></label>
      <label htmlFor="demo-email">E-mail<input id="demo-email" name="email" type="email" value={form.email} onChange={mudar} autoComplete="email" required /></label>
      <label htmlFor="demo-cidade">Cidade<input id="demo-cidade" name="cidade" value={form.cidade} onChange={mudar} autoComplete="address-level2" /></label>
      <label htmlFor="demo-uso">Uso pretendido
        <select id="demo-uso" name="uso" value={form.uso} onChange={mudar}>
          <option value="pessoal">Pessoal</option>
          <option value="operadora">Operadora de táxi aéreo</option>
        </select>
      </label>
      <button className="btn red" type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Quero conhecer'}</button>
      {estado.msg && <p className={`aviso ${estado.tipo}`} role="status">{estado.msg}</p>}
    </form>
  )
}
