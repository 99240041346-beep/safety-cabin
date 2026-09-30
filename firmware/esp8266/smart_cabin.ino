#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecureBearSSL.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

#define WIFI_SSID "YOUR_WIFI"
#define WIFI_PASSWORD "YOUR_PASSWORD"
#define API_URL "https://smart-cabin-safety.onrender.com/api/status"

#define OLED_SDA D2
#define OLED_SCL D1

#define DHT_PIN D4
#define DHT_TYPE DHT11

#define IR_PIN D0
#define MQ3_PIN D6
#define BUZZER_PIN D7
#define RELAY_PIN D8

#define TEMP_LIMIT 33.0
#define RELAY_ACTIVE_LOW true

Adafruit_SSD1306 display(128, 64, &Wire, -1);
DHT dht(DHT_PIN, DHT_TYPE);

bool previousTemperatureHigh = false;
bool tempBeepActive = false;
bool buzzerState = false;
int tempBeepCount = 0;

unsigned long beepTimer = 0;
unsigned long telemetryTimer = 0;
unsigned long displayTimer = 0;

const unsigned long BEEP_ON_TIME = 250;
const unsigned long BEEP_OFF_TIME = 250;
const unsigned long TELEMETRY_INTERVAL = 3000;
const unsigned long DISPLAY_INTERVAL = 1000;

void fanOn() {
  digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? LOW : HIGH);
}

void fanOff() {
  digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? HIGH : LOW);
}

void buzzerOn() {
  digitalWrite(BUZZER_PIN, HIGH);
  buzzerState = true;
}

void buzzerOff() {
  digitalWrite(BUZZER_PIN, LOW);
  buzzerState = false;
}

bool connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 12000) {
    delay(250);
    yield();
  }

  return WiFi.status() == WL_CONNECTED;
}

void startTemperatureAlarm() {
  tempBeepActive = true;
  tempBeepCount = 0;
  buzzerOn();
  beepTimer = millis();
}

void updateTemperatureBeep() {
  if (!tempBeepActive) return;

  unsigned long now = millis();

  if (buzzerState) {
    if (now - beepTimer >= BEEP_ON_TIME) {
      buzzerOff();
      beepTimer = now;
      tempBeepCount++;
    }
  } else {
    if (tempBeepCount >= 3) {
      tempBeepActive = false;
      return;
    }

    if (now - beepTimer >= BEEP_OFF_TIME) {
      buzzerOn();
      beepTimer = now;
    }
  }
}

void sendTelemetry(float temperature, float humidity, bool alcoholDetected,
                   bool objectDetected, bool fanOnState, bool buzzerOnState) {
  if (!connectWiFi()) {
    Serial.println("WiFi: OFFLINE");
    return;
  }

  BearSSL::WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, API_URL)) {
    Serial.println("API: BEGIN FAILED");
    return;
  }

  http.addHeader("Content-Type", "application/json");

  String body = "{";
  body += "\"device\":\"NodeMCU V3 / ESP8266\",";
  body += "\"source\":\"esp8266\",";
  body += "\"temperature\":";
  body += isnan(temperature) ? "null" : String(temperature, 1);
  body += ",\"humidity\":";
  body += isnan(humidity) ? "null" : String(humidity, 0);
  body += ",\"mq3\":";
  body += alcoholDetected ? "100" : "0";
  body += ",\"ir\":";
  body += objectDetected ? "true" : "false";
  body += ",\"buzzer\":";
  body += buzzerOnState ? "true" : "false";
  body += ",\"fan\":";
  body += fanOnState ? "true" : "false";
  body += "}";

  int code = http.POST(body);

  Serial.print("API POST: ");
  Serial.println(code);

  if (code > 0) {
    Serial.println(http.getString());
  }

  http.end();
}

void setup() {
  Serial.begin(115200);

  Wire.begin(OLED_SDA, OLED_SCL);
  dht.begin();

  pinMode(IR_PIN, INPUT);
  pinMode(MQ3_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);

  buzzerOff();
  fanOff();

  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("SMART CABIN SAFETY");
  display.println("Connecting WiFi...");
  display.display();

  connectWiFi();

  Serial.println();
  Serial.println("=== SMART CABIN SAFETY ===");
  Serial.println("PIR  : REMOVED");
  Serial.println("MQ-5 : REMOVED");
  Serial.println("MQ-7 : REMOVED");
  Serial.println("DHT11: ACTIVE");
  Serial.println("MQ-3 : ACTIVE");
  Serial.println("IR   : ACTIVE");
  Serial.println("FAN  : TEMP > 33C");
  Serial.println("API  : LIVE");
}

void loop() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  bool objectDetected = (digitalRead(IR_PIN) == LOW);
  bool alcoholDetected = (digitalRead(MQ3_PIN) == LOW);

  bool temperatureHigh = !isnan(temperature) && temperature > TEMP_LIMIT;
  bool continuousAlarm = objectDetected || alcoholDetected;

  // Fan is controlled ONLY by temperature.
  if (temperatureHigh) fanOn();
  else fanOff();

  // Start exactly three beeps when temperature crosses above 33C.
  if (temperatureHigh && !previousTemperatureHigh) {
    startTemperatureAlarm();
  }
  previousTemperatureHigh = temperatureHigh;

  // IR/alcohol has continuous buzzer priority.
  if (continuousAlarm) {
    tempBeepActive = false;
    buzzerOn();
  } else if (tempBeepActive) {
    updateTemperatureBeep();
  } else {
    buzzerOff();
  }

  if (millis() - displayTimer >= DISPLAY_INTERVAL) {
    displayTimer = millis();

    display.clearDisplay();
    display.setTextColor(WHITE);
    display.setTextSize(1);
    display.setCursor(0, 0);

    display.println("SMART CABIN SAFETY");
    display.println("------------------");

    display.print("T: ");
    if (isnan(temperature)) display.print("--");
    else display.print(temperature, 1);
    display.print("C  H: ");
    if (isnan(humidity)) display.print("--");
    else display.print(humidity, 0);
    display.println("%");

    display.print("MQ3: ");
    display.println(alcoholDetected ? "ALERT" : "NORMAL");

    display.print("IR : ");
    display.println(objectDetected ? "OBJECT" : "CLEAR");

    display.print("FAN: ");
    display.println(temperatureHigh ? "ON" : "OFF");

    display.print("BUZ: ");
    display.println(buzzerState ? "ON" : "OFF");

    display.print("WiFi: ");
    display.println(WiFi.status() == WL_CONNECTED ? "OK" : "OFF");

    display.display();
  }

  if (millis() - telemetryTimer >= TELEMETRY_INTERVAL) {
    telemetryTimer = millis();

    sendTelemetry(
      temperature,
      humidity,
      alcoholDetected,
      objectDetected,
      temperatureHigh,
      buzzerState
    );

    Serial.print("T=");
    Serial.print(temperature);
    Serial.print(" H=");
    Serial.print(humidity);
    Serial.print(" MQ3=");
    Serial.print(alcoholDetected ? "ALERT" : "OK");
    Serial.print(" IR=");
    Serial.print(objectDetected ? "OBJECT" : "CLEAR");
    Serial.print(" FAN=");
    Serial.print(temperatureHigh ? "ON" : "OFF");
    Serial.print(" BUZ=");
    Serial.println(buzzerState ? "ON" : "OFF");
  }

  yield();
}
