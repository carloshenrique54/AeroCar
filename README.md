# AeroCar

Site e plataforma do AeroCar, o carro voador pessoal com telemetria em tempo real.
React (Vite) + Supabase (Auth, Postgres, Realtime).

## Como rodar

1. No Supabase, rode no SQL Editor o esquema inicial e depois as atualizações, na ordem
   (os arquivos SQL ficam fora deste repositório).
2. Em **Authentication > Sign In / Providers > Email**, desligue *Confirm email* se quiser
   que o cadastro entre direto no painel.
3. Em **Authentication > URL Configuration**, coloque `http://localhost:5173` em *Site URL*.
4. Crie o `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Project Settings > API).
5. `npm install` e `npm run dev`.

## Fluxo de uso

1. **Site** (`/`): divulgação do AeroCar. Quem ainda não tem o carro pede uma demonstração
   (grava em `demonstracoes`). Quem já tem cria a conta.
2. **Cadastro** (`/cadastro`): plano único, **Executivo**, incluso com o veículo.
3. **Vincular veículo** (painel): matrícula + código de ativação que vêm com o carro
   (função `vincular_veiculo`). Uma conta pode ter vários veículos.
4. **Veículo conectado**: o computador de bordo (ESP32, pasta `wokwi/`) envia altitude,
   inclinação e bateria a cada 1 s pela função `enviar_telemetria`, usando o token do
   dispositivo. O painel mostra "Conectado" e a bateria ao vivo.
5. **Plano de voo** (`/painel/voos/novo`): veículo, origem, destino e altitude máxima.
   A altitude máxima volta para o veículo na resposta de cada envio.
6. **Cabine** (`/painel/voos/:id`): *Decolar* só libera com o veículo com sinal e bateria
   acima de 30%. Em voo, cada leitura entra em `telemetria` e o banco gera os alertas:
   bateria em 20% ou menos, altitude acima do plano, inclinação acima de 30°.
   *Registrar pouso* encerra o voo; se houve bateria crítica, fica marcado como emergência.
7. **Histórico** e **Conta**.

## Contas e papéis

| Papel    | Quem é                                | O que vê e faz                                              |
|----------|---------------------------------------|-------------------------------------------------------------|
| Pessoal  | dono de um AeroCar                    | o próprio veículo e os próprios voos                        |
| Titular  | dono da conta no plano Executivo      | todas as frotas, veículos, voos e a equipe                  |
| Gerente  | membro da conta Executiva             | veículos e todos os voos da sua frota; registra pousos      |
| Piloto   | membro da conta Executiva             | veículos da sua frota; planeja e faz os próprios voos       |

As regras ficam no banco (RLS + funções `pode_ver_veiculo`, `pode_gerir_veiculo`,
`pode_ver_voo`), e `minha_conta()` diz ao site qual é o papel de quem entrou.

## Veículos de fábrica

| Matrícula | Código de ativação | Observação                |
|-----------|--------------------|---------------------------|
| AC-001    | AERO01             | ligado ao sketch do Wokwi |
| AC-002    | AERO02             |                           |
| AC-003    | AERO03             |                           |

Para ter mais de um veículo transmitindo, abra outra cópia do projeto no Wokwi e troque
`VEICULO` e `TOKEN_DISPOSITIVO` pelos dados de outra matrícula (o token aparece no painel,
em "Configuração do dispositivo").

## Estrutura

```
src/
  components/   Header, Footer, Logo, CityScene, LineChart, Medidores, PainelLayout, VincularVeiculo
  context/      AuthContext (sessão e perfil)
  lib/          supabase.js, format.js, sinal.js
  pages/        Home, Entrar, Cadastro
  pages/painel/ Visao, NovoVoo, Voo, Historico, Equipe, Conta
wokwi/
  sketch.ino, libraries.txt
```
