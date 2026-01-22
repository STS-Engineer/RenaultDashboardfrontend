import  { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { api } from "../../lib/api";

type Test = { id: number; name: string };

type CellStats = {
  value: number | null; // median vdrop
  p05: number | null;
  p95: number | null;
  n: number; // samples used
};

type Grid = Record<string, Record<string, CellStats>>; // grid[iA][rpm] => stats

type CharResponse = {
  temps: Record<string, Grid>; // "20" | "60" | "90" | "120" => grid
  meta?: {
    life: string;
    system: number;
    dt_sec: number;
    temp_col: string;
    temp_tol: number;
    window: { start_idx: number; end_idx: number };
  };
};

const SPEEDS = [1000, 4000, 6000, 9000, 12000, 14000];
const CURRENTS = [2, 5, 9, 12, 17, 22];
const TEMP_TARGETS = [20, 60, 90, 120];

function fmt(v: unknown, d = 3) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? v.toFixed(d) : "";
  return String(v);
}

function GridTable({
  title,
  grid,
  loading,
  error,
}: {
  title: string;
  grid: Grid | null;
  loading: boolean;
  error: string;
}) {
  const [hover, setHover] = useState<{ iA: number; rpm: number; cell: CellStats | null } | null>(null);

  const getCell = (iA: number, rpm: number): CellStats | null => {
    if (!grid) return null;
    const row = grid[String(iA)];
    if (!row) return null;
    return row[String(rpm)] ?? null;
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{title}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Cell = median voltage drop (V). Hover for p05/p95 and N.
          </div>
        </div>
        {loading && <div className="text-xs text-gray-500">Loading…</div>}
        {!loading && error && <div className="text-xs text-red-500">{error}</div>}
      </div>

      <div className="mt-4 overflow-auto">
        <table className="min-w-[820px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 px-3 py-2 text-left text-xs text-gray-500">
                If (A) ↓ / Speed (rpm) →
              </th>
              {SPEEDS.map((rpm) => (
                <th key={rpm} className="border border-gray-200 dark:border-gray-800 px-3 py-2 text-xs text-gray-500">
                  {rpm}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {CURRENTS.map((iA) => (
              <tr key={iA}>
                <td className="sticky left-0 z-10 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 px-3 py-2 font-medium text-gray-700 dark:text-gray-200">
                  {iA}
                </td>

                {SPEEDS.map((rpm) => {
                  const cell = getCell(iA, rpm);
                  const v = cell?.value ?? null;

                  return (
                    <td
                      key={rpm}
                      className="border border-gray-200 dark:border-gray-800 px-3 py-2 text-center"
                      onMouseEnter={() => setHover({ iA, rpm, cell })}
                      onMouseLeave={() => setHover(null)}
                      title={
                        cell
                          ? `median=${fmt(cell.value)} p05=${fmt(cell.p05)} p95=${fmt(cell.p95)} n=${cell.n}`
                          : "no data"
                      }
                    >
                      {v == null ? "—" : fmt(v, 3)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hover && (
        <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">
          <span className="font-medium">Hover:</span> If={hover.iA}A, RPM={hover.rpm} →{" "}
          median={fmt(hover.cell?.value)} p05={fmt(hover.cell?.p05)} p95={fmt(hover.cell?.p95)} n={hover.cell?.n ?? ""}
        </div>
      )}
    </div>
  );
}

export default function Characterization() {
  const [tests, setTests] = useState<Test[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [system, setSystem] = useState<1 | 2 | 3>(1);

  // plateau params
  const dt_sec = 0.05;
  const min_plateau_sec = 60;
  const take_last_sec = 60;
  const rpm_tol = 150;
  const i_tol = 0.4;

  // temp grouping params
  const temp_tol = 10; // ±10°C around 20/60/90/120
  const temp_targets = TEMP_TARGETS.join(",");

  const [bol, setBol] = useState<CharResponse | null>(null);
  const [mid, setMid] = useState<CharResponse | null>(null);
  const [eol, setEol] = useState<CharResponse | null>(null);

  const [loading, setLoading] = useState({ bol: false, mid: false, eol: false });
  const [error, setError] = useState({ bol: "", mid: "", eol: "" });

  async function loadTests() {
    const res = await api.get<Test[]>("/tests");
    setTests(res.data);
    if (res.data.length && selected === null) setSelected(res.data[0].id);
  }

  async function loadLife(life: "bol" | "mid" | "eol") {
    if (selected == null) return;

    setLoading((s) => ({ ...s, [life]: true }));
    setError((s) => ({ ...s, [life]: "" }));

    try {
      const res = await api.get<CharResponse>(`/characterization/${selected}`, {
        params: {
          system,
          life, // IMPORTANT: mid not mol
          dt_sec,
          min_plateau_sec,
          take_last_sec,
          rpm_tol,
          i_tol,
          temp_targets,
          temp_tol,
        },
      });

      if (life === "bol") setBol(res.data);
      if (life === "mid") setMid(res.data);
      if (life === "eol") setEol(res.data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err.message;
      setError((s) => ({ ...s, [life]: `❌ ${detail}` }));

      if (life === "bol") setBol(null);
      if (life === "mid") setMid(null);
      if (life === "eol") setEol(null);
    } finally {
      setLoading((s) => ({ ...s, [life]: false }));
    }
  }

  async function reloadAll() {
    await Promise.all([loadLife("bol"), loadLife("mid"), loadLife("eol")]);
  }

  useEffect(() => {
    loadTests().catch(() => {});
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (selected == null) return;
    reloadAll();
    // eslint-disable-next-line
  }, [selected, system]);

  const testName = useMemo(() => tests.find((t) => t.id === selected)?.name ?? "", [tests, selected]);

  const getGrid = (resp: CharResponse | null, temp: number): Grid | null => {
    const key = String(temp);
    return resp?.temps?.[key] ?? null;
  };

  return (
    <>
      <PageMeta title="Characterization" description="Voltage drop maps" />

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            Characterization (Voltage drop maps)
          </div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            12 tables per system: BOL/MID/EOL × 20/60/90/120°C (grouped by DATA_TEMPERATURE_SS_CONTACT ±{temp_tol}°C)
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
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
              {testName && <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">{testName}</div>}
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
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Voltage uses TENSION{system}, current uses CONS_ALIM_{system}, temps use S{system} sensors.
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={reloadAll}
                disabled={selected == null}
                className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
              >
                Reload all
              </button>
            </div>
          </div>
        </div>

        {/* BOL */}
        <div className="space-y-4">
          <div className="text-base font-semibold text-gray-900 dark:text-white">Beginning of test (BOL)</div>
          <div className="grid gap-6 lg:grid-cols-2">
            {TEMP_TARGETS.map((temp) => (
              <GridTable
                key={`bol-${temp}`}
                title={`BOL — Amb ≈ ${temp}°C`}
                grid={getGrid(bol, temp)}
                loading={loading.bol}
                error={error.bol}
              />
            ))}
          </div>
        </div>

        {/* MID */}
        <div className="space-y-4">
          <div className="text-base font-semibold text-gray-900 dark:text-white">Middle of test (MID)</div>
          <div className="grid gap-6 lg:grid-cols-2">
            {TEMP_TARGETS.map((temp) => (
              <GridTable
                key={`mid-${temp}`}
                title={`MID — Amb ≈ ${temp}°C`}
                grid={getGrid(mid, temp)}
                loading={loading.mid}
                error={error.mid}
              />
            ))}
          </div>
        </div>

        {/* EOL */}
        <div className="space-y-4">
          <div className="text-base font-semibold text-gray-900 dark:text-white">End of test (EOL)</div>
          <div className="grid gap-6 lg:grid-cols-2">
            {TEMP_TARGETS.map((temp) => (
              <GridTable
                key={`eol-${temp}`}
                title={`EOL — Amb ≈ ${temp}°C`}
                grid={getGrid(eol, temp)}
                loading={loading.eol}
                error={error.eol}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
