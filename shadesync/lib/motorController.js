import { EventEmitter } from "events";
import { exec } from "child_process";
import { join } from "path";
import { shadeStateManager, SHADE_STATES } from "./shadeStateManager.js";

const DEFAULT_BAUD_RATE = 115200;
const DEFAULT_TIMEOUT_MS = 25000;

const STATES = {
  IDLE: "idle",
  BUSY: "busy",
  ERROR: "error",
};

class PythonMotorController extends EventEmitter {
  constructor() {
    super();
    this.state = STATES.IDLE;
    this.currentAction = null;
    this.lastCompletedAction = null;
    this.lastError = null;
    this.commandStartedAt = null;
    this.commandTimeout = null;
    this.pythonScript = join(process.cwd(), 'serial_sender.py');
    console.log("Python motor controller initialized - using Python for serial communication");
  }

  getSnapshot() {
    return {
      state: this.state,
      busy: this.state === STATES.BUSY,
      currentAction: this.currentAction,
      lastCompletedAction: this.lastCompletedAction,
      lastError: this.lastError,
      commandStartedAt: this.commandStartedAt,
      updatedAt: new Date().toISOString(),
    };
  }

  async ensureConnected() {
    const path = process.env.SERIAL_PORT_PATH;
    if (!path) {
      const err = new Error("SERIAL_PORT_PATH is not configured");
      err.code = "SERIAL_PORT_MISSING";
      throw err;
    }
    console.log(`Ready to communicate with ESP32 on ${path} using Python`);
    return;
  }

  setState(nextState, patch = {}) {
    this.state = nextState;
    if (Object.prototype.hasOwnProperty.call(patch, "currentAction")) {
      this.currentAction = patch.currentAction;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "lastCompletedAction")) {
      this.lastCompletedAction = patch.lastCompletedAction;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "lastError")) {
      this.lastError = patch.lastError;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "commandStartedAt")) {
      this.commandStartedAt = patch.commandStartedAt;
    }
    this.emit("status", this.getSnapshot());
  }

  clearCommandTimeout() {
    if (this.commandTimeout) {
      clearTimeout(this.commandTimeout);
      this.commandTimeout = null;
    }
  }

  setCommandTimeout() {
    this.clearCommandTimeout();
    const timeoutMs = Number(process.env.MOTOR_COMMAND_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
    this.commandTimeout = setTimeout(() => {
      const action = this.currentAction;
      this.setState(STATES.ERROR, {
        currentAction: null,
        lastError: `Timed out waiting for ${action || "command"} completion`,
        commandStartedAt: null,
      });
      this.setState(STATES.IDLE, {});
    }, timeoutMs);
  }

  async sendCommand(action) {
    const normalized = String(action || "").trim().toLowerCase();
    if (!["open", "close"].includes(normalized)) {
      const err = new Error("Invalid motor action");
      err.code = "INVALID_ACTION";
      throw err;
    }

    if (this.state === STATES.BUSY) {
      const err = new Error("Motor is busy");
      err.code = "BUSY";
      throw err;
    }

    // Check if operation is allowed based on current state
    const canPerform = await shadeStateManager.canPerformOperation(normalized);
    if (!canPerform.canPerform) {
      const err = new Error(canPerform.reason);
      err.code = "REDUNDANT_OPERATION";
      throw err;
    }

    await this.ensureConnected();

    this.setState(STATES.BUSY, {
      currentAction: normalized,
      lastError: null,
      commandStartedAt: new Date().toISOString(),
    });
    this.setCommandTimeout();

    const path = process.env.SERIAL_PORT_PATH;
    const baudRate = process.env.SERIAL_BAUD_RATE || DEFAULT_BAUD_RATE;
    const command = normalized.toUpperCase();

    try {
      // Use Python script for reliable serial communication
      const pythonCmd = `python "${this.pythonScript}" "${path}" "${baudRate}" "${command}"`;
      
      await new Promise((resolve, reject) => {
        exec(pythonCmd, { timeout: 20000 }, (error, stdout, stderr) => {
          console.log(stdout);
          if (stderr && stderr.includes('ERROR')) {
            console.error('Python script error:', stderr);
            reject(new Error(stderr));
          } else {
            // Success even if there's stdout output
            resolve();
          }
        });
      });

      // Wait for motor movement (8 seconds for full rotation)
      setTimeout(() => {
        this.clearCommandTimeout();
        
        // Only update state if operation completed successfully
        const newState = normalized === 'open' ? SHADE_STATES.OPEN : SHADE_STATES.CLOSED;
        shadeStateManager.setState(newState).then(success => {
          if (success) {
            console.log(`✅ State updated to: ${newState}`);
          } else {
            console.log(`⚠️ Failed to update state to: ${newState}`);
          }
        });

        this.setState(STATES.IDLE, {
          currentAction: null,
          lastCompletedAction: normalized,
          lastError: null,
          commandStartedAt: null,
        });
        console.log(`✅ Command completed: ${command}`);
      }, 8000);
      
    } catch (err) {
      this.clearCommandTimeout();
      // Don't update state on failure
      this.setState(STATES.ERROR, {
        currentAction: null,
        lastError: err?.message || "Failed to send command to ESP32",
        commandStartedAt: null,
      });
      this.setState(STATES.IDLE, {});
      throw err;
    }

    return { accepted: true, action: normalized };
  }

  async getCurrentShadeState() {
    return await shadeStateManager.getCurrentState();
  }
}

const globalKey = "__shadeSyncMotorController";

if (!global[globalKey]) {
  global[globalKey] = new PythonMotorController();
}

export const motorController = global[globalKey];
export { STATES as MOTOR_STATES };
