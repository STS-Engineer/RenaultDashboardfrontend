import { useMemo, useRef, useState } from "react";

type Props = {
  disabled?: boolean;
  onFileSelected: (file: File) => void;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export default function FileDropzone({ disabled, onFileSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);
  const [picked, setPicked] = useState<File | null>(null);
  const [error, setError] = useState("");

  const accept = useMemo(() => ".csv,.CSV,text/csv,text/plain", []);

  function pickFile(file: File | null) {
    setError("");
    if (!file) return;

    // basic validation: must look like csv
    const name = file.name.toLowerCase();
    const ok = name.endsWith(".csv") || file.type === "text/csv" || file.type === "text/plain";
    if (!ok) {
      setError("Please select a .csv file (or a text/csv file).");
      return;
    }

    setPicked(file);
    onFileSelected(file);
  }

  return (
    <div className="space-y-2">
      <div
        className={[
          "rounded-2xl border border-dashed p-6 transition",
          "bg-white dark:bg-white/[0.03]",
          "border-gray-300 dark:border-gray-700",
          isOver ? "ring-3 ring-brand-500/20 border-brand-500" : "",
          disabled ? "opacity-60 pointer-events-none" : "",
        ].join(" ")}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOver(false);
          const file = e.dataTransfer.files?.[0] ?? null;
          pickFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <div className="flex flex-col items-center text-center gap-2">
          <div className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Drag & drop your CSV here
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            or click to choose a file
          </div>

          <div className="mt-3 inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            Choose file
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      {picked && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
          <div className="font-medium">Selected:</div>
          <div className="mt-1">
            {picked.name} <span className="text-gray-400">• {formatBytes(picked.size)}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-500">{error}</div>
      )}
    </div>
  );
}
