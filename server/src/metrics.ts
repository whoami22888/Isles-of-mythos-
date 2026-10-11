const startedAt = process.hrtime.bigint();
let httpRequestsTotal = 0;
let httpErrorsTotal = 0;
let httpRequestDurationSecondsSum = 0;
let httpRequestDurationSecondsCount = 0;
let websocketConnections = 0;
let websocketAuthenticated = 0;
let activePlayers = 0;
let tickDurationSecondsSum = 0;
let tickDurationSecondsCount = 0;
const tickDurationBucketBoundsSeconds = [0.005, 0.01, 0.02, 0.04, 0.05, 0.1, 0.25, 0.5, 1, Number.POSITIVE_INFINITY];
const tickDurationBucketCounts = tickDurationBucketBoundsSeconds.map(() => 0);
let databaseUp = 1;

export function recordHttpRequest(durationMs: number, statusCode: number): void {
  httpRequestsTotal++;
  if (statusCode >= 500) httpErrorsTotal++;
  httpRequestDurationSecondsSum += durationMs / 1000;
  httpRequestDurationSecondsCount++;
}

export function setWebSocketConnections(value: number): void {
  websocketConnections = value;
}

export function setWebSocketAuthenticated(value: number): void {
  websocketAuthenticated = value;
}

export function setActivePlayers(value: number): void {
  activePlayers = value;
}

export function recordTick(durationMs: number): void {
  const seconds = Math.max(0, durationMs / 1000);
  tickDurationSecondsSum += seconds;
  tickDurationSecondsCount++;
  tickDurationBucketBoundsSeconds.forEach((bound, index) => {
    if (seconds <= bound) tickDurationBucketCounts[index]++;
  });
}

export function setDatabaseUp(value: boolean): void {
  databaseUp = value ? 1 : 0;
}

export function renderPrometheusMetrics(): string {
  const uptimeSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
  const memory = process.memoryUsage();
  const cpu = process.cpuUsage();

  return [
    "# HELP isles_process_uptime_seconds Server process uptime in seconds.",
    "# TYPE isles_process_uptime_seconds gauge",
    `isles_process_uptime_seconds ${uptimeSeconds}`,
    "# HELP isles_process_resident_memory_bytes Resident process memory.",
    "# TYPE isles_process_resident_memory_bytes gauge",
    `isles_process_resident_memory_bytes ${memory.rss}`,
    "# HELP isles_process_heap_used_bytes V8 heap used.",
    "# TYPE isles_process_heap_used_bytes gauge",
    `isles_process_heap_used_bytes ${memory.heapUsed}`,
    "# HELP isles_process_cpu_user_seconds_total User CPU time.",
    "# TYPE isles_process_cpu_user_seconds_total counter",
    `isles_process_cpu_user_seconds_total ${cpu.user / 1e6}`,
    "# HELP isles_process_cpu_system_seconds_total System CPU time.",
    "# TYPE isles_process_cpu_system_seconds_total counter",
    `isles_process_cpu_system_seconds_total ${cpu.system / 1e6}`,
    "# HELP isles_http_requests_total HTTP requests handled.",
    "# TYPE isles_http_requests_total counter",
    `isles_http_requests_total ${httpRequestsTotal}`,
    "# HELP isles_http_errors_total HTTP 5xx responses.",
    "# TYPE isles_http_errors_total counter",
    `isles_http_errors_total ${httpErrorsTotal}`,
    "# HELP isles_http_request_duration_seconds_sum HTTP request duration sum.",
    "# TYPE isles_http_request_duration_seconds_sum counter",
    `isles_http_request_duration_seconds_sum ${httpRequestDurationSecondsSum}`,
    "# HELP isles_http_request_duration_seconds_count HTTP request duration count.",
    "# TYPE isles_http_request_duration_seconds_count counter",
    `isles_http_request_duration_seconds_count ${httpRequestDurationSecondsCount}`,
    "# HELP isles_websocket_connections Active WebSocket connections.",
    "# TYPE isles_websocket_connections gauge",
    `isles_websocket_connections ${websocketConnections}`,
    "# HELP isles_websocket_authenticated Authenticated WebSocket connections.",
    "# TYPE isles_websocket_authenticated gauge",
    `isles_websocket_authenticated ${websocketAuthenticated}`,
    "# HELP isles_active_players Authenticated active players.",
    "# TYPE isles_active_players gauge",
    `isles_active_players ${activePlayers}`,
    "# HELP isles_tick_duration_seconds Game tick duration distribution in seconds.",
    "# TYPE isles_tick_duration_seconds histogram",
    ...tickDurationBucketBoundsSeconds.map((bound, index) => 'isles_tick_duration_seconds_bucket{le="' + (Number.isFinite(bound) ? bound : "+Inf") + '\"} ' + tickDurationBucketCounts[index]),
    `isles_tick_duration_seconds_sum ${tickDurationSecondsSum}`,
    `isles_tick_duration_seconds_count ${tickDurationSecondsCount}`,
    "# HELP isles_database_up Database connectivity status.",
    "# TYPE isles_database_up gauge",
    `isles_database_up ${databaseUp}`,
    "",
  ].join("\n");
}
