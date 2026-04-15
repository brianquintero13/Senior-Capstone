/*
  Sprint6_BT.ino
  Separate firmware for ESP32 motor control over:
  1) USB Serial (for local debugging)
  2) Bluetooth Classic SPP (for wireless command transport)

  Expected commands:
    OPEN
    CLOSE

  Expected responses:
    OPEN complete
    CLOSE complete
    BUSY
    Unknown command. Use OPEN or CLOSE.
*/

#include "BluetoothSerial.h"

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

// Bluetooth settings
const char *BT_DEVICE_NAME = "ShadeSync-ESP32";

BluetoothSerial SerialBT;
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

void handleCommand(String cmd, Stream &replyPort) {
  cmd.trim();
  cmd.toUpperCase();

  if (cmd.length() == 0) {
    return;
  }

  if (isMoving) {
    replyPort.println("BUSY");
    return;
  }

  if (cmd == "OPEN") {
    rotateMotor(OPEN_DIR);
    replyPort.println("OPEN complete");
    return;
  }

  if (cmd == "CLOSE") {
    rotateMotor(CLOSE_DIR);
    replyPort.println("CLOSE complete");
    return;
  }

  replyPort.println("Unknown command. Use OPEN or CLOSE.");
}

void setup() {
  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  pinMode(ENABLE_PIN, OUTPUT);
  digitalWrite(ENABLE_PIN, LOW); // Enable motor driver

  Serial.begin(115200);
  delay(300);

  if (!SerialBT.begin(BT_DEVICE_NAME)) {
    Serial.println("Bluetooth start failed");
  } else {
    Serial.print("Bluetooth ready. Device name: ");
    Serial.println(BT_DEVICE_NAME);
  }

  Serial.println("Ready. Send OPEN or CLOSE via USB serial or Bluetooth SPP.");
}

void loop() {
  if (Serial.available() > 0) {
    String usbCmd = Serial.readStringUntil('\n');
    handleCommand(usbCmd, Serial);
  }

  if (SerialBT.available() > 0) {
    String btCmd = SerialBT.readStringUntil('\n');
    handleCommand(btCmd, SerialBT);

    // Mirror command activity to USB serial for debugging visibility.
    btCmd.trim();
    if (btCmd.length() > 0) {
      Serial.print("BT command received: ");
      Serial.println(btCmd);
    }
  }
}

