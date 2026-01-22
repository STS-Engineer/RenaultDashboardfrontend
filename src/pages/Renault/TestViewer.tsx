import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { api } from "../../lib/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type Test = { id: number; name: string };

// ✅ FIX: backend returns current_a (NOT cons)
type BackendSeriesPoint = {
  idx: number;
  t_sec?: number | null;
  hours?: number | null;

  rpm: number | null;
  current_a: number | null;

  vdrop?: number | null; // backend may send vdrop
  t1: number | null;
  t2: number | null;
  t3: number | null;

  b1: number | null;
  b2: number | null;
  b3: number | null;
  b4: number | null;

  l1: number | null;
  l2: number | null;
  sup: number | null;
};

type UiPoint = BackendSeriesPoint & {
  t_hour: number; // x-axis in hours
  vdrop: number | null;

  hv_minus_avg: number | null;
  hv_plus_avg: number | null;
};

const COLORS = {
  vdrop: "#2563eb",
  current: "#f59e0b",
  rpm: "#7c3aed",
  b1: "#0ea5e9",
  b2: "#f97316",
  b3: "#22c55e",
  b4: "#e11d48",
  hvp: "#16a34a",
  hvn: "#dc2626",
  l1: "#14b8a6",
  l2: "#a855f7",
  sup: "#64748b",
} as const;

function fmt(v: unknown) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? v.toFixed(3) : "";
  return String(v);
}

function ChartCard({
  title,
  children,
  onOpen,
}: {
  title: string;
  children: React.ReactNode;
  onOpen?: () => void;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]",
        onOpen ? "cursor-zoom-in hover:shadow-sm transition" : "",
      ].join(" ")}
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onOpen) return;
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {title}
        </div>
        {onOpen && (
          <div className="text-xs text-gray-400 dark:text-gray-500">
            Click to enlarge
          </div>
        )}
      </div>
      <div className="h-[280px] w-full">{children}</div>
    </div>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-[95vw] max-w-6xl rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold text-gray-900 dark:text-white">
              {title}
            </div>
            <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              ESC or click outside to close
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-white/[0.06]"
          >
            Close
          </button>
        </div>
        <div className="h-[70vh] w-full">{children}</div>
      </div>
    </div>
  );
}

type ChartId = "vdrop" | "current" | "rpm" | "brush" | "lower" | "support";

export default function TestViewer() {
  const [searchParams] = useSearchParams();

  const [tests, setTests] = useState<Test[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  const [system, setSystem] = useState<1 | 2 | 3>(1);
  const [step, setStep] = useState(400);

  const [tStartSec, setTStartSec] = useState(0);
  const [tEndSec, setTEndSec] = useState(0);

  const [series, setSeries] = useState<BackendSeriesPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalChart, setModalChart] = useState<ChartId | null>(null);

  const DT_SEC = 0.05;

  async function loadTests() {
    try {
      setStatus("");
      const res = await api.get<Test[]>("/tests");
      setTests(res.data);
    } catch {
      setStatus("❌ Backend not reachable");
    }
  }

  async function loadSeries(testId: number) {
    setLoading(true);
    setStatus("");
    try {
      const res = await api.get<BackendSeriesPoint[]>(`/series/${testId}`, {
        params: {
          system,
          step,
          dt_sec: DT_SEC,
          t_start_sec: tStartSec,
          t_end_sec: tEndSec,
        },
      });
      setSeries(res.data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setStatus(`❌ Failed to load series: ${detail || err.message}`);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTests();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!tests.length) return;
    const qp = searchParams.get("testId");
    const qpId = qp ? Number(qp) : NaN;

    if (!Number.isNaN(qpId) && tests.some((t) => t.id === qpId)) {
      setSelected(qpId);
    } else if (selected === null) {
      setSelected(tests[0].id);
    }
    // eslint-disable-next-line
  }, [tests, searchParams]);

  useEffect(() => {
    if (selected != null) loadSeries(selected);
    // eslint-disable-next-line
  }, [selected, system, step, tStartSec, tEndSec]);

  // ✅ FIX: keep using backend current_a directly
  const data: UiPoint[] = useMemo(() => {
    return series.map((p) => {
      const tSec =
        (typeof p.t_sec === "number" ? p.t_sec : p.idx * DT_SEC) ?? p.idx * DT_SEC;

      const hours =
        typeof p.hours === "number" && Number.isFinite(p.hours)
          ? p.hours
          : tSec / 3600;

      // Prefer backend vdrop if present; else compute from t1/t2/t3
      const vdrop =
        typeof p.vdrop === "number"
          ? p.vdrop
          : p.t1 != null && p.t2 != null && p.t3 != null
          ? (p.t1 + p.t2 + p.t3) / 3
          : null;

      const hv_minus_avg =
        p.b1 != null && p.b2 != null ? (p.b1 + p.b2) / 2 : null;

      const hv_plus_avg =
        p.b3 != null && p.b4 != null ? (p.b3 + p.b4) / 2 : null;

      return {
        ...p,
        t_hour: hours,
        vdrop,
        hv_minus_avg,
        hv_plus_avg,
      };
    });
  }, [series]);

  const commonTooltip = (
    <Tooltip
      formatter={(value, name) => [fmt(value), String(name)]}
      labelFormatter={(label) => `hours: ${Number(label).toFixed(3)}`}
    />
  );

  const renderChart = (chartId: ChartId) => {
    switch (chartId) {
      case "vdrop":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t_hour" tickFormatter={(v) => Number(v).toFixed(0)} />
              <YAxis />
              {commonTooltip}
              <Legend />
              <Line
                type="monotone"
                name="Voltage drop (V)"
                dataKey="vdrop"
                stroke={COLORS.vdrop}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "current":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t_hour" tickFormatter={(v) => Number(v).toFixed(0)} />
              <YAxis />
              {commonTooltip}
              <Legend />
              {/* ✅ FIX: this now works because backend returns current_a and we keep it */}
              <Line
                type="monotone"
                name="Current (A)"
                dataKey="current_a"
                stroke={COLORS.current}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "rpm":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t_hour" tickFormatter={(v) => Number(v).toFixed(0)} />
              <YAxis />
              {commonTooltip}
              <Legend />
              <Line
                type="monotone"
                name="RPM"
                dataKey="rpm"
                stroke={COLORS.rpm}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "brush":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t_hour" tickFormatter={(v) => Number(v).toFixed(0)} />
              <YAxis />
              {commonTooltip}
              <Legend />
              <Line type="monotone" name="Brush 1" dataKey="b1" stroke={COLORS.b1} dot={false} isAnimationActive={false} />
              <Line type="monotone" name="Brush 2" dataKey="b2" stroke={COLORS.b2} dot={false} isAnimationActive={false} />
              <Line type="monotone" name="Brush 3" dataKey="b3" stroke={COLORS.b3} dot={false} isAnimationActive={false} />
              <Line type="monotone" name="Brush 4" dataKey="b4" stroke={COLORS.b4} dot={false} isAnimationActive={false} />
              <Line type="monotone" name="HV- avg" dataKey="hv_minus_avg" stroke={COLORS.hvn} dot={false} isAnimationActive={false} />
              <Line type="monotone" name="HV+ avg" dataKey="hv_plus_avg" stroke={COLORS.hvp} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        );

      case "lower":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t_hour" tickFormatter={(v) => Number(v).toFixed(0)} />
              <YAxis />
              {commonTooltip}
              <Legend />
              <Line type="monotone" name="Lower 1" dataKey="l1" stroke={COLORS.l1} dot={false} isAnimationActive={false} />
              <Line type="monotone" name="Lower 2" dataKey="l2" stroke={COLORS.l2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        );

      case "support":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t_hour" tickFormatter={(v) => Number(v).toFixed(0)} />
              <YAxis />
              {commonTooltip}
              <Legend />
              <Line
                type="monotone"
                name="Plastic support"
                dataKey="sup"
                stroke={COLORS.sup}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const modalTitle =
    modalChart === "vdrop"
      ? `System ${system} — Voltage drop vs Time (hours)`
      : modalChart === "current"
      ? `System ${system} — Current vs Time (hours)`
      : modalChart === "rpm"
      ? `System ${system} — RPM vs Time (hours)`
      : modalChart === "brush"
      ? `System ${system} — Brush temperatures vs Time (hours)`
      : modalChart === "lower"
      ? `System ${system} — Lower Brush Box temps vs Time (hours)`
      : modalChart === "support"
      ? `System ${system} — Plastic support temp vs Time (hours)`
      : "";

  return (
    <>
      <PageMeta title="Renault Test Viewer" description="View Renault test charts" />

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Renault Test Viewer
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Time axis = idx × 0.05s (50ms) • System view (1/2/3)
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-6">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">Test</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
                value={selected ?? ""}
                onChange={(e) => setSelected(Number(e.target.value))}
              >
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">System</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
                value={system}
                onChange={(e) => setSystem(Number(e.target.value) as 1 | 2 | 3)}
              >
                <option value={1}>System 1</option>
                <option value={2}>System 2</option>
                <option value={3}>System 3</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Downsample step</label>
              <input
                type="number"
                min={1}
                value={step}
                onChange={(e) => setStep(Math.max(1, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Start (sec)</label>
              <input
                type="number"
                min={0}
                value={tStartSec}
                onChange={(e) => setTStartSec(Math.max(0, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">End (sec, 0=all)</label>
              <input
                type="number"
                min={0}
                value={tEndSec}
                onChange={(e) => setTEndSec(Math.max(0, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
              />
            </div>

            <div className="md:col-span-6 flex items-end gap-3">
              <button
                onClick={() => selected != null && loadSeries(selected)}
                disabled={selected == null}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {loading ? "Loading…" : "Reload data"}
              </button>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                Loaded {data.length} points.
              </div>
            </div>
          </div>

          {status && <div className="mt-4 text-sm text-red-500">{status}</div>}

          {!loading && !status && data.length === 0 && (
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              No data returned. Try: set End(sec)=0, Start(sec)=0, and reduce step (e.g. 50–200).
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title={`System ${system} — Voltage drop (V) vs Time`} onOpen={() => setModalChart("vdrop")}>
            {renderChart("vdrop")}
          </ChartCard>

          <ChartCard title={`System ${system} — Current (A) vs Time`} onOpen={() => setModalChart("current")}>
            {renderChart("current")}
          </ChartCard>

          <ChartCard title={`System ${system} — RPM vs Time`} onOpen={() => setModalChart("rpm")}>
            {renderChart("rpm")}
          </ChartCard>

          <ChartCard title={`System ${system} — Brush temperatures (incl. HV+/HV- avg)`} onOpen={() => setModalChart("brush")}>
            {renderChart("brush")}
          </ChartCard>

          <ChartCard title={`System ${system} — Lower Brush Box temperatures`} onOpen={() => setModalChart("lower")}>
            {renderChart("lower")}
          </ChartCard>

          <ChartCard title={`System ${system} — Plastic support temperature`} onOpen={() => setModalChart("support")}>
            {renderChart("support")}
          </ChartCard>
        </div>
      </div>

      <Modal open={modalChart !== null} title={modalTitle} onClose={() => setModalChart(null)}>
        {modalChart ? renderChart(modalChart) : null}
      </Modal>
    </>
  );
}
