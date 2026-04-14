#include <WiFi.h>
#include <WiFiServer.h>

// Pin definitions
#define STEP_PIN 12
#define DIR_PIN 14
#define ENABLE_PIN 13

// Motor settings
const int stepsPerRevolution = 1600;
const int rotations = 5;
const int totalSteps = stepsPerRevolution * rotations;

// Command settings
const int OPEN_DIR = HIGH;
const int CLOSE_DIR = LOW;

// WiFi settings
const char* ssid = "Matt D.";
const char* password = "Detrimental";

WiFiServer server(80);

// Motor state
bool isMoving = false;

void rotateMotor(int direction) {
  isMoving = true;
  digitalWrite(DIR_PIN, direction);

  for (int i = 0; i < totalSteps; i++) {
    digitalWrite(STEP_PIN, HIGH);
    delayMicroseconds(800);
    digitalWrite(STEP_PIN, LOW);
    delayMicroseconds(800);
  }
  isMoving = false;
}

void setup() {
  Serial.begin(115200);
  
  // Add delay to allow Serial Monitor to connect
  delay(2000);
  
  Serial.println("=================================");
  Serial.println("ESP32 Starting Up...");
  Serial.println("=================================");
  
  // Motor pins
  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  pinMode(ENABLE_PIN, OUTPUT);
  digitalWrite(ENABLE_PIN, LOW); // Enable motor driver
  
  Serial.println("Motor pins configured");

  // WiFi setup
  Serial.println("Connecting to hotspot...");
  Serial.print("SSID: ");
  Serial.println(ssid);
  
  // Set WiFi mode for hotspot compatibility
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  
  // Try multiple connection attempts with different approaches
  int attempts = 0;
  bool connected = false;
  
  while (!connected && attempts < 40) {
    Serial.print("Attempt ");
    Serial.print(attempts + 1);
    Serial.print(" - ");
    
    WiFi.begin(ssid, password);
    
    // Wait for connection with timeout
    int connectionAttempts = 0;
    while (WiFi.status() != WL_CONNECTED && connectionAttempts < 20) {
      delay(500);
      connectionAttempts++;
      
      if (WiFi.status() == WL_CONNECTED) {
        connected = true;
        break;
      }
    }
    
    if (connected) {
      break;
    }
    
    Serial.print("Status: ");
    Serial.println(WiFi.status());
    
    // Reset and try different approach
    WiFi.disconnect();
    delay(1000);
    
    // Every 10 attempts, try with WiFi power cycle
    if (attempts % 10 == 9) {
      Serial.println("Power cycling WiFi...");
      WiFi.mode(WIFI_OFF);
      delay(1000);
      WiFi.mode(WIFI_STA);
      delay(500);
    }
    
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    
    server.begin();
    Serial.println("Server started");
    Serial.println("=================================");
  } else {
    Serial.println("Failed to connect to iPhone hotspot!");
    Serial.print("Final status: ");
    Serial.println(WiFi.status());
    
    // Print common WiFi status codes
    switch(WiFi.status()) {
      case WL_IDLE_STATUS: Serial.println("WiFi idle"); break;
      case WL_NO_SSID_AVAIL: Serial.println("SSID not available - check hotspot name"); break;
      case WL_SCAN_COMPLETED: Serial.println("Scan completed"); break;
      case WL_CONNECT_FAILED: Serial.println("Connection failed - check password"); break;
      case WL_CONNECTION_LOST: Serial.println("Connection lost"); break;
      case WL_DISCONNECTED: Serial.println("Disconnected"); break;
      default: Serial.println("Unknown status"); break;
    }
    
    Serial.println("iPhone hotspot tips:");
    Serial.println("1. Make sure hotspot is on and discoverable");
    Serial.println("2. Check password is correct");
    Serial.println("3. Try moving ESP32 closer to iPhone");
    Serial.println("4. Some iPhones need 'Maximize Compatibility' mode");
  }
}

void loop() {
  WiFiClient client = server.available();
  
  if (client) {
    Serial.println("Client connected");
    String currentLine = "";
    String request = "";
    
    // Read the request
    while (client.connected()) {
      if (client.available()) {
        char c = client.read();
        request += c;
        
        if (c == '\n') {
          if (currentLine.length() == 0) {
            // End of headers, send response
            break;
          } else {
            currentLine = "";
          }
        } else if (c != '\r') {
          currentLine += c;
        }
      }
    }
    
    // Process the request
    Serial.print("Request: ");
    Serial.println(request);
    
    // Send HTTP response
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: text/plain");
    client.println("Access-Control-Allow-Origin: *");
    client.println("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    client.println("Access-Control-Allow-Headers: Content-Type");
    client.println("Connection: close");
    client.println();
    
    // Check for commands in the request
    if (request.indexOf("GET /OPEN") != -1) {
      if (!isMoving) {
        Serial.println("Received OPEN command");
        rotateMotor(OPEN_DIR);
        client.print("OPEN complete");
      } else {
        client.print("BUSY");
      }
    } else if (request.indexOf("GET /CLOSE") != -1) {
      if (!isMoving) {
        Serial.println("Received CLOSE command");
        rotateMotor(CLOSE_DIR);
        client.print("CLOSE complete");
      } else {
        client.print("BUSY");
      }
    } else {
      client.print("Unknown command");
    }
    
    client.stop();
    Serial.println("Client disconnected");
  }
}
