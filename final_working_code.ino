#include <SPI.h>
#include <MFRC522.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

#define RST_PIN D3  // RC522 Reset
#define SS_PIN D4   // RC522 SPI SS

MFRC522 rfid(SS_PIN, RST_PIN);

// WiFi Settings
const char* ssid = "";
const char* password = "";
const String serverURL = "http://"Your Ip address":8000/rfid-login";  

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected! IP: " + WiFi.localIP().toString());

  // Initialize RFID
  SPI.begin();
  rfid.PCD_Init();
  Serial.println("RFID Ready");
}

void loop() {
  // Check for RFID tag
  if (!rfid.PICC_IsNewCardPresent()) return;
  
  if (rfid.PICC_ReadCardSerial()) {
    String tagUID = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      tagUID += String(rfid.uid.uidByte[i], DEC);
    }
    
    Serial.println("Scanned Tag: " + tagUID);

    // Send to backend server
    if (tagUID == "22721112346") {
      WiFiClient client;
      HTTPClient http;
      
      http.begin(client, serverURL);
      http.addHeader("Content-Type", "application/json");
      
      // Manual JSON formatting
      String payload = "{\"tag\":\"" + tagUID + "\"}";
      
      int httpCode = http.POST(payload);
      
      if (httpCode == HTTP_CODE_OK) {
        Serial.println("RFID login successful!");
      } else {
        Serial.println("HTTP Error: " + String(httpCode));
      }
      http.end();
    }

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }
}
