import { EventEmitter } from "events";

const DEFAULT_BAUD_RATE = 115200;
const DEFAULT_TIMEOUT_MS = 25000;

const STATES = {
  IDLE: "idle",
  BUSY: "busy",
  ERROR: "error",
};

class MotorController extends EventEmitter {
  constructor() {
    super();
    this.port = null;
    this.connecting = null;
    this.buffer = "";
    this.state = STATES.IDLE;
    this.currentAction = null;
    this.lastCompletedAction = null;
    this.lastError = null;
    this.commandStartedAt = null;
    this.commandTimeout = null;
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
    if (this.port?.isOpen) return;
    if (this.connecting) {
      await this.connecting;
      return;
    }

    const path = process.env.SERIAL_PORT_PATH;
    if (!path) {
      const err = new Error("SERIAL_PORT_PATH is not configured");
      err.code = "SERIAL_PORT_MISSING";
      throw err;
    }

    const baudRate = Number(process.env.SERIAL_BAUD_RATE || DEFAULT_BAUD_RATE);
    this.connecting = (async () => {
      const { SerialPort } = await import("serialport");
      const port = new SerialPort({ path, baudRate, autoOpen: false });
      await new Promise((resolve, reject) => {
        port.open((openErr) => {
          if (openErr) reject(openErr);
          else resolve();
        });
      });
      this.port = port;
      this.buffer = "";

      port.on("data", (chunk) => this.handleData(chunk));
      port.on("error", (err) => this.handlePortError(err));
      port.on("close", () => {
        this.port = null;
      });
    })();

    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
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

  handlePortError(err) {
    this.clearCommandTimeout();
    this.setState(STATES.ERROR, {
      currentAction: null,
      lastError: err?.message || "Serial port error",
      commandStartedAt: null,
    });
    this.setState(STATES.IDLE, {});
  }

  handleData(chunk) {
    this.buffer += chunk.toString("utf8");
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (/^(OPEN|CLOSE)\s+complete$/i.test(line)) {
        const action = line.toLowerCase().startsWith("open") ? "open" : "close";
        this.clearCommandTimeout();
        this.setState(STATES.IDLE, {
          currentAction: null,
          lastCompletedAction: action,
          lastError: null,
          commandStartedAt: null,
        });
      }
    }
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

    await this.ensureConnected();

    this.setState(STATES.BUSY, {
      currentAction: normalized,
      lastError: null,
      commandStartedAt: new Date().toISOString(),
    });
    this.setCommandTimeout();

    const payload = `${normalized.toUpperCase()}\n`;
    try {
      await new Promise((resolve, reject) => {
        this.port.write(payload, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (err) {
      this.clearCommandTimeout();
      this.setState(STATES.ERROR, {
        currentAction: null,
        lastError: err?.message || "Failed to write command to motor",
        commandStartedAt: null,
      });
      this.setState(STATES.IDLE, {});
      throw err;
    }

    return { accepted: true, action: normalized };
  }
}

const globalKey = "__shadeSyncMotorController";

if (!global[globalKey]) {
  global[globalKey] = new MotorController();
}

export const motorController = global[globalKey];
export { STATES as MOTOR_STATES };
