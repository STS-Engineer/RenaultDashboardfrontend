import { useEffect, useMemo, useRef, useState } from "react";
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
} from "recharts";

type Test = { id: number; name: string };

type Point = {
  idx: number;
  t_hour: number;
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

export default function LiveTestViewer() {
  const [tests, setTests] = useState<Test[]>([]);
  const [testId, setTestId] = useState<number | null>(null);
  const [system, setSystem] = useState<1 | 2 | 3>(1);
  const [live, setLive] = useState(false);
  const [data, setData] = useState<Point[]>([]);
  const [lastUpdate, setLastUpdate] = useState("—");

  const lastIdxRef = useRef(0);

  /* -----------------------
     Load available tests
  ------------------------*/
  useEffect(() => {
    api.get<Test[]>("/tests").then((res) => {
      setTests(res.data);
      if (res.data.length && testId === null) {
        setTestId(res.data[0].id);
      }
    });
  }, []);

  /* -----------------------
     Live polling
  ------------------------*/
  useEffect(() => {
    if (!live || testId === null) return;

    const timer = setInterval(async () => {
      const res = await api.get<Point[]>("/live_series", {
        params: {
          test_id: testId,
          system,
          from_idx: lastIdxRef.current,
          limit: 500,
        },
      });

      if (res.data.length > 0) {
        lastIdxRef.current = res.data[res.data.length - 1].idx;
        setData((prev) => [...prev, ...res.data]);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [live, testId, system]);

  /* -----------------------
     Derived chart data
  ------------------------*/
  const chartData = useMemo(() => {
    return data.map((p) => ({
      ...p,
      current_a: p.cons,
      vdrop:
        p.t1 != null && p.t2 != null && p.t3 != null
          ? (p.t1 + p.t2 + p.t3) / 3
          : null,
      hv_minus_avg:
        p.b1 != null && p.b2 != null ? (p.b1 + p.b2) / 2 : null,
      hv_plus_avg:
        p.b3 != null && p.b4 != null ? (p.b3 + p.b4) / 2 : null,
    }));
  }, [data]);

  return (
    <>
      <PageMeta
        title="Live Test Viewer"
        description="Real-time visualization of Renault test benches"
      />

      <div className="space-y-6">
        {/* CONTROL BAR */}
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">🔴 Live Test Viewer</h1>
            <span className="text-xs text-gray-500">
              Last update: {lastUpdate}
            </span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-5">
            {/* Test */}
            <div>
              <label className="text-xs text-gray-500">Test</label>
              <select
                disabled={live}
                className="mt-1 w-full rounded border px-2 py-1"
                value={testId ?? ""}
                onChange={(e) => setTestId(Number(e.target.value))}
              >
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* System */}
            <div>
              <label className="text-xs text-gray-500">System</label>
              <select
                disabled={live}
                className="mt-1 w-full rounded border px-2 py-1"
                value={system}
                onChange={(e) => setSystem(Number(e.target.value) as 1 | 2 | 3)}
              >
                <option value={1}>System 1</option>
                <option value={2}>System 2</option>
                <option value={3}>System 3</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex items-end gap-3 md:col-span-3">
              <button
                disabled={!testId || live}
                onClick={() => {
                  setData([]);
                  lastIdxRef.current = 0;
                  setLive(true);
                }}
                className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
              >
                ▶ Start Live
              </button>

              <button
                disabled={!live}
                onClick={() => setLive(false)}
                className="rounded bg-gray-600 px-4 py-2 text-white disabled:opacity-50"
              >
                ■ Stop
              </button>

              {live && (
                <span className="text-sm text-red-600 font-medium">
                  LIVE — receiving data
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CHARTS (same as TestViewer) */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Chart title="Voltage drop (V)" dataKey="vdrop" color="#2563eb" data={chartData} />
          <Chart title="Current (A)" dataKey="current_a" color="#f59e0b" data={chartData} />
          <Chart title="RPM" dataKey="rpm" color="#7c3aed" data={chartData} />
          <Chart title="HV+ avg" dataKey="hv_plus_avg" color="#16a34a" data={chartData} />
          <Chart title="Lower box temp" dataKey="l1" color="#14b8a6" data={chartData} />
          <Chart title="Support temp" dataKey="sup" color="#64748b" data={chartData} />
        </div>
      </div>
    </>
  );
}

function Chart({ title, dataKey, color, data }: any) {
  return (
    <div className="rounded-xl border p-4">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="t_hour" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
