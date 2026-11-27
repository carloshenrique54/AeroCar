import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import CityScene from '../components/CityScene'
import Medidores from '../components/Medidores'
import LineChart from '../components/LineChart'
import { supabase } from '../lib/supabase'
import { dinheiro, erroAmigavel, PRECO_UNITARIO } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { telefone as mascaraTelefone, telefoneValido } from '../lib/mascaras'

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
              <a className="btn red" href="#contato">Agende uma demonstração</a>
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

      <section className="band" id="executivo">
        <div className="wrap">
          <p className="label">Plano Executivo</p>
          <h2 className="h2-sec">Para empresas que operam vários AeroCars.</h2>
          <p className="lede exec-lede">Todos os veículos da empresa em um só painel.</p>
          <ul className="exec-lista">
            <li><b>Frotas</b> por base ou região</li>
            <li><b>Gerentes</b> cuidando da própria frota</li>
            <li><b>Pilotos</b> veem só o veículo deles</li>
            <li><b>Telemetria</b> de toda a frota ao vivo</li>
            <li><b>Alertas</b> de bateria, altitude e inclinação</li>
            <li><b>Histórico</b> de cada voo e piloto</li>
            <li><b>Ativação</b> com um único código</li>
            <li><b>Novas compras</b> na mesma conta</li>
          </ul>
          <ol className="exec-passos">
            <li><b>1</b>Fale com a AeroCar pelo formulário</li>
            <li><b>2</b>Feche o contrato e receba o código da conta</li>
            <li><b>3</b>Crie a conta Executiva e cadastre a equipe</li>
          </ol>
          <div className="cabine-acoes">
            <Link className="btn red" to="/?assunto=plano_executivo#contato">Quero o Plano Executivo</Link>
            <Link className="btn ghost" to="/cadastro?tipo=executivo">Já tenho o código</Link>
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
            <p className="lede">Na conta pessoal, vincule o veículo com a matrícula e o código entregues junto com ele. No Plano Executivo, a AeroCar envia o código de ativação da conta, e os veículos do contrato já entram nela.</p>
            <ul className="inclui">
              <li><span>Telemetria em tempo real</span><span>Todas as contas</span></li>
              <li><span>Alertas de bateria, altitude e inclinação</span><span>Todas as contas</span></li>
              <li><span>Histórico de cada voo</span><span>Todas as contas</span></li>
              <li><span>Frotas, gerentes e pilotos no mesmo painel</span><span>Plano Executivo</span></li>
            </ul>
            <div className="ctas">
              <Link className="btn red" to={user ? '/painel' : '/cadastro'}>{user ? 'Ir para o meu painel' : 'Criar minha conta'}</Link>
              {!user && <Link className="btn ghost" to="/entrar">Já tenho conta</Link>}
            </div>
            <p className="src">AeroCar a partir de {dinheiro(PRECO_UNITARIO)}, com a plataforma inclusa.</p>
          </div>
          <FormContato />
        </div>
      </section>
    </>
  )
}

const ASSUNTOS = {
  demonstracao: 'Agendar uma demonstração',
  plano_executivo: 'Contratar o Plano Executivo',
  suporte: 'Suporte para o meu AeroCar',
  outro: 'Outro assunto',
}

function FormContato() {
  const { user, perfil } = useAuth()
  const [params] = useSearchParams()
  const inicial = ASSUNTOS[params.get('assunto')] ? params.get('assunto') : 'demonstracao'
  const vazio = { nome: '', email: '', telefone: '', empresa: '', assunto: inicial, mensagem: '' }
  const [form, setForm] = useState(vazio)
  const [estado, setEstado] = useState({ tipo: null, msg: '' })
  const [enviando, setEnviando] = useState(false)

  // Quem já está logado não precisa digitar nome e e-mail de novo
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, nome: f.nome || perfil?.nome || '', email: f.email || user.email }))
  }, [user, perfil])

  useEffect(() => {
    setForm((f) => ({ ...f, assunto: inicial }))
  }, [inicial])

  const mudar = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: name === 'telefone' ? mascaraTelefone(value) : value })
  }

  const enviar = async (e) => {
    e.preventDefault()
    setEstado({ tipo: null, msg: '' })
    if (!form.nome.trim()) return setEstado({ tipo: 'erro', msg: 'Informe seu nome.' })
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setEstado({ tipo: 'erro', msg: 'Informe um e-mail válido.' })
    if (form.telefone && !telefoneValido(form.telefone)) return setEstado({ tipo: 'erro', msg: 'Telefone incompleto. Use DDD + número.' })
    if (form.assunto === 'plano_executivo' && !form.empresa.trim()) return setEstado({ tipo: 'erro', msg: 'Informe o nome da empresa.' })
    if (!form.mensagem.trim()) return setEstado({ tipo: 'erro', msg: 'Escreva a sua mensagem.' })

    setEnviando(true)
    const { error } = await supabase.rpc('enviar_mensagem', {
      p_nome: form.nome.trim(),
      p_email: form.email.trim(),
      p_assunto: form.assunto,
      p_mensagem: form.mensagem.trim(),
      p_telefone: form.telefone.trim() || null,
      p_empresa: form.empresa.trim() || null,
    })
    setEnviando(false)
    if (error) return setEstado({ tipo: 'erro', msg: erroAmigavel(error) })

    const primeiro = form.nome.trim().split(' ')[0]
    setEstado({
      tipo: 'ok',
      msg: form.assunto === 'plano_executivo'
        ? `Obrigado, ${primeiro}. Nossa equipe comercial vai responder por e-mail com a proposta e, depois do contrato, com o código de ativação da conta.`
        : `Obrigado, ${primeiro}. Recebemos sua mensagem e vamos responder por e-mail.`,
    })
    setForm({ ...vazio, nome: user ? form.nome : '', email: user ? form.email : '' })
  }

  return (
    <form className="cartao-form" id="contato" onSubmit={enviar} noValidate>
      <h3>Fale com a AeroCar</h3>
      <label htmlFor="ct-assunto">Assunto
        <select id="ct-assunto" name="assunto" value={form.assunto} onChange={mudar}>
          {Object.entries(ASSUNTOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
      </label>
      <label htmlFor="ct-nome">Nome<input id="ct-nome" name="nome" value={form.nome} onChange={mudar} autoComplete="name" required /></label>
      <label htmlFor="ct-email">E-mail<input id="ct-email" name="email" type="email" value={form.email} onChange={mudar} autoComplete="email" required /></label>
      <label htmlFor="ct-telefone">Telefone<input id="ct-telefone" name="telefone" type="tel" inputMode="tel" value={form.telefone} onChange={mudar} autoComplete="tel" placeholder="(11) 91234-5678" maxLength={15} /></label>
      {form.assunto === 'plano_executivo' && (
        <label htmlFor="ct-empresa">Empresa<input id="ct-empresa" name="empresa" value={form.empresa} onChange={mudar} autoComplete="organization" /></label>
      )}
      <label htmlFor="ct-mensagem">Mensagem
        <textarea
          id="ct-mensagem"
          name="mensagem"
          rows={4}
          maxLength={2000}
          value={form.mensagem}
          onChange={mudar}
          placeholder={form.assunto === 'plano_executivo' ? 'Quantos veículos a empresa precisa e para qual operação?' : 'Como podemos ajudar?'}
        />
      </label>
      <button className="btn red" type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar mensagem'}</button>
      {estado.msg && <p className={`aviso ${estado.tipo}`} role="status">{estado.msg}</p>}
    </form>
  )
}
