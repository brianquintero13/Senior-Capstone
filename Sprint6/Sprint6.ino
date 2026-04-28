#include <WiFi.h>
#include <WiFiServer.h>
#include <EEPROM.h>

// Pin definitions
#define STEP_PIN 12
#define DIR_PIN 14
#define ENABLE_PIN 13

// EEPROM settings
#define EEPROM_SIZE 512
#define SSID_ADDR 0
#define PASSWORD_ADDR 100

// Motor settings
const int stepsPerRevolution = 1600;
const int rotations = 5;
const int totalSteps = stepsPerRevolution * rotations;

// Command settings
const int OPEN_DIR = HIGH;
const int CLOSE_DIR = LOW;

// WiFi settings
char ssid[50] = "";
char password[50] = "";

WiFiServer server(80);

// Motor state
bool isMoving = false;

// Function to save WiFi credentials to EEPROM
void saveWiFiCredentials(const char* newSSID, const char* newPassword) {
  EEPROM.begin(EEPROM_SIZE);
  
  // Save SSID
  for (int i = 0; i < 50; i++) {
    EEPROM.write(SSID_ADDR + i, newSSID[i]);
    if (newSSID[i] == '\0') break;
  }
  
  // Save password
  for (int i = 0; i < 50; i++) {
    EEPROM.write(PASSWORD_ADDR + i, newPassword[i]);
    if (newPassword[i] == '\0') break;
  }
  
  EEPROM.commit();
  EEPROM.end();
  Serial.println("WiFi credentials saved to EEPROM");
}

// Function to load WiFi credentials from EEPROM
void loadWiFiCredentials() {
  EEPROM.begin(EEPROM_SIZE);
  
  // Load SSID
  for (int i = 0; i < 50; i++) {
    ssid[i] = EEPROM.read(SSID_ADDR + i);
    if (ssid[i] == '\0') break;
  }
  
  // Load password
  for (int i = 0; i < 50; i++) {
    password[i] = EEPROM.read(PASSWORD_ADDR + i);
    if (password[i] == '\0') break;
  }
  
  EEPROM.end();
  Serial.print("Loaded SSID: ");
  Serial.println(ssid);
  Serial.println("Password loaded (hidden)");
}

// Function to check if credentials exist in EEPROM
bool hasStoredCredentials() {
  EEPROM.begin(EEPROM_SIZE);
  char firstChar = EEPROM.read(SSID_ADDR);
  EEPROM.end();
  return (firstChar != 0 && firstChar != 255);
}

// Function to clear WiFi credentials from EEPROM
void clearWiFiCredentials() {
  EEPROM.begin(EEPROM_SIZE);
  
  // Clear SSID
  for (int i = 0; i < 50; i++) {
    EEPROM.write(SSID_ADDR + i, 0);
  }
  
  // Clear password
  for (int i = 0; i < 50; i++) {
    EEPROM.write(PASSWORD_ADDR + i, 0);
  }
  
  EEPROM.commit();
  EEPROM.end();
  Serial.println("WiFi credentials cleared from EEPROM");
}

// Function to decode URL-encoded strings
String urlDecode(String input) {
  String output = "";
  for (int i = 0; i < input.length(); i++) {
    char c = input.charAt(i);
    if (c == '+') {
      output += ' ';
    } else if (c == '%') {
      if (i + 2 < input.length()) {
        String hex = input.substring(i + 1, i + 3);
        char decoded = (char)strtol(hex.c_str(), NULL, 16);
        output += decoded;
        i += 2;
      }
    } else {
      output += c;
    }
  }
  return output;
}

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
  
  // Check if BOOT button is pressed to clear EEPROM
  pinMode(0, INPUT_PULLUP);
  delay(100);
  if (digitalRead(0) == LOW) {
    Serial.println("BOOT button pressed - clearing WiFi credentials from EEPROM");
    clearWiFiCredentials();
    Serial.println("EEPROM cleared. Release BOOT button and restart to configure new WiFi.");
    while (digitalRead(0) == LOW) {
      delay(100);
    }
    ESP.restart();
  }
  
  // Motor pins
  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  pinMode(ENABLE_PIN, OUTPUT);
  digitalWrite(ENABLE_PIN, LOW); // Enable motor driver
  
  Serial.println("Motor pins configured");

  // Load WiFi credentials from EEPROM
  if (hasStoredCredentials()) {
    Serial.println("Found stored WiFi credentials");
    loadWiFiCredentials();
    
    // Validate SSID is not empty
    if (strlen(ssid) == 0 || ssid[0] == 0 || ssid[0] == 255) {
      Serial.println("Invalid SSID in EEPROM, clearing and starting AP mode");
      clearWiFiCredentials();
      WiFi.mode(WIFI_AP);
      WiFi.softAP("ShadeSync-Setup", "setup1234");
      Serial.println("AP mode started");
      Serial.print("AP IP: ");
      Serial.println(WiFi.softAPIP());
      server.begin();
      Serial.println("Server started in AP mode");
      Serial.println("Connect to 'ShadeSync-Setup' WiFi and configure your network");
      Serial.println("=================================");
      return;
    }
  } else {
    Serial.println("No stored WiFi credentials found");
    Serial.println("Please configure WiFi via the web interface");
    // Start in AP mode for initial configuration
    WiFi.mode(WIFI_AP);
    WiFi.softAP("ShadeSync-Setup", "setup1234");
    Serial.println("AP mode started");
    Serial.print("AP IP: ");
    Serial.println(WiFi.softAPIP());
    server.begin();
    Serial.println("Server started in AP mode");
    Serial.println("Connect to 'ShadeSync-Setup' WiFi and configure your network");
    Serial.println("=================================");
    return; // Skip WiFi connection in STA mode
  }

  // WiFi setup
  Serial.println("Connecting to WiFi...");
  Serial.print("SSID: ");
  Serial.println(ssid);
  
  // Set WiFi mode
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  
  // Try multiple connection attempts
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
    Serial.println("Failed to connect to WiFi after all attempts");
    Serial.println("Clearing credentials and starting AP mode for reconfiguration");
    clearWiFiCredentials();
    
    // Start in AP mode for reconfiguration
    WiFi.mode(WIFI_AP);
    WiFi.softAP("ShadeSync-Setup", "setup1234");
    Serial.println("AP mode started");
    Serial.print("AP IP: ");
    Serial.println(WiFi.softAPIP());
    server.begin();
    Serial.println("Server started in AP mode");
    Serial.println("Connect to 'ShadeSync-Setup' WiFi and configure your network");
    Serial.println("=================================");
  }
}

void loop() {
  // Only check WiFi connection if we're in STA mode (not AP mode)
  if (WiFi.getMode() == WIFI_STA && WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, attempting to reconnect...");
    WiFi.disconnect();
    delay(1000);
    WiFi.begin(ssid, password);
    
    int reconnectAttempts = 0;
    while (WiFi.status() != WL_CONNECTED && reconnectAttempts < 20) {
      delay(500);
      Serial.print(".");
      reconnectAttempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\nWiFi reconnected!");
      Serial.print("IP address: ");
      Serial.println(WiFi.localIP());
      server.begin();
      Serial.println("Server restarted");
    } else {
      Serial.println("\nFailed to reconnect to WiFi");
    }
  }
  
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
    if (request.indexOf("GET / ") != -1 || request.indexOf("GET /index.html") != -1) {
      // Root path - return simple response
      client.print("ShadeSync ESP32 is running in AP mode. Please configure WiFi via your website.");
    } else if (request.indexOf("GET /OPEN") != -1) {
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
    } else if (request.indexOf("GET /WIFI_CONFIG") != -1) {
      // Parse SSID and password from request
      int ssidStart = request.indexOf("ssid=") + 5;
      int ssidEnd = request.indexOf("&", ssidStart);
      if (ssidEnd == -1) ssidEnd = request.indexOf(" ", ssidStart);
      
      int passwordStart = request.indexOf("password=") + 9;
      int passwordEnd = request.indexOf(" ", passwordStart);
      if (passwordEnd == -1) passwordEnd = request.length();
      
      String newSSID = request.substring(ssidStart, ssidEnd);
      String newPassword = request.substring(passwordStart, passwordEnd);
      
      // Decode URL encoding (handles %20 for spaces, etc.)
      newSSID = urlDecode(newSSID);
      newPassword = urlDecode(newPassword);
      
      Serial.println("Received WiFi credentials:");
      Serial.print("SSID: ");
      Serial.println(newSSID);
      
      // Save to EEPROM
      saveWiFiCredentials(newSSID.c_str(), newPassword.c_str());
      
      // Update current credentials
      newSSID.toCharArray(ssid, 50);
      newPassword.toCharArray(password, 50);
      
      client.print("WiFi credentials saved. Rebooting...");
      Serial.println("Rebooting ESP32 to apply new WiFi settings...");
      delay(1000);
      ESP.restart();
    } else if (request.indexOf("GET /CLEAR_WIFI") != -1) {
      // Clear WiFi credentials and reboot into AP mode
      clearWiFiCredentials();
      client.print("WiFi credentials cleared. Rebooting into AP mode...");
      Serial.println("Rebooting ESP32 into AP mode for reconfiguration...");
      delay(1000);
      ESP.restart();
    } else {
      client.print("Unknown command");
    }
    
    client.stop();
    Serial.println("Client disconnected");
  }
}