/*
  AeroCar — Computador de bordo (ESP32)
  Projeto Integrador Fábrica do Futuro · Projeto 02

  Componentes:
    - HC-SR04  -> altitude em relação ao solo (escala 1 cm = 1 m)
    - MPU6050  -> inclinação do veículo, em graus
    - Potenciômetro -> carga da bateria, de 0 a 100%
    - Servo motor   -> ângulo dos rotores
    - Buzzer        -> alerta sonoro na cabine

  Regras de alerta (no veículo):
    - Bateria <= 20%            -> CRÍTICO: recomenda POUSO IMEDIATO (bipe rápido)
    - Bateria <= 35%            -> atenção: bateria baixa (bipe lento)
    - Inclinação > 30°          -> atenção: inclinação insegura (bipe lento)
    - Altitude > altitude máx.  -> atenção: acima do plano de voo (bipe lento)

  Plataforma:
    A cada 1 s o ESP32 envia altitude, inclinação e bateria para a plataforma
    AeroCar (Supabase, função enviar_telemetria), identificado pelo token do
    dispositivo. A resposta diz se há um voo em andamento e qual é a altitude
    máxima do plano de voo registrado no site.
*/

#include <Wire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ESP32Servo.h>

// ---------- Conexão com a plataforma ----------
const char* WIFI_SSID         = "Wokwi-GUEST";
const char* WIFI_SENHA        = "";
const char* SUPABASE_URL      = "https://SEU-PROJETO.supabase.co";   // mesmo valor de VITE_SUPABASE_URL
const char* SUPABASE_ANON_KEY = "SUA-CHAVE-ANON";                    // mesmo valor de VITE_SUPABASE_ANON_KEY

// ---------- Identificação do veículo ----------
const char* VEICULO           = "AC-001";
const char* TOKEN_DISPOSITIVO = "ac001-7f3k9q2m8x";   // painel > Configuração do dispositivo

// ---------- Pinos ----------
const int PIN_TRIG   = 5;
const int PIN_ECHO   = 18;
const int PIN_BAT    = 34;   // potenciômetro (entrada analógica)
const int PIN_SERVO  = 13;
const int PIN_BUZZER = 26;
// MPU6050 no I2C padrão do ESP32: SDA = 21, SCL = 22

// ---------- Plano de voo ----------
// Valor padrão até a plataforma informar o plano registrado no site
float altitudeMaxM = 300.0;
bool  emVoo        = false;
bool  plataformaOk = false;
String alertaPlataforma = "";

// ---------- Limites de segurança ----------
const int   BAT_CRITICA     = 20;    // %
const int   BAT_BAIXA       = 35;    // %
const float INCLINACAO_MAX  = 30.0;  // graus

Adafruit_MPU6050 mpu;
Servo rotor;
bool mpuOk = false;

enum Estado { NORMAL, ATENCAO, CRITICO };

// ---------- Leituras ----------
float lerAltitudeMetros() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  long duracao = pulseIn(PIN_ECHO, HIGH, 30000);  // timeout ~ 5 m
  if (duracao == 0) return -1;                    // sem leitura
  float cm = duracao * 0.0343 / 2.0;
  return cm;                                      // escala do projeto: 1 cm = 1 m
}

int lerBateriaPercentual() {
  int bruto = analogRead(PIN_BAT);                // 0 a 4095
  return map(bruto, 0, 4095, 0, 100);
}

void lerInclinacao(float &pitch, float &roll) {
  pitch = 0; roll = 0;
  if (!mpuOk) return;
  sensors_event_t a, g, t;
  mpu.getEvent(&a, &g, &t);
  float ax = a.acceleration.x, ay = a.acceleration.y, az = a.acceleration.z;
  pitch = atan2(-ax, sqrt(ay * ay + az * az)) * 180.0 / PI;
  roll  = atan2(ay, az) * 180.0 / PI;
}

// ---------- Plataforma ----------
void conectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Conectando ao Wi-Fi");
  WiFi.begin(WIFI_SSID, WIFI_SENHA, 6);
  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 10000) {
    delay(250);
    Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " conectado" : " sem conexão, tentando de novo depois");
}

// Lê um campo simples da resposta JSON ("campo":valor)
String campoJSON(const String &json, const char* campo) {
  String chave = String("\"") + campo + "\":";
  int i = json.indexOf(chave);
  if (i < 0) return "";
  i += chave.length();
  if (json.charAt(i) == '"') {
    int fim = json.indexOf('"', i + 1);
    return json.substring(i + 1, fim);
  }
  int fim = i;
  while (fim < (int)json.length() && json.charAt(fim) != ',' && json.charAt(fim) != '}') fim++;
  return json.substring(i, fim);
}

// Conexão HTTPS mantida aberta entre os envios (keep-alive): sem isso, cada
// envio refaz o handshake TLS, que no simulador leva alguns segundos.
WiFiClientSecure cliente;
HTTPClient http;
unsigned long duracaoEnvioMs = 0;

void enviarTelemetria(float altitude, float inclinacao, int bateria) {
  if (WiFi.status() != WL_CONNECTED) {
    plataformaOk = false;
    conectarWiFi();
    return;
  }

  unsigned long inicio = millis();
  String url = String(SUPABASE_URL) + "/rest/v1/rpc/enviar_telemetria";
  if (!http.begin(cliente, url)) {
    plataformaOk = false;
    return;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  String corpo = String("{\"p_token\":\"") + TOKEN_DISPOSITIVO +
                 "\",\"p_altitude\":" + String(altitude < 0 ? 0 : altitude, 1) +
                 ",\"p_inclinacao\":" + String(inclinacao, 1) +
                 ",\"p_bateria\":" + String(bateria) + "}";

  int status = http.POST(corpo);
  if (status == 200) {
    String resposta = http.getString();
    plataformaOk = campoJSON(resposta, "ok") == "true";
    emVoo = campoJSON(resposta, "em_voo") == "true";
    String alt = campoJSON(resposta, "altitude_max");
    if (alt.length() && alt != "null") altitudeMaxM = alt.toFloat();
    String alerta = campoJSON(resposta, "alerta");
    alertaPlataforma = (alerta == "null") ? "" : alerta;
  } else {
    plataformaOk = false;
    Serial.print("Falha ao enviar telemetria. HTTP ");
    Serial.println(status);
  }
  http.end();   // com setReuse(true), a conexão continua aberta para o próximo envio
  duracaoEnvioMs = millis() - inicio;
}

// ---------- Saída no terminal ----------
// true  -> uma linha JSON por leitura
// false -> painel visual no Serial Monitor (para a apresentação)
const bool MODO_JSON = false;

const char* nomeEstado(Estado e) {
  return e == NORMAL ? "normal" : (e == ATENCAO ? "atencao" : "critico");
}

// Barra de progresso: [██████░░░░░░]
String barra(float valor, float maximo, int largura) {
  int cheios = constrain((int)round(valor / maximo * largura), 0, largura);
  String s = "[";
  for (int i = 0; i < largura; i++) s += (i < cheios) ? "█" : "░";
  s += "]";
  return s;
}

// Número com largura fixa, alinhado à direita
String fixo(float valor, int casas, int largura) {
  String s = String(valor, casas);
  while ((int)s.length() < largura) s = " " + s;
  return s;
}

String tempoLigado() {
  unsigned long s = millis() / 1000;
  char buf[9];
  snprintf(buf, sizeof(buf), "%02lu:%02lu", (s / 60) % 100, s % 60);
  return String(buf);
}

void imprimirJSON(float altitude, float inclinacao, int bateria, int rotorGraus,
                  Estado estado, const String &alerta) {
  Serial.print("{\"veiculo\":\"");        Serial.print(VEICULO);
  Serial.print("\",\"altitude_m\":");     Serial.print(altitude, 1);
  Serial.print(",\"inclinacao_graus\":"); Serial.print(inclinacao, 1);
  Serial.print(",\"bateria_pct\":");      Serial.print(bateria);
  Serial.print(",\"rotor_graus\":");      Serial.print(rotorGraus);
  Serial.print(",\"estado\":\"");         Serial.print(nomeEstado(estado));
  Serial.print("\",\"alerta\":\"");       Serial.print(alerta);
  Serial.print("\",\"em_voo\":");         Serial.print(emVoo ? "true" : "false");
  Serial.print(",\"plataforma\":");       Serial.print(plataformaOk ? "true" : "false");
  Serial.println("}");
}

void imprimirPainel(float altitude, float inclinacao, int bateria, int rotorGraus,
                    Estado estado, const String &alerta) {
  Serial.println();
  Serial.println("┌──────────────────────────────────────────────────────");
  Serial.print  ("│  ✈  AEROCAR · TELEMETRIA     ");
  Serial.print  (VEICULO);
  Serial.print  ("     ligado há ");
  Serial.println(tempoLigado());
  Serial.print  ("│  Plataforma  ");
  if (!plataformaOk)  Serial.println("sem conexão");
  else {
    Serial.print(emVoo ? "conectado · EM VOO, enviando telemetria" : "conectado · em solo, aguardando decolagem");
    Serial.print("  (envio em ");
    Serial.print(duracaoEnvioMs);
    Serial.println(" ms)");
  }
  Serial.println("├──────────────────────────────────────────────────────");

  // Altitude
  Serial.print("│  Altitude    ");
  if (altitude < 0) {
    Serial.println("   --- m   sem leitura do sensor");
  } else {
    Serial.print(fixo(altitude, 1, 6)); Serial.print(" m   ");
    Serial.print(barra(altitude, altitudeMaxM, 16));
    Serial.print("  teto do plano: "); Serial.print((int)altitudeMaxM); Serial.println(" m");
  }

  // Inclinação
  Serial.print("│  Inclinação  ");
  Serial.print(fixo(inclinacao, 1, 6)); Serial.print(" °   ");
  Serial.print(barra(inclinacao, 90, 16));
  Serial.print("  limite: "); Serial.print((int)INCLINACAO_MAX); Serial.println("°");

  // Bateria
  Serial.print("│  Bateria     ");
  Serial.print(fixo(bateria, 0, 6)); Serial.print(" %   ");
  Serial.print(barra(bateria, 100, 16));
  Serial.print("  crítica: "); Serial.print(BAT_CRITICA); Serial.println("%");

  // Rotores
  Serial.print("│  Rotores     ");
  Serial.print(fixo(rotorGraus, 0, 6)); Serial.println(" °");

  Serial.println("├──────────────────────────────────────────────────────");

  // Estado e alerta
  Serial.print("│  Estado      ");
  if (estado == NORMAL)       Serial.println("🟢 NORMAL");
  else if (estado == ATENCAO) Serial.println("🟡 ATENÇÃO");
  else                        Serial.println("🔴 CRÍTICO");

  Serial.print("│  Alerta      ");
  if (estado == NORMAL)       Serial.println("nenhum, voo seguro");
  else if (estado == CRITICO) Serial.println("⚠ BATERIA CRÍTICA: POUSO IMEDIATO");
  else {
    Serial.print("⚠ ");
    Serial.println(alerta);
  }
  if (alertaPlataforma.length()) {
    Serial.print("│  Plataforma  ");
    Serial.println(alertaPlataforma);
  }
  Serial.println("└──────────────────────────────────────────────────────");
}

// ---------- Buzzer sem travar o loop ----------
void atualizarBuzzer(Estado estado) {
  static unsigned long ultimo = 0;
  static bool ligado = false;
  unsigned long agora = millis();

  if (estado == NORMAL) {
    noTone(PIN_BUZZER);
    ligado = false;
    return;
  }

  unsigned long intervalo = (estado == CRITICO) ? 150 : 600;
  int frequencia          = (estado == CRITICO) ? 2000 : 1000;

  if (agora - ultimo >= intervalo) {
    ultimo = agora;
    ligado = !ligado;
    if (ligado) tone(PIN_BUZZER, frequencia);
    else        noTone(PIN_BUZZER);
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  analogReadResolution(12);

  rotor.setPeriodHertz(50);
  rotor.attach(PIN_SERVO, 500, 2400);
  rotor.write(90);

  Wire.begin(21, 22);
  mpuOk = mpu.begin();
  if (mpuOk) {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  } else {
    Serial.println("{\"erro\":\"MPU6050 nao encontrado\"}");
  }

  Serial.println("\n══════════  AEROCAR · sistema de telemetria iniciado  ══════════");
  cliente.setInsecure();   // sem verificação de certificado no simulador
  http.setReuse(true);     // mantém a conexão aberta entre os envios
  http.setTimeout(3000);
  conectarWiFi();
}

void loop() {
  static unsigned long ultimoEnvio = 0;
  static Estado estado = NORMAL;
  static String alerta = "nenhum";

  // Leitura, decisão e envio a cada 1 s
  if (millis() - ultimoEnvio >= 1000) {
    ultimoEnvio = millis();

    float altitude = lerAltitudeMetros();
    int bateria = lerBateriaPercentual();
    float pitch, roll;
    lerInclinacao(pitch, roll);
    float inclinacao = max(fabs(pitch), fabs(roll));

    // Avaliação de segurança (o mais grave vence)
    estado = NORMAL;
    alerta = "nenhum";
    if (emVoo && altitude > altitudeMaxM) { estado = ATENCAO; alerta = "acima da altitude do plano de voo"; }
    if (inclinacao > INCLINACAO_MAX)      { estado = ATENCAO; alerta = "inclinação acima do limite"; }
    if (bateria <= BAT_BAIXA)             { estado = ATENCAO; alerta = "bateria baixa"; }
    if (bateria <= BAT_CRITICA)           { estado = CRITICO; alerta = "bateria crítica - POUSO IMEDIATO"; }

    // Ângulo dos rotores: compensa a inclinação; em pouso imediato volta ao nível (90°)
    int anguloRotor;
    if (estado == CRITICO) {
      anguloRotor = 90;
    } else {
      anguloRotor = constrain(90 - (int)pitch, 45, 135);
    }
    rotor.write(anguloRotor);

    enviarTelemetria(altitude, inclinacao, bateria);

    if (MODO_JSON) {
      imprimirJSON(altitude, inclinacao, bateria, anguloRotor, estado, alerta);
    } else {
      imprimirPainel(altitude, inclinacao, bateria, anguloRotor, estado, alerta);
    }
  }

  atualizarBuzzer(estado);
}
