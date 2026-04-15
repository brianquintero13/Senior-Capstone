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

void rotateMotor(int direction) {
  digitalWrite(DIR_PIN, direction);

  for (int i = 0; i < totalSteps; i++) {
    digitalWrite(STEP_PIN, HIGH);
    delayMicroseconds(800);
    digitalWrite(STEP_PIN, LOW);
    delayMicroseconds(800);
  }
}

void setup() {

  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  pinMode(ENABLE_PIN, OUTPUT);

  digitalWrite(ENABLE_PIN, LOW); // Enable motor driver
  Serial.begin(115200);
  Serial.println("Ready. Send OPEN or CLOSE.");
}

void loop() {
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    cmd.toUpperCase();

    if (cmd == "OPEN") {
      rotateMotor(OPEN_DIR);
      Serial.println("OPEN complete");
    } else if (cmd == "CLOSE") {
      rotateMotor(CLOSE_DIR);
      Serial.println("CLOSE complete");
    } else {
      Serial.println("Unknown command. Use OPEN or CLOSE.");
    }
  }
}
