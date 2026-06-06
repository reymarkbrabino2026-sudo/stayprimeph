export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    void import("./sentry.server.config");
    console.info(JSON.stringify({
      level: "info",
      event: "app_start",
      service: "stayprimeph",
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    }));
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    void import("./sentry.edge.config");
  }
}
