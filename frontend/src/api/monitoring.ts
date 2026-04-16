import axios from "axios";

import { BACKEND_ROOT_URL } from "../lib/env";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
type OpenApiMethod = "get" | "post" | "put" | "patch" | "delete" | "head" | "options";

export type HealthLevel = "healthy" | "degraded" | "down";

interface OpenApiOperation {
  summary?: string;
  operationId?: string;
  tags?: string[];
  security?: unknown[];
}

interface OpenApiInfo {
  title?: string;
  version?: string;
}

interface OpenApiSchema {
  info?: OpenApiInfo;
  security?: unknown[];
  paths?: Record<string, Partial<Record<OpenApiMethod, OpenApiOperation>>>;
}

interface ParsedMetricLine {
  name: string;
  labels: Record<string, string>;
  value: number;
}

export interface ApiRouteDefinition {
  path: string;
  method: string;
  module: string;
  summary: string;
  operationId: string;
  tags: string[];
  secured: boolean;
  hasPathParams: boolean;
}

export interface ApiExplorerSchema {
  title: string;
  version: string;
  routes: ApiRouteDefinition[];
  groupedRoutes: Record<string, ApiRouteDefinition[]>;
  routeCount: number;
}

export interface EndpointProbe {
  id: string;
  label: string;
  path: string;
  method?: HttpMethod;
  description?: string;
  critical?: boolean;
}

export interface EndpointProbeResult extends EndpointProbe {
  status: HealthLevel;
  statusCode: number | null;
  latencyMs: number;
  detail: string;
  checkedAt: string;
}

export interface RequestMetricPoint {
  handler: string;
  method: string;
  status: string;
  count: number;
}

export interface MetricsSummary {
  status: "available";
  totalSeries: number;
  requestCount: number;
  requestMetrics: RequestMetricPoint[];
  statusTotals: Record<string, number>;
  topEndpoints: Array<{ handler: string; count: number }>;
  topMethods: Array<{ method: string; count: number }>;
  residentMemoryBytes: number | null;
  virtualMemoryBytes: number | null;
  cpuSeconds: number | null;
  openFileDescriptors: number | null;
  inProgressRequests: number | null;
  scrapedAt: string;
  rawLineSample: string[];
}

export interface ObservabilityToolStatus {
  id: string;
  name: string;
  url: string;
  purpose: string;
  status: "online" | "offline" | "unknown";
  detail: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const METRIC_LINE_REGEX = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{([^}]*)\})?\s+(-?[0-9.eE+-]+)$/;
const OPEN_API_METHODS: OpenApiMethod[] = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
];

const observabilityTools: Omit<ObservabilityToolStatus, "status" | "detail">[] = [
  {
    id: "prometheus",
    name: "Prometheus",
    url: "http://localhost:9090",
    purpose: "Metrics query and scrape target inspection",
  },
  {
    id: "grafana",
    name: "Grafana",
    url: "http://localhost:3001",
    purpose: "Dashboards and panel analytics",
  },
  {
    id: "jaeger",
    name: "Jaeger",
    url: "http://localhost:16686",
    purpose: "Distributed tracing visualization",
  },
  {
    id: "kibana",
    name: "Kibana",
    url: "http://localhost:5601",
    purpose: "Structured log exploration",
  },
  {
    id: "logstash",
    name: "Logstash API",
    url: "http://localhost:9600/_node/pipelines",
    purpose: "Ingestion pipeline health",
  },
];

const infraClient = axios.create({
  baseURL: BACKEND_ROOT_URL,
  timeout: DEFAULT_TIMEOUT_MS,
});

export async function getRootHealth() {
  const response = await infraClient.get<{ status: string }>("/health");
  return response.data;
}

export async function getReadiness() {
  const response = await infraClient.get<{ status: string; failures?: string[] }>("/ready");
  return response.data;
}

export async function getApiHealth() {
  const response = await infraClient.get<{ status: string }>("/api/v1/health");
  return response.data;
}

function normalizeEndpointModule(path: string) {
  const normalized = path.replace(/^\/+/, "");
  const withoutPrefix = normalized.startsWith("api/v1/")
    ? normalized.slice("api/v1/".length)
    : normalized;
  const [segment] = withoutPrefix.split("/");

  if (!segment || segment.startsWith("{")) {
    return "system";
  }

  return segment;
}

function parsePrometheusLabels(rawLabelSet: string): Record<string, string> {
  const labels: Record<string, string> = {};
  const labelRegex = /(\w+)="((?:\\.|[^"])*)"/g;

  for (const match of rawLabelSet.matchAll(labelRegex)) {
    labels[match[1]] = match[2].replaceAll('\\"', '"').replaceAll("\\\\", "\\");
  }

  return labels;
}

function parsePrometheusMetricLine(line: string): ParsedMetricLine | null {
  const match = line.match(METRIC_LINE_REGEX);
  if (!match) {
    return null;
  }

  const value = Number(match[4]);
  if (!Number.isFinite(value)) {
    return null;
  }

  return {
    name: match[1],
    labels: match[3] ? parsePrometheusLabels(match[3]) : {},
    value,
  };
}

function toHealthLevelFromStatusCode(statusCode: number): HealthLevel {
  if (statusCode >= 200 && statusCode < 400) {
    return "healthy";
  }

  if (statusCode >= 400 && statusCode < 500) {
    return "degraded";
  }

  return "down";
}

function openApiCandidates() {
  const candidates = new Set<string>();

  candidates.add("/openapi.json");

  if (BACKEND_ROOT_URL) {
    candidates.add(`${BACKEND_ROOT_URL.replace(/\/$/, "")}/openapi.json`);
  } else if (typeof window !== "undefined") {
    candidates.add(`${window.location.protocol}//${window.location.hostname}:8000/openapi.json`);
  }

  return [...candidates];
}

async function fetchOpenApiSchema() {
  let lastError: unknown = null;

  for (const target of openApiCandidates()) {
    try {
      const response = await axios.get<OpenApiSchema>(target, {
        timeout: DEFAULT_TIMEOUT_MS,
      });

      return response.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Unable to fetch OpenAPI schema");
}

export async function getMetricsSummary(): Promise<MetricsSummary> {
  const response = await infraClient.get<string>("/metrics", {
    responseType: "text",
  });

  const metricLines = response.data
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  const parsedLines = metricLines
    .map(parsePrometheusMetricLine)
    .filter((line): line is ParsedMetricLine => Boolean(line));

  const requestMetrics: RequestMetricPoint[] = [];
  const statusTotals: Record<string, number> = {};
  const endpointTotals: Record<string, number> = {};
  const methodTotals: Record<string, number> = {};

  let residentMemoryBytes: number | null = null;
  let virtualMemoryBytes: number | null = null;
  let cpuSeconds: number | null = null;
  let openFileDescriptors: number | null = null;
  let inProgressRequests: number | null = null;

  for (const line of parsedLines) {
    if (line.name === "process_resident_memory_bytes") {
      residentMemoryBytes = line.value;
      continue;
    }

    if (line.name === "process_virtual_memory_bytes") {
      virtualMemoryBytes = line.value;
      continue;
    }

    if (line.name === "process_cpu_seconds_total") {
      cpuSeconds = line.value;
      continue;
    }

    if (line.name === "process_open_fds") {
      openFileDescriptors = line.value;
      continue;
    }

    if (line.name === "http_requests_inprogress") {
      inProgressRequests = line.value;
      continue;
    }

    if (line.name !== "http_requests_total") {
      continue;
    }

    const handler = line.labels.handler ?? "unknown";
    const method = line.labels.method ?? "UNKNOWN";
    const status = line.labels.status ?? "unknown";

    requestMetrics.push({
      handler,
      method,
      status,
      count: line.value,
    });

    endpointTotals[handler] = (endpointTotals[handler] ?? 0) + line.value;
    methodTotals[method] = (methodTotals[method] ?? 0) + line.value;
    statusTotals[status] = (statusTotals[status] ?? 0) + line.value;
  }

  const topEndpoints = Object.entries(endpointTotals)
    .map(([handler, count]) => ({ handler, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topMethods = Object.entries(methodTotals)
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);

  const requestCount = requestMetrics.reduce((sum, item) => sum + item.count, 0);

  return {
    status: "available",
    totalSeries: metricLines.length,
    requestCount,
    requestMetrics,
    statusTotals,
    topEndpoints,
    topMethods,
    residentMemoryBytes,
    virtualMemoryBytes,
    cpuSeconds,
    openFileDescriptors,
    inProgressRequests,
    scrapedAt: new Date().toISOString(),
    rawLineSample: metricLines.slice(0, 24),
  };
}

export async function getApiExplorerSchema(): Promise<ApiExplorerSchema> {
  const schema = await fetchOpenApiSchema();
  const rootSecurityEnabled = Boolean(schema.security?.length);
  const routes: ApiRouteDefinition[] = [];

  for (const [path, item] of Object.entries(schema.paths ?? {})) {
    for (const method of OPEN_API_METHODS) {
      const operation = item[method];
      if (!operation) {
        continue;
      }

      const module = normalizeEndpointModule(path);

      routes.push({
        path,
        method: method.toUpperCase(),
        module,
        summary: operation.summary ?? operation.operationId ?? "No summary",
        operationId: operation.operationId ?? `${method}-${path}`,
        tags: operation.tags ?? [],
        secured: Boolean(operation.security?.length) || rootSecurityEnabled,
        hasPathParams: path.includes("{"),
      });
    }
  }

  routes.sort((a, b) => {
    if (a.module === b.module) {
      if (a.path === b.path) {
        return a.method.localeCompare(b.method);
      }
      return a.path.localeCompare(b.path);
    }

    return a.module.localeCompare(b.module);
  });

  const groupedRoutes = routes.reduce<Record<string, ApiRouteDefinition[]>>((acc, route) => {
    if (!acc[route.module]) {
      acc[route.module] = [];
    }
    acc[route.module].push(route);
    return acc;
  }, {});

  return {
    title: schema.info?.title ?? "ShopOps API",
    version: schema.info?.version ?? "unknown",
    routes,
    groupedRoutes,
    routeCount: routes.length,
  };
}

export const defaultEndpointProbes: EndpointProbe[] = [
  {
    id: "root-health",
    label: "Root Health",
    path: "/health",
    method: "GET",
    description: "Base liveness endpoint",
    critical: true,
  },
  {
    id: "readiness",
    label: "Readiness",
    path: "/ready",
    method: "GET",
    description: "Database and Redis readiness checks",
    critical: true,
  },
  {
    id: "api-health",
    label: "API Health",
    path: "/api/v1/health",
    method: "GET",
    description: "Versioned API health check",
    critical: true,
  },
  {
    id: "metrics",
    label: "Prometheus Metrics",
    path: "/metrics",
    method: "GET",
    description: "Metrics scrape endpoint",
  },
  {
    id: "openapi",
    label: "OpenAPI Contract",
    path: "/openapi.json",
    method: "GET",
    description: "Runtime API schema",
  },
];

export async function getEndpointStatusReport(
  probes: EndpointProbe[] = defaultEndpointProbes,
): Promise<EndpointProbeResult[]> {
  const checks = probes.map(async (probe) => {
    const startedAt = Date.now();

    try {
      const response = await infraClient.request({
        url: probe.path,
        method: probe.method ?? "GET",
        validateStatus: () => true,
      });

      return {
        ...probe,
        status: toHealthLevelFromStatusCode(response.status),
        statusCode: response.status,
        latencyMs: Date.now() - startedAt,
        detail: response.statusText || "Response received",
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        ...probe,
        status: "down" as const,
        statusCode: null,
        latencyMs: Date.now() - startedAt,
        detail: axios.isAxiosError(error) ? error.message : "Network error while probing endpoint",
        checkedAt: new Date().toISOString(),
      };
    }
  });

  return Promise.all(checks);
}

export async function getObservabilityToolStatuses(): Promise<ObservabilityToolStatus[]> {
  const checks = observabilityTools.map(async (tool) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 3_000);

    try {
      await fetch(tool.url, {
        mode: "no-cors",
        signal: controller.signal,
      });

      return {
        ...tool,
        status: "online" as const,
        detail: "Browser probe reached endpoint (opaque response).",
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return {
          ...tool,
          status: "offline" as const,
          detail: "Probe timed out.",
        };
      }

      return {
        ...tool,
        status: "unknown" as const,
        detail: "Probe blocked or endpoint unavailable from browser context.",
      };
    } finally {
      window.clearTimeout(timeoutId);
    }
  });

  return Promise.all(checks);
}
