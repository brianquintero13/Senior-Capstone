## Sprint6 WiFi Firmware Builder Workflow

This firmware supports two profiles:

- `BUILD_PROFILE=1` builder-first mode (seed default WiFi credentials on first boot)
- `BUILD_PROFILE=0` customer mode (no seeded credentials)

### Generate flash-time builder config

From repo root:

```bash
export BUILDER_WIFI_SSID="YourBuilderNetwork"
export BUILDER_WIFI_PASSWORD="YourBuilderPassword"
export DEVICE_SETUP_CODE="YourSetupCode"
./Sprint6_WiFi/tools/generate_builder_config.sh
```

This creates `Sprint6_WiFi/builder_config.local.h` used at compile time.

### Builder handoff checklist

1. Generate builder config header.
2. Flash `Sprint6_WiFi.ino`.
3. Boot device and confirm serial log shows WiFi connected + IP.
4. Verify `GET /health` from builder network.
5. Verify open/close command path.
6. Hand off unit with setup code and reset-button recovery instructions.

### Customer recovery behavior

- Long-press reset button (4+ sec) enters setup AP mode.
- Setup AP has a limited window (default 10 min).
- Provisioning accepts authenticated `POST /wifi-config` only.
