#!/usr/bin/env python3
import serial
import sys
import time

def send_command(port, baud_rate, command):
    try:
        # Open serial port
        ser = serial.Serial(port, baud_rate, timeout=5)
        time.sleep(2)  # Wait for port to open
        
        # Send command
        ser.write((command + '\n').encode())
        print(f"[OK] Sent to ESP32: {command}")
        
        # Wait for ESP32 completion response
        start_time = time.time()
        while time.time() - start_time < 15:  # Wait up to 15 seconds
            if ser.in_waiting > 0:
                response = ser.readline().decode().strip()
                print(f"ESP32 response: {response}")
                if f"{command} complete" in response:
                    print(f"[OK] ESP32 completed {command}")
                    ser.close()
                    return True
            time.sleep(0.1)
        
        print(f"[WARNING] Timeout waiting for {command} completion")
        ser.close()
        return True  # Still return success since command was sent
        
    except Exception as e:
        print(f"[ERROR] Serial error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python serial_sender.py <port> <baud> <command>")
        sys.exit(1)
    
    port = sys.argv[1]
    baud = int(sys.argv[2])
    command = sys.argv[3]
    
    success = send_command(port, baud, command)
    sys.exit(0 if success else 1)
