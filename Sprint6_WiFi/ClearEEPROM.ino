#include <EEPROM.h>

#define EEPROM_SIZE 512

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("=================================");
  Serial.println("Clearing EEPROM...");
  Serial.println("=================================");
  
  EEPROM.begin(EEPROM_SIZE);
  
  // Clear all EEPROM
  for (int i = 0; i < EEPROM_SIZE; i++) {
    EEPROM.write(i, 0);
  }
  
  EEPROM.commit();
  EEPROM.end();
  
  Serial.println("EEPROM cleared successfully!");
  Serial.println("All WiFi credentials have been removed.");
  Serial.println("=================================");
  Serial.println("Now upload your main Sprint6_WiFi sketch");
  Serial.println("=================================");
}

void loop() {
  // Do nothing
}
