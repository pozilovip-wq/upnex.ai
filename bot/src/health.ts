import { createServer } from "http";

// Tracks bot liveness — updated by index.ts on every processed Telegram update
export const state = {
  startedAt: Date.now(),
  lastUpdateAt: 0,      // timestamp of last message/callback processed
  pollingError: null as string | null,  // set when polling loop dies
};

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

export function startHealthServer() {
  const server = createServer((_req, res) => {
    const uptimeSec = Math.floor((Date.now() - state.startedAt) / 1000);
    const secondsSinceUpdate = state.lastUpdateAt
      ? Math.floor((Date.now() - state.lastUpdateAt) / 1000)
      : null;

    // Mark unhealthy if polling has errored out
    const healthy = !state.pollingError;
    const status = healthy ? 200 : 503;

    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: healthy,
      uptime_sec: uptimeSec,
      seconds_since_last_update: secondsSinceUpdate,
      polling_error: state.pollingError ?? undefined,
    }));
  });

  server.listen(PORT, () => {
    console.log(`[health] HTTP server listening on port ${PORT}`);
  });
}
