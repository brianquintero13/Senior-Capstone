This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Arduino Manual Control Wiring

Manual `Open` / `Close` buttons now send commands through the backend to the motor controller over USB serial, and both manual buttons are disabled while the motor is moving.

Set these environment variables in `.env.local`:

```bash
SERIAL_PORT_PATH=/dev/tty.usbserial-0001
SERIAL_BAUD_RATE=115200
MOTOR_COMMAND_TIMEOUT_MS=25000
```

Endpoints used:

- `POST /api/device-command` with `{ "action": "open" }` or `{ "action": "close" }`
- `GET /api/device-status` as Server-Sent Events (`status` events)

Arduino firmware is expected to:

- Accept `OPEN` / `CLOSE` commands via serial (newline-terminated)
- Emit `OPEN complete` / `CLOSE complete` when movement finishes

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
