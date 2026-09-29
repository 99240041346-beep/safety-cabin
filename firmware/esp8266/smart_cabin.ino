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

#define DHT_PIN D4
#define DHT_TYPE DHT11
#define PIR_PIN D5
#define MQ3_PIN D6
#define IR_PIN D0
#define BUZZER_PIN D7
#define OLED_SDA D2
#define OLED_SCL D1

// MQ-7: add ADS1115 later. ESP8266 has only one ADC.
#define FAN_RELAY_PIN D8
#define FAN_THRESHOLD 35.0

Adafruit_SSD1306 display(128,64,&Wire,-1);
DHT dht(DHT_PIN,DHT_TYPE);

void show(const String &a,const String &b="",const String &c="",const String &d=""){
 display.clearDisplay();display.setTextColor(WHITE);display.setTextSize(1);display.setCursor(0,0);
 display.println(a);if(b.length())display.println(b);if(c.length())display.println(c);if(d.length())display.println(d);display.display();
}
bool connectWiFi(){
 if(WiFi.status()==WL_CONNECTED)return true;
 WiFi.mode(WIFI_STA);WiFi.begin(WIFI_SSID,WIFI_PASSWORD);
 unsigned long start=millis();show("SMART CABIN SAFETY","Connecting WiFi...");
 while(WiFi.status()!=WL_CONNECTED&&millis()-start<15000){delay(300);yield();}
 return WiFi.status()==WL_CONNECTED;
}
void sendTelemetry(float temperature,float humidity,bool gas,bool motion,bool object,bool alert,bool fan){
 if(!connectWiFi())return;
 BearSSL::WiFiClientSecure client;client.setInsecure();
 HTTPClient http;
 if(!http.begin(client,API_URL))return;
 http.addHeader("Content-Type","application/json");
 String body="{\"device\":\"NodeMCU V3 / ESP8266\",\"source\":\"esp8266\",\"temperature\":"+(isnan(temperature)?String("null"):String(temperature,1))+",\"humidity\":"+(isnan(humidity)?String("null"):String(humidity,0))+",\"mq3\":"+(gas?String("100"):String("0"))+",\"mq7\":null,\"pir\":"+(motion?String("true"):String("false"))+",\"ir\":"+(object?String("true"):String("false"))+",\"buzzer\":"+(alert?String("true"):String("false"))+",\"fan\":"+(fan?String("true"):String("false"))+"}";
 int code=http.POST(body);
 Serial.print("API POST: ");Serial.println(code);
 http.end();
}
void setup(){
 Serial.begin(115200);Wire.begin(OLED_SDA,OLED_SCL);dht.begin();
 pinMode(PIR_PIN,INPUT);pinMode(MQ3_PIN,INPUT);pinMode(IR_PIN,INPUT);
 pinMode(BUZZER_PIN,OUTPUT);pinMode(FAN_RELAY_PIN,OUTPUT);
 digitalWrite(BUZZER_PIN,LOW);digitalWrite(FAN_RELAY_PIN,LOW);
 display.begin(SSD1306_SWITCHCAPVCC,0x3C);
 show("SMART CABIN SAFETY","Booting...");
 connectWiFi();
}
void loop(){
 float temperature=dht.readTemperature(),humidity=dht.readHumidity();
 bool gas=digitalRead(MQ3_PIN)==LOW,motion=digitalRead(PIR_PIN)==HIGH,object=digitalRead(IR_PIN)==LOW;
 bool highTemp=!isnan(temperature)&&temperature>=FAN_THRESHOLD;
 bool alert=gas||motion||object||highTemp;
 digitalWrite(BUZZER_PIN,alert?HIGH:LOW);
 digitalWrite(FAN_RELAY_PIN,highTemp?HIGH:LOW);

 display.clearDisplay();display.setCursor(0,0);display.setTextColor(WHITE);display.setTextSize(1);
 display.println("SMART CABIN SAFETY");display.println("------------------");
 display.print("T:");if(isnan(temperature))display.print("--");else display.print(temperature,1);display.print("C H:");if(isnan(humidity))display.print("--");else display.print(humidity,0);display.println("%");
 display.print("MQ3: ");display.println(gas?"ALERT":"OK");
 display.print("PIR: ");display.println(motion?"MOTION":"CLEAR");
 display.print("IR : ");display.println(object?"OBJECT":"CLEAR");
 display.print("FAN: ");display.println(highTemp?"ON":"OFF");
 display.print("WiFi: ");display.println(WiFi.status()==WL_CONNECTED?"OK":"OFF");
 display.display();

 sendTelemetry(temperature,humidity,gas,motion,object,alert,highTemp);
 delay(3000);
}