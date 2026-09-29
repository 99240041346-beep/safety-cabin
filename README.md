# Smart Cabin Safety

A Blynk-style IoT dashboard for a vehicle cabin safety prototype.

## Monitored
- DHT11 temperature and humidity
- MQ-3 gas/alcohol
- MQ-7 carbon monoxide
- PIR motion
- IR object detection
- Buzzer
- 12V fan
- ESP8266 connection

## Hardware mapping
OLED SDA D2, SCL D1; DHT11 D4; PIR D5; MQ-3 DO D6; IR D0; buzzer D7.

**MQ-7:** use an ADS1115 external ADC for analog measurement because ESP8266 has only one ADC input.

**Fan:** use a properly rated relay/driver and a separate regulated 12V power path. Do not connect the fan directly to an ESP8266 GPIO. The 4-cell battery pack must be integrated later with a suitable 4S BMS/charger and regulation.

## Dashboard
The frontend currently runs with simulated live values so the UI can be tested before hardware networking is connected.

## Run
```bash
npm install
npm run dev
```

Open the Vite address shown in the terminal.

## API
GET /api/status
POST /api/status
GET /api/health

Set WIFI_SSID, WIFI_PASSWORD and API_URL in firmware before flashing the ESP8266.