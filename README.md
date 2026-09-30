# Smart Cabin Safety

A real-time IoT dashboard for the Smart Vehicle Cabin Safety prototype.

## Current hardware

- NodeMCU V3 / ESP8266
- DHT11 temperature and humidity
- MQ-3 alcohol/gas digital detection
- IR object detection
- buzzer
- relay-controlled 12V fan
- 0.96" I2C OLED

PIR and MQ-5 are removed from the current system. MQ-7/CO is also not part of the current hardware.

## Hardware mapping

OLED SDA D2, SCL D1; DHT11 DATA D4; MQ-3 DO D6; IR OUT D0; buzzer D7; fan relay IN D8.

The fan is controlled only by temperature:
- Temperature > 33°C -> fan ON
- Temperature crossing above 33°C -> exactly three buzzer beeps
- IR object detected -> continuous buzzer
- MQ-3 alcohol detected -> continuous buzzer

Use a properly rated relay/driver and a separate regulated 12V power path for the fan. Do not connect the fan directly to an ESP8266 GPIO. Use a suitable protected battery pack/BMS and an appropriate boost converter for a 12V fan.

## Hardware-to-cloud connection

The ESP8266 connects to Wi-Fi and sends live telemetry to:

POST /api/status

The dashboard reads live state from:

GET /api/status

The device sends:
- temperature
- humidity
- MQ-3 status
- IR status
- buzzer status
- fan status
- device heartbeat

The dashboard marks the ESP8266 offline when a device heartbeat has not been received for 10 seconds.

## ESP8266 setup

Open `firmware/esp8266/smart_cabin.ino` and set:

```cpp
#define WIFI_SSID "YOUR_WIFI"
#define WIFI_PASSWORD "YOUR_PASSWORD"
#define API_URL "https://smart-cabin-safety.onrender.com/api/status"
```

Install these Arduino libraries:
- Adafruit GFX Library
- Adafruit SSD1306
- DHT sensor library
- Adafruit Unified Sensor

Board:
NodeMCU 1.0 (ESP-12E Module)

Serial Monitor:
115200 baud

## Dashboard

The frontend polls the backend every 2 seconds and displays the live ESP8266 state.

## Run locally

```bash
npm install
npm run dev
```

## API

GET /api/status
POST /api/status
GET /api/health
