import { EventEmitter } from "events";
import { shadeStateManager, SHADE_STATES } from "./shadeStateManager.js";

const DEFAULT_TIMEOUT_MS = 25000;
const DEFAULT_ESP32_HTTP_TIMEOUT_MS = 20000;

const STATES = {
  IDLE: "idle",
  BUSY: "busy",
  ERROR: "error",
};

class WiFiMotorController extends EventEmitter {
  constructor() {
    super();
    this.state = STATES.IDLE;
    this.currentAction = null;
    this.lastCompletedAction = null;
    this.lastError = null;
    this.commandStartedAt = null;
    this.commandTimeout = null;
    this.esp32IP = process.env.ESP32_IP;
    console.log("WiFi motor controller initialized - using HTTP requests to ESP32");
    this.initializeState();
  }

  async initializeState() {
    try {
      await shadeStateManager.setState(SHADE_STATES.CLOSED);
      console.log("🔄 Startup state reset: shades marked as CLOSED");
    } catch (err) {
      console.log(`⚠️ Failed to reset startup shade state: ${err?.message || String(err)}`);
    }
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
    if (!this.esp32IP) {
      const err = new Error("ESP32_IP is not configured in environment variables");
      err.code = "ESP32_IP_MISSING";
      throw err;
    }
    console.log(`Ready to communicate with ESP32 at ${this.esp32IP} via WiFi`);
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

    const command = normalized.toUpperCase();

    try {
      // Use HTTP request to ESP32 via WiFi
      const url = `http://${this.esp32IP}/${command}`;
      console.log(`📡 Sending HTTP request to ESP32: ${url}`);
      
      const httpTimeoutMs = Number(
        process.env.ESP32_HTTP_TIMEOUT_MS || process.env.MOTOR_COMMAND_TIMEOUT_MS || DEFAULT_ESP32_HTTP_TIMEOUT_MS
      );

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'text/plain',
        },
        // ESP32 response can be delayed while motor movement completes.
        signal: AbortSignal.timeout(httpTimeoutMs)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.text();
      console.log(`📨 ESP32 response: ${result}`);

      if (result.includes('BUSY')) {
        throw new Error('ESP32 is busy');
      }

      // WiFi firmware returns response after movement finishes, so update state immediately.
      this.clearCommandTimeout();

      const newState = normalized === 'open' ? SHADE_STATES.OPEN : SHADE_STATES.CLOSED;
      const updated = await shadeStateManager.setState(newState);
      if (updated) {
        console.log(`✅ State updated to: ${newState}`);
      } else {
        console.log(`⚠️ Failed to update state to: ${newState}`);
      }

      this.setState(STATES.IDLE, {
        currentAction: null,
        lastCompletedAction: normalized,
        lastError: null,
        commandStartedAt: null,
      });
      console.log(`✅ Command completed: ${command}`);
      
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
  global[globalKey] = new WiFiMotorController();
}

export const motorController = global[globalKey];
export { STATES as MOTOR_STATES };
