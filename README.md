<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:1E2535,100:222F4B&height=160&section=header&text=AeroCar&fontSize=65&fontColor=EFE4DC&animation=fadeIn&fontAlignY=38&desc=O%20tr%C3%A2nsito%20fica%20embaixo&descSize=20&descAlignY=58&descColor=DB0B15" />

<br/>

[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![ESP32](https://img.shields.io/badge/ESP32_·_Wokwi-E7352C?style=for-the-badge&logo=espressif&logoColor=white)](https://wokwi.com/projects/481503598291543041)
[![CSS](https://img.shields.io/badge/CSS-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)

<br/>

[![Projeto Integrador](https://img.shields.io/badge/◈%20Projeto%20Integrador-Fábrica%20do%20Futuro-DB0B15?style=for-the-badge)](https://github.com/carloshenrique54/AeroCar)

</div>

---

## ◈ Visão Geral

O **AeroCar** é um carro voador pessoal com **telemetria em tempo real**. Este repositório reúne o site de divulgação e a plataforma em que o proprietário acompanha cada voo, do plano de voo ao pouso.

Quem usa carro em São Paulo passa, em média, **2h28 por dia** em deslocamentos (Rede Nossa São Paulo / Ipec, *Viver em SP 2024 – Mobilidade Urbana*). O AeroCar tira as pessoas do trânsito, e a plataforma resolve o desafio que vem junto: acompanhar com segurança a **altitude**, a **estabilidade** e a **bateria** de um veículo aéreo pessoal.

O veículo é simulado por um **ESP32 no Wokwi**, que lê os sensores e envia as leituras para a plataforma a cada segundo.

---

## ✦ Funcionalidades

| ◆ Módulo | › Descrição |
|----------|-------------|
| `[ Site de Divulgação ]` | Problemática, solução, como funciona, missão e pedido de demonstração |
| `[ Contas ]` | Cadastro com conta Pessoal ou plano Executivo |
| `[ Vínculo do Veículo ]` | O proprietário vincula o AeroCar com matrícula e código de ativação |
| `[ Plano de Voo ]` | Origem, destino e altitude máxima registrados antes da decolagem |
| `[ Cabine em Tempo Real ]` | Altitude, inclinação e bateria ao vivo, com gráficos e legenda |
| `[ Alertas de Segurança ]` | Bateria crítica, altitude acima do plano e inclinação acima de 30° |
| `[ Histórico de Voos ]` | Duração, altitude máxima, bateria final, alertas e filtros |
| `[ Gestão de Frotas ]` | Frotas, veículos, gerentes e pilotos no plano Executivo |
| `[ Interface Responsiva ]` | Layout adaptado a computador, tablet e celular |

---

## ◇ Contas e Papéis

| ◆ Papel | › Quem é | › O que vê e faz |
|---------|----------|------------------|
| `[ Pessoal ]` | Dono de um AeroCar | O próprio veículo e os próprios voos |
| `[ Titular ]` | Dono da conta no plano Executivo | Cria frotas, vincula veículos, cadastra gerentes e pilotos, vê tudo |
| `[ Gerente ]` | Membro da conta Executiva | Veículos e voos da sua frota; cadastra pilotos e designa veículos |
| `[ Piloto ]` | Membro da conta Executiva | Apenas o veículo designado para ele; planeja e faz os próprios voos |

As permissões ficam no próprio banco (Row Level Security), não só na interface.

---

## ◎ Stack Tecnológica

```
◆ Frontend      →  React 18.3.1 + Vite 5.4
◆ Roteamento    →  React Router DOM 6.30
◆ Backend       →  Supabase (Auth, PostgreSQL, Realtime)
◆ Cliente       →  @supabase/supabase-js 2
◆ Segurança     →  Row Level Security + funções no PostgreSQL
◆ Gráficos      →  SVG próprio, sem biblioteca externa
◆ Estilização   →  CSS
◆ Veículo       →  ESP32 simulado no Wokwi
```

---

## ⌁ Veículo no Wokwi

```
◆ HC-SR04        →  Altitude em relação ao solo (escala 1 cm = 1 m)
◆ MPU6050        →  Inclinação do veículo, pela aceleração (X e Y)
◆ Potenciômetro  →  Carga da bateria, de 0 a 100%
◆ Servo          →  Ângulo dos rotores, compensa a inclinação
◆ Buzzer         →  Alerta sonoro na cabine
```

```
ESP32  ─›  HTTPS (keep-alive)  ─›  enviar_telemetria()  ─›  PostgreSQL
                                                              │
Painel  ‹─  Realtime + conferência periódica  ‹───────────────┘
```

A cada segundo o ESP32 envia altitude, inclinação e bateria, identificado pelo **token do dispositivo**. A resposta traz a altitude máxima do plano de voo registrado no site. O código está em [`wokwi/sketch.ino`](./wokwi/sketch.ino) e o projeto pode ser aberto [no Wokwi](https://wokwi.com/projects/481503598291543041).

---

## ▸ Como Executar Localmente

**Pré-requisitos:** Node.js `v18+`, npm e um projeto no [Supabase](https://supabase.com/).

```bash
# › Clone o repositório
git clone https://github.com/carloshenrique54/AeroCar.git

# › Acesse o diretório
cd AeroCar

# › Instale as dependências
npm install
```

Crie o arquivo `.env` na raiz com os dados do Supabase (*Project Settings › API*):

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

```bash
# › Inicie o servidor de desenvolvimento
npm run dev
```

O projeto estará disponível em `http://localhost:5173`

```bash
# › Build para produção
npm run build

# › Pré-visualizar o build
npm run preview
```

**Banco de dados:** os scripts SQL (esquema, atualizações e dados de demonstração) são executados no *SQL Editor* do Supabase e ficam fora deste repositório.

---

## ◫ Banco de Dados

| ◆ Tabela | › O que guarda |
|----------|----------------|
| `perfis` | Nome, telefone e tipo de conta |
| `veiculos` | Matrícula, apelido, status, bateria, sinal, frota e piloto designado |
| `frotas` | Frotas da conta Executiva e base de operação |
| `membros` | Gerentes e pilotos, com frota e situação na equipe |
| `voos` | Plano de voo e execução |
| `telemetria` | Leituras de altitude, inclinação e bateria |
| `alertas` | Alertas gerados durante o voo |
| `demonstracoes` | Pedidos de demonstração vindos do site |

---

## ◉ Estrutura do Projeto

```
AeroCar/
├── public/                ◆ Favicon e ícones
├── src/
│   ├── assets/            ◆ Imagem do AeroCar
│   ├── components/        ◆ Cabeçalho, cena, gráficos, medidores, gestão
│   ├── context/           ◆ Sessão, perfil e papel do usuário
│   ├── lib/               ◆ Supabase, formatação, máscaras e sinal
│   ├── pages/             ◆ Site, entrar e cadastro
│   │   └── painel/        ◆ Veículos, frotas, equipe, voo, histórico, conta
│   ├── App.jsx            ◆ Rotas
│   └── styles.css         ◆ Identidade visual
├── wokwi/
│   ├── sketch.ino         ◆ Computador de bordo (ESP32)
│   └── libraries.txt      ◆ Bibliotecas do Wokwi
├── index.html
├── package.json           ◆ Dependências e scripts
└── README.md
```

---

## ◐ Identidade Visual

| ◆ Cor | › Uso |
|-------|-------|
| `#222F4B` | Sofisticação e leveza · fundo principal |
| `#1E2535` | Profundidade e confiança · seções e cartões |
| `#303C56` | Tecnologia e clareza · apoio |
| `#DB0B15` | Energia e velocidade · destaques e alertas |
| `#EFE4DC` | Suavidade e conforto · textos e áreas claras |

Tipografia: **Open Sans** em textos e interface, **Boldonse** no logotipo.

---

## ◆ Equipe

<div align="center">

| `[ Dev ]` Carlos Henrique |
|:---:|

</div>

---

## → Links

<div align="center">

[![Repositório](https://img.shields.io/badge/GitHub-Repositório-181717?style=for-the-badge&logo=github)](https://github.com/carloshenrique54/AeroCar)
[![Wokwi](https://img.shields.io/badge/Wokwi-Simulação_do_Veículo-222F4B?style=for-the-badge)](https://wokwi.com/projects/481503598291543041)

</div>

---

## ◈ Sobre

Projeto acadêmico desenvolvido para o **Projeto Integrador Fábrica do Futuro**.

<div align="center">
<br/>
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:222F4B,100:1E2535&height=100&section=footer" />
</div>
