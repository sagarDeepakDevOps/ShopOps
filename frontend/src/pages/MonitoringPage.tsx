import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  HeartPulse,
  RefreshCw,
  Search,
  ServerCog,
  TerminalSquare,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  getApiExplorerSchema,
  getApiHealth,
  type ApiRouteDefinition,
  getEndpointStatusReport,
  getMetricsSummary,
  getObservabilityToolStatuses,
  getReadiness,
  getRootHealth,
  type HealthLevel,
} from "../api/monitoring";
import { ApiError } from "../components/ui/ApiError";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { PageTitle } from "../components/ui/PageTitle";

const refreshPresets = [10_000, 20_000, 30_000, 60_000];

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) {
    return "-";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
}

function healthLevelClass(level: HealthLevel) {
  if (level === "healthy") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (level === "degraded") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-rose-100 text-rose-800";
}

function HealthBadge({ level }: { level: HealthLevel }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${healthLevelClass(level)}`}
    >
      {level}
    </span>
  );
}

export function MonitoringPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshMs, setRefreshMs] = useState(20_000);
  const [routeFilter, setRouteFilter] = useState("");

  const refetchInterval = autoRefresh ? refreshMs : false;

  const rootHealthQuery = useQuery({
    queryKey: ["monitoring", "root-health"],
    queryFn: getRootHealth,
    refetchInterval,
  });
  const readinessQuery = useQuery({
    queryKey: ["monitoring", "ready"],
    queryFn: getReadiness,
    refetchInterval,
  });
  const apiHealthQuery = useQuery({
    queryKey: ["monitoring", "api-health"],
    queryFn: getApiHealth,
    refetchInterval,
  });
  const metricsQuery = useQuery({
    queryKey: ["monitoring", "metrics"],
    queryFn: getMetricsSummary,
    refetchInterval,
  });
  const openApiQuery = useQuery({
    queryKey: ["monitoring", "openapi"],
    queryFn: getApiExplorerSchema,
    refetchInterval,
    retry: 1,
  });
  const endpointProbesQuery = useQuery({
    queryKey: ["monitoring", "endpoint-probes"],
    queryFn: () => getEndpointStatusReport(),
    refetchInterval,
  });
  const observabilityQuery = useQuery({
    queryKey: ["monitoring", "observability"],
    queryFn: getObservabilityToolStatuses,
    refetchInterval,
  });

  const isLoading = [
    rootHealthQuery,
    readinessQuery,
    apiHealthQuery,
    metricsQuery,
    endpointProbesQuery,
  ].some((query) => query.isLoading);

  const hasCriticalError = [rootHealthQuery, readinessQuery, apiHealthQuery, metricsQuery].some(
    (query) => query.isError,
  );

  const statusBreakdownData = useMemo(
    () =>
      Object.entries(metricsQuery.data?.statusTotals ?? {}).map(([status, count]) => ({
        status,
        count: Math.round(count),
      })),
    [metricsQuery.data?.statusTotals],
  );

  const topEndpointData = useMemo(
    () =>
      (metricsQuery.data?.topEndpoints ?? []).map((item) => ({
        endpoint: item.handler,
        count: Math.round(item.count),
      })),
    [metricsQuery.data?.topEndpoints],
  );

  const filteredRouteGroups = useMemo(() => {
    if (!openApiQuery.data) {
      return [] as Array<[string, ApiRouteDefinition[]]>;
    }

    const normalizedFilter = routeFilter.trim().toLowerCase();

    return Object.entries(openApiQuery.data.groupedRoutes)
      .map(([module, routes]) => {
        const filtered = normalizedFilter
          ? routes.filter((route) =>
              [route.path, route.method, route.summary, route.operationId, route.tags.join(" ")]
                .join(" ")
                .toLowerCase()
                .includes(normalizedFilter),
            )
          : routes;
        return [module, filtered] as const;
      })
      .filter((entry) => entry[1].length > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [openApiQuery.data, routeFilter]);

  const serviceCards = [
    {
      key: "root",
      title: "Root health",
      value: rootHealthQuery.data?.status ?? "unknown",
      description: "Base liveness endpoint",
      level: rootHealthQuery.isError
        ? ("down" as const)
        : rootHealthQuery.data?.status === "ok"
          ? ("healthy" as const)
          : ("degraded" as const),
    },
    {
      key: "ready",
      title: "Readiness",
      value: readinessQuery.data?.status ?? "unknown",
      description:
        readinessQuery.data?.failures && readinessQuery.data.failures.length > 0
          ? `Dependencies failing: ${readinessQuery.data.failures.join(", ")}`
          : "Dependency checks for database and redis",
      level: readinessQuery.isError
        ? ("down" as const)
        : readinessQuery.data?.status === "ready"
          ? ("healthy" as const)
          : ("degraded" as const),
    },
    {
      key: "api",
      title: "API health",
      value: apiHealthQuery.data?.status ?? "unknown",
      description: "Versioned API service health",
      level: apiHealthQuery.isError
        ? ("down" as const)
        : apiHealthQuery.data?.status === "ok"
          ? ("healthy" as const)
          : ("degraded" as const),
    },
    {
      key: "metrics",
      title: "Metrics endpoint",
      value: metricsQuery.data ? `${metricsQuery.data.totalSeries} series` : "unknown",
      description: "Prometheus metrics scrape output",
      level: metricsQuery.isError ? ("down" as const) : ("healthy" as const),
    },
    {
      key: "contract",
      title: "OpenAPI contract",
      value: openApiQuery.data ? `${openApiQuery.data.routeCount} routes` : "unavailable",
      description: "Live endpoint catalog for API explorer",
      level: openApiQuery.isError
        ? ("degraded" as const)
        : openApiQuery.isLoading
          ? ("degraded" as const)
          : ("healthy" as const),
    },
  ];

  function refreshAll() {
    void Promise.all([
      rootHealthQuery.refetch(),
      readinessQuery.refetch(),
      apiHealthQuery.refetch(),
      metricsQuery.refetch(),
      openApiQuery.refetch(),
      endpointProbesQuery.refetch(),
      observabilityQuery.refetch(),
    ]);
  }

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="Developer monitoring"
        title="Operational control center"
        subtitle="Live service health, endpoint probes, API explorer metadata, metrics analytics, and observability access links."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
            >
              <RefreshCw size={15} /> Refresh now
            </button>

            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
                className="h-4 w-4 accent-cyan-700"
              />
              Auto refresh
            </label>

            <select
              value={refreshMs}
              disabled={!autoRefresh}
              onChange={(event) => setRefreshMs(Number(event.target.value))}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshPresets.map((value) => (
                <option key={value} value={value}>
                  Every {Math.round(value / 1000)}s
                </option>
              ))}
            </select>
          </div>
        }
      />

      {isLoading ? <Loader label="Loading service statuses..." /> : null}

      {hasCriticalError ? (
        <ApiError message="One or more core monitoring data sources could not be fetched. Partial data is shown where available." />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {serviceCards.map((service) => (
          <article key={service.key} className="glass-panel rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{service.title}</p>
              <HealthBadge level={service.level} />
            </div>
            <p className="mt-2 text-2xl font-semibold capitalize text-slate-900">{service.value}</p>
            <p className="mt-2 text-xs text-slate-600">{service.description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="glass-panel rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Requests observed</p>
            <HeartPulse size={16} className="text-cyan-700" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {Math.round(metricsQuery.data?.requestCount ?? 0)}
          </p>
        </article>

        <article className="glass-panel rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              In-progress requests
            </p>
            <Clock3 size={16} className="text-cyan-700" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {metricsQuery.data?.inProgressRequests
              ? Math.round(metricsQuery.data.inProgressRequests)
              : 0}
          </p>
        </article>

        <article className="glass-panel rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resident memory</p>
            <ServerCog size={16} className="text-cyan-700" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatBytes(metricsQuery.data?.residentMemoryBytes ?? null)}
          </p>
        </article>

        <article className="glass-panel rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Virtual memory</p>
            <ServerCog size={16} className="text-cyan-700" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatBytes(metricsQuery.data?.virtualMemoryBytes ?? null)}
          </p>
        </article>

        <article className="glass-panel rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">CPU seconds</p>
            <TerminalSquare size={16} className="text-cyan-700" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {(metricsQuery.data?.cpuSeconds ?? 0).toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Open FDs:{" "}
            {metricsQuery.data?.openFileDescriptors
              ? Math.round(metricsQuery.data.openFileDescriptors)
              : 0}
          </p>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="glass-panel rounded-3xl p-5">
          <h2 className="text-2xl text-slate-900">Request volume by endpoint</h2>
          <p className="mt-1 text-sm text-slate-600">
            Top handlers from Prometheus request counters.
          </p>

          {topEndpointData.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No endpoint traffic yet"
                description="Request data will appear once API calls are captured in metrics."
              />
            </div>
          ) : (
            <div className="mt-4 h-80 w-full">
              <ResponsiveContainer>
                <BarChart
                  data={topEndpointData}
                  margin={{ top: 12, right: 12, bottom: 28, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                  <XAxis
                    dataKey="endpoint"
                    tick={{ fill: "#334155", fontSize: 11 }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    height={70}
                  />
                  <YAxis tick={{ fill: "#334155", fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0f4a7c" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="glass-panel rounded-3xl p-5">
          <h2 className="text-2xl text-slate-900">Request status classes</h2>
          <p className="mt-1 text-sm text-slate-600">
            2xx, 4xx, and 5xx distribution from live counters.
          </p>

          {statusBreakdownData.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No status data yet"
                description="Status distribution appears when request counters are available."
              />
            </div>
          ) : (
            <div className="mt-4 h-80 w-full">
              <ResponsiveContainer>
                <BarChart
                  data={statusBreakdownData}
                  margin={{ top: 12, right: 12, bottom: 20, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                  <XAxis dataKey="status" tick={{ fill: "#334155", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#334155", fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#18b5c4" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </section>

      <section className="glass-panel rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl text-slate-900">Endpoint health checks</h2>
            <p className="text-sm text-slate-600">
              Latency and status-code probes across critical routes.
            </p>
          </div>
          <p className="text-xs text-slate-500">Updated: {new Date().toLocaleTimeString()}</p>
        </div>

        {endpointProbesQuery.isError ? (
          <ApiError message="Unable to run endpoint probes." />
        ) : endpointProbesQuery.data ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-3 py-2">Endpoint</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">HTTP</th>
                  <th className="px-3 py-2">Latency</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {endpointProbesQuery.data.map((probe) => (
                  <tr key={probe.id} className="rounded-2xl bg-white/80 text-slate-700">
                    <td className="px-3 py-3 align-top">
                      <p className="font-semibold text-slate-900">{probe.label}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {(probe.method ?? "GET").toUpperCase()} {probe.path}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <HealthBadge level={probe.status} />
                    </td>
                    <td className="px-3 py-3 align-top">{probe.statusCode ?? "-"}</td>
                    <td className="px-3 py-3 align-top">{probe.latencyMs} ms</td>
                    <td className="px-3 py-3 align-top text-xs text-slate-600">{probe.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <article className="glass-panel rounded-3xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl text-slate-900">API explorer</h2>
              <p className="text-sm text-slate-600">
                {openApiQuery.data
                  ? `${openApiQuery.data.title} v${openApiQuery.data.version} • ${openApiQuery.data.routeCount} routes`
                  : "OpenAPI metadata from backend runtime"}
              </p>
            </div>

            <label className="relative min-w-60">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-2.5 text-slate-500"
              />
              <input
                value={routeFilter}
                onChange={(event) => setRouteFilter(event.target.value)}
                placeholder="Filter routes, method, or tags"
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm"
              />
            </label>
          </div>

          {openApiQuery.isError ? (
            <div className="mt-4">
              <ApiError message="OpenAPI schema is unavailable. Check proxy settings or backend docs route." />
            </div>
          ) : filteredRouteGroups.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No routes match your filter"
                description="Clear the filter or refresh to fetch the latest API contract."
              />
            </div>
          ) : (
            <div className="mt-4 max-h-[28rem] space-y-4 overflow-y-auto pr-1">
              {filteredRouteGroups.map(([module, routes]) => (
                <div key={module} className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Module: {module}
                  </p>
                  <div className="mt-2 space-y-2">
                    {routes.map((route) => (
                      <div
                        key={route.operationId}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                            {route.method}
                          </span>
                          <span className="font-mono text-xs text-slate-700">{route.path}</span>
                          {route.secured ? (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              protected
                            </span>
                          ) : (
                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                              public
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{route.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="space-y-5">
          <div className="glass-panel rounded-3xl p-5">
            <h2 className="text-2xl text-slate-900">Quick actions</h2>
            <p className="mt-1 text-sm text-slate-600">
              Open core health and docs endpoints instantly.
            </p>
            <div className="mt-4 grid gap-2">
              <a
                href="/health"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
              >
                Open /health
              </a>
              <a
                href="/ready"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
              >
                Open /ready
              </a>
              <a
                href="/metrics"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
              >
                Open /metrics
              </a>
              <a
                href="/docs"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
              >
                Open /docs
              </a>
              <a
                href="/openapi.json"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
              >
                Open /openapi.json
              </a>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <h2 className="text-2xl text-slate-900">Logs and observability</h2>
            <p className="mt-1 text-sm text-slate-600">
              Availability probes for external metrics, tracing, and logging tools.
            </p>

            {observabilityQuery.isLoading ? (
              <div className="mt-3">
                <Loader label="Checking observability tools..." />
              </div>
            ) : observabilityQuery.data ? (
              <ul className="mt-4 space-y-2">
                {observabilityQuery.data.map((tool) => (
                  <li
                    key={tool.id}
                    className="rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-slate-900 underline-offset-4 hover:underline"
                      >
                        {tool.name}
                      </a>
                      {tool.status === "online" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 size={12} /> Online
                        </span>
                      ) : tool.status === "offline" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800">
                          <AlertTriangle size={12} /> Offline
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                          <AlertTriangle size={12} /> Unknown
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{tool.purpose}</p>
                    <p className="mt-1 text-xs text-slate-500">{tool.detail}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}
