import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

const ACCEPT =
  ".csv,.txt,.xlsx,.xls,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function isAllowed(file: File) {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".csv") ||
    name.endsWith(".txt") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls")
  );
}

export default function UploadCsv() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "bad" | "info"; text: string } | null>(null);

  const pick = () => inputRef.current?.click();

  const onSelectFile = (f: File | null) => {
    if (!f) return;
    if (!isAllowed(f)) {
      setFile(null);
      setMsg({ type: "bad", text: "Type non supporté. Choisir CSV / XLSX / TXT." });
      return;
    }
    setFile(f);
    setMsg({
      type: "info",
      text: `Sélectionné: ${f.name} (${Math.round(f.size / 1024)} KB)`,
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    onSelectFile(f ?? null);
  };

  const upload = async () => {
    if (!file) {
      setMsg({ type: "bad", text: "Veuillez sélectionner un fichier." });
      return;
    }

    setLoading(true);
    setMsg({ type: "info", text: "Upload en cours…" });

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 0,
      });

      const testName = res.data?.test ?? "";
      const rows = res.data?.rows ?? "";
      const testId = res.data?.test_id;

      setMsg({ type: "ok", text: `✅ Import OK: ${testName} (${rows} lignes)` });

      // ✅ redirect to the viewer route you actually have: /tests
      if (typeof testId === "number") {
        navigate(`/tests?testId=${testId}`);
      } else {
        // fallback: go to viewer anyway
        navigate(`/tests`);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setMsg({ type: "bad", text: `❌ Upload failed: ${detail || err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90">
          Upload fichier (CSV / Excel / TXT)
        </div>

        <div
          className={[
            "mt-6 rounded-2xl border-2 border-dashed p-10 transition",
            dragOver ? "border-brand-500 bg-brand-500/5" : "border-gray-200 dark:border-gray-800",
            loading ? "opacity-60 pointer-events-none" : "",
          ].join(" ")}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="text-base font-medium text-gray-800 dark:text-white/90">
              Drag & drop votre fichier ici
            </div>
            <button
              type="button"
              onClick={pick}
              className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              Choisir un fichier
            </button>

            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={ACCEPT}
              onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={upload}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? "Upload…" : "Upload"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setFile(null);
              setMsg(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 disabled:opacity-60"
          >
            Reset
          </button>
        </div>

        {msg && (
          <div
            className={[
              "mt-6 rounded-xl border p-4 text-sm",
              msg.type === "ok" ? "border-green-200 bg-green-50 text-green-700" : "",
              msg.type === "bad" ? "border-red-200 bg-red-50 text-red-700" : "",
              msg.type === "info" ? "border-gray-200 bg-gray-50 text-gray-700" : "",
            ].join(" ")}
          >
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}
