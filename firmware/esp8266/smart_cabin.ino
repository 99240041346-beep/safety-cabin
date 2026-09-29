#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

#define WIFI_SSID "YOUR_WIFI"
#define WIFI_PASSWORD "YOUR_PASSWORD"
#define API_URL "http://YOUR_SERVER/api/status"

#define DHT_PIN D4
#define DHT_TYPE DHT11
#define PIR_PIN D5
#define MQ3_PIN D6
#define IR_PIN D0
#define BUZZER_PIN D7
#define OLED_SDA D2
#define OLED_SCL D1

// MQ-7 is intentionally left for the ADS1115 stage because ESP8266 has one ADC.
#define FAN_RELAY_PIN D8
#define FAN_THRESHOLD 35.0

Adafruit_SSD1306 display(128,64,&Wire,-1);
DHT dht(DHT_PIN,DHT_TYPE);

void setup(){
 Serial.begin(115200); Wire.begin(OLED_SDA,OLED_SCL); dht.begin();
 pinMode(PIR_PIN,INPUT); pinMode(MQ3_PIN,INPUT); pinMode(IR_PIN,INPUT);
 pinMode(BUZZER_PIN,OUTPUT); pinMode(FAN_RELAY_PIN,OUTPUT);
 digitalWrite(BUZZER_PIN,LOW); digitalWrite(FAN_RELAY_PIN,LOW);
 display.begin(SSD1306_SWITCHCAPVCC,0x3C);
 WiFi.begin(WIFI_SSID,WIFI_PASSWORD);
 display.clearDisplay();display.setTextColor(WHITE);display.setTextSize(1);display.setCursor(0,0);display.println("SMART CABIN SAFETY");display.println("Connecting WiFi...");display.display();
 while(WiFi.status()!=WL_CONNECTED){delay(500);Serial.print(".");}
}

void loop(){
 float temperature=dht.readTemperature(); float humidity=dht.readHumidity();
 bool gas=digitalRead(MQ3_PIN)==LOW; bool motion=digitalRead(PIR_PIN)==HIGH; bool object=digitalRead(IR_PIN)==LOW;
 bool highTemp=!isnan(temperature)&&temperature>=FAN_THRESHOLD;
 bool alert=gas||motion||object||highTemp;
 digitalWrite(BUZZER_PIN,alert?HIGH:LOW); digitalWrite(FAN_RELAY_PIN,highTemp?HIGH:LOW);
 display.clearDisplay();display.setCursor(0,0);display.println("SMART CABIN SAFETY");display.println("------------------");
 display.print("T:");display.print(temperature,1);display.print("C H:");display.print(humidity,0);display.println("%");
 display.print("MQ3: ");display.println(gas?"ALERT":"OK");
 display.print("PIR: ");display.println(motion?"MOTION":"CLEAR");
 display.print("IR : ");display.println(object?"OBJECT":"CLEAR");
 display.print("FAN: ");display.println(highTemp?"ON":"OFF");
 display.print("STATUS: ");display.println(alert?"WARNING":"SAFE");display.display();

 if(WiFi.status()==WL_CONNECTED){
   WiFiClient client; HTTPClient http; http.begin(client,API_URL); http.addHeader("Content-Type","application/json");
   String body="{\"temperature\":"+String(temperature,1)+",\"humidity\":"+String(humidity,0)+",\"mq3\":"+(gas?"100":"0")+",\"pir\":"+(motion?"true":"false")+",\"ir\":"+(object?"true":"false")+",\"buzzer\":"+(alert?"true":"false")+",\"fan\":"+(highTemp?"true":"false")+"}";
   http.POST(body); http.end();
 }
 delay(3000);
}