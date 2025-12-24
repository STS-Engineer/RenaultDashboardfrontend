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

type Test = {
  id: number;
  name: string;
};

type SeriesPoint = {
  idx: number;
  rpm: number | null;
  cons: number | null;
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

// Distinct palette
const COLORS = {
  t1: "#2563eb",
  t2: "#dc2626",
  t3: "#16a34a",
  cons: "#f59e0b",
  rpm: "#7c3aed",
  b1: "#0ea5e9",
  b2: "#f97316",
  b3: "#22c55e",
  b4: "#e11d48",
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
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

type ChartId = "tension" | "cons" | "rpm" | "brush" | "lower";

export default function TestViewer() {
  const [searchParams] = useSearchParams();

  const [tests, setTests] = useState<Test[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  const [module, setModule] = useState<1 | 2 | 3>(1);
  const [step, setStep] = useState(200);

  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [loading, setLoading] = useState(false);

  // modal state
  const [modalChart, setModalChart] = useState<ChartId | null>(null);

  async function loadTests() {
    try {
      setStatus("");
      const res = await api.get<Test[]>("/tests");
      setTests(res.data);
    } catch {
      setStatus("❌ Backend not reachable");
    }
  }

  async function loadSeries(testId: number, mod: number, stepValue: number) {
    setLoading(true);
    setStatus("");
    try {
      const res = await api.get<SeriesPoint[]>(`/series/${testId}`, {
        params: { module: mod, step: stepValue },
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
    if (selected != null) loadSeries(selected, module, step);
    // eslint-disable-next-line
  }, [selected, module, step]);

  const data = useMemo(() => {
    return series.map((p) => ({
      ...p,
      hours: p.idx / 3600,
    }));
  }, [series]);

  const commonTooltip = (
    <Tooltip
      formatter={(value, name) => [fmt(value), String(name)]}
      labelFormatter={(label) => `hours: ${Number(label).toFixed(2)}`}
    />
  );

  const renderChart = (chartId: ChartId) => {
    switch (chartId) {
      case "tension":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hours" tickFormatter={(v) => Number(v).toFixed(0)} />
              <YAxis />
              {commonTooltip}
              <Legend />
              <Line type="monotone" name="Tension1" dataKey="t1" stroke={COLORS.t1} dot={false} isAnimationActive={false} />
              <Line type="monotone" name="Tension2" dataKey="t2" stroke={COLORS.t2} dot={false} isAnimationActive={false} />
              <Line type="monotone" name="Tension3" dataKey="t3" stroke={COLORS.t3} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "cons":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hours" tickFormatter={(v) => Number(v).toFixed(0)} />
              <YAxis />
              {commonTooltip}
              <Legend />
              <Line type="monotone" name="Cons alim 1" dataKey="cons" stroke={COLORS.cons} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "rpm":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hours" tickFormatter={(v) => Number(v).toFixed(0)} />
              <YAxis />
              {commonTooltip}
              <Legend />
              <Line type="monotone" name="RPM" dataKey="rpm" stroke={COLORS.rpm} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "brush":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hours" tickFormatter={(v) => Number(v).toFixed(0)} />
              <YAxis />
              {commonTooltip}
              <Legend />
              <Line type="monotone" name="Brush 1" dataKey="b1" stroke={COLORS.b1} dot={false} isAnimationActive={false} />
              <Line type="monotone" name="Brush 2" dataKey="b2" stroke={COLORS.b2} dot={false} isAnimationActive={false} />
              <Line type="monotone" name="Brush 3" dataKey="b3" stroke={COLORS.b3} dot={false} isAnimationActive={false} />
              <Line type="monotone" name="Brush 4" dataKey="b4" stroke={COLORS.b4} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "lower":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hours" tickFormatter={(v) => Number(v).toFixed(0)} />
              <YAxis />
              {commonTooltip}
              <Legend />
              <Line type="monotone" name="Lower 1" dataKey="l1" stroke={COLORS.l1} dot={false} isAnimationActive={false} />
              <Line type="monotone" name="Lower 2" dataKey="l2" stroke={COLORS.l2} dot={false} isAnimationActive={false} />
              <Line type="monotone" name="Support" dataKey="sup" stroke={COLORS.sup} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const modalTitle =
    modalChart === "tension"
      ? "U excit (V) — Tension1/2/3 vs Time (hours)"
      : modalChart === "cons"
      ? "I excit (A) — cons_alim_1 vs Time (hours)"
      : modalChart === "rpm"
      ? "Régime (tr/min) — RPM vs Time (hours)"
      : modalChart === "brush"
      ? "Températures balais (°C) — Brush 1..4 vs Time (hours)"
      : modalChart === "lower"
      ? "Lower Brush Box + Plastic support (°C) vs Time (hours)"
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
            CDC “500h” charts (module {module})
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div>
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
              <label className="text-xs text-gray-500 dark:text-gray-400">Module</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
                value={module}
                onChange={(e) => setModule(Number(e.target.value) as 1 | 2 | 3)}
              >
                <option value={1}>Module 1 (S1)</option>
                <option value={2}>Module 2 (S2)</option>
                <option value={3}>Module 3 (S3)</option>
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

            <div className="flex items-end">
              <button
                onClick={() => selected != null && loadSeries(selected, module, step)}
                disabled={selected == null}
                className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {loading ? "Loading…" : "Reload data"}
              </button>
            </div>
          </div>

          {status && <div className="mt-4 text-sm text-red-500">{status}</div>}

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Loaded {data.length} points.
          </div>
        </div>

        {/* CHARTS GRID */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="U excit (V) — Tension1/2/3 vs Time (hours)"
            onOpen={() => setModalChart("tension")}
          >
            {renderChart("tension")}
          </ChartCard>

          <ChartCard
            title="I excit (A) — cons_alim_1 vs Time (hours)"
            onOpen={() => setModalChart("cons")}
          >
            {renderChart("cons")}
          </ChartCard>

          <ChartCard
            title="Régime (tr/min) — RPM vs Time (hours)"
            onOpen={() => setModalChart("rpm")}
          >
            {renderChart("rpm")}
          </ChartCard>

          <ChartCard
            title="Températures balais (°C) — Brush 1..4 vs Time (hours)"
            onOpen={() => setModalChart("brush")}
          >
            {renderChart("brush")}
          </ChartCard>

          <ChartCard
            title="Lower Brush Box + Plastic support (°C) vs Time (hours)"
            onOpen={() => setModalChart("lower")}
          >
            {renderChart("lower")}
          </ChartCard>
        </div>
      </div>

      <Modal
        open={modalChart !== null}
        title={modalTitle}
        onClose={() => setModalChart(null)}
      >
        {modalChart ? renderChart(modalChart) : null}
      </Modal>
    </>
  );
}
