import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine, Search, X } from "lucide-react";
import {
  identifyBarcode,
  lookupBarcode,
  sampleCodes,
  searchCompanies,
  statusLabel,
  tally,
  type Lookup,
  type Status,
} from "@/lib/ledger";

type Tab = "scan" | "search";
type Filter = Status | "all";

const counts = tally();

const tone = {
  red: {
    wash: "bg-red/15 border-red/70",
    chip: "bg-red text-bg",
    dot: "bg-red",
    word: "text-red",
  },
  orange: {
    wash: "bg-amber/14 border-amber/70",
    chip: "bg-amber text-bg",
    dot: "bg-amber",
    word: "text-amber",
  },
  green: {
    wash: "bg-green/14 border-green/70",
    chip: "bg-green text-bg",
    dot: "bg-green",
    word: "text-green",
  },
} as const;

export function Ledger() {
  const [tab, setTab] = useState<Tab>("scan");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [manual, setManual] = useState("");
  const [camera, setCamera] = useState<"starting" | "live" | "off">("off");
  const [cameraNote, setCameraNote] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [recent, setRecent] = useState<Lookup[]>([]);
  const lastCode = useRef("");
  const lastAt = useRef(0);
  const lookupGen = useRef(0);

  function record(next: Lookup) {
    const now = Date.now();
    if (next.code === lastCode.current && now - lastAt.current < 1800) return;
    lastCode.current = next.code;
    lastAt.current = now;
    const gen = ++lookupGen.current;
    setLookup(next);
    setRecent((prev) => [next, ...prev.filter((item) => item.code !== next.code)].slice(0, 4));
    if (next.kind !== "unknown") return;
    void identifyBarcode(next.code).then((refined) => {
      if (!refined || gen !== lookupGen.current) return;
      setLookup(refined);
      setRecent((prev) => [refined, ...prev.filter((item) => item.code !== refined.code)].slice(0, 4));
    });
  }

  function submitManual(code = manual) {
    const next = lookupBarcode(code);
    if (!next.code) return;
    record(next);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-bg text-ink">
      <header className="flex items-end justify-between gap-4 px-5 pt-5 pb-3">
        <div>
          <p className="font-mono text-xs tracking-widest text-faint uppercase">Field ledger</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Boycott Ledger</h1>
        </div>
        <ul className="flex gap-3 pb-1 font-mono text-xs text-muted">
          <Count n={counts.red} status="red" />
          <Count n={counts.orange} status="orange" />
          <Count n={counts.green} status="green" />
        </ul>
      </header>

      <div className="mx-5 grid grid-cols-2 rounded-full bg-panel p-1 ring-1 ring-line">
        <TabButton active={tab === "scan"} onClick={() => setTab("scan")} label="Scanner" />
        <TabButton active={tab === "search"} onClick={() => setTab("search")} label="Database" />
      </div>

      {tab === "scan" ? (
        <section className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-6">
          <Scanner
            active
            camera={camera}
            onCode={(code) => record(lookupBarcode(code))}
            onState={(state, note) => {
              setCamera(state);
              setCameraNote(note);
            }}
          />
          <div className="flex items-center justify-between px-1">
            <p className="flex items-center gap-2 font-mono text-xs tracking-wide text-muted uppercase">
              <span
                className={
                  camera === "live"
                    ? "size-1.5 rounded-full bg-green"
                    : "size-1.5 rounded-full bg-faint"
                }
              />
              {camera === "live" ? "Camera live" : camera === "starting" ? "Opening camera" : "Camera off"}
            </p>
            {cameraNote ? <p className="text-xs text-faint">{cameraNote}</p> : null}
          </div>

          <Result lookup={lookup} />

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitManual();
            }}
          >
            <label className="sr-only" htmlFor="manual-code">
              Enter a barcode
            </label>
            <input
              id="manual-code"
              inputMode="numeric"
              autoComplete="off"
              value={manual}
              onChange={(event) => setManual(event.target.value)}
              placeholder="Type a barcode"
              className="h-12 min-w-0 flex-1 rounded-md border border-line bg-panel px-4 font-mono text-sm text-ink outline-none placeholder:text-faint focus:border-muted"
            />
            <button
              type="submit"
              className="h-12 rounded-md bg-ink px-4 text-sm font-medium text-bg"
            >
              Check
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {sampleCodes.map((sample) => (
              <button
                key={sample.code}
                type="button"
                onClick={() => {
                  setManual(sample.code);
                  submitManual(sample.code);
                }}
                className="rounded-full border border-line bg-panel-2 px-3 py-2 font-mono text-xs text-muted"
              >
                {sample.label}
              </button>
            ))}
          </div>

          {recent.length > 1 ? (
            <ul className="mt-auto flex flex-col gap-2">
              {recent.slice(1).map((item) => (
                <li key={item.code}>
                  <button
                    type="button"
                    onClick={() => setLookup(item)}
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-line bg-panel px-3 py-2 text-left"
                  >
                    <span className="truncate text-sm">{item.title}</span>
                    <span className="font-mono text-xs text-faint">{item.code}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : (
        <SearchPane query={query} filter={filter} onQuery={setQuery} onFilter={setFilter} />
      )}
    </main>
  );
}

function Count({ n, status }: { n: number; status: Status }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`size-1.5 rounded-full ${tone[status].dot}`} />
      <span className="tabular-nums">{n}</span>
    </li>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "h-11 rounded-full bg-ink text-sm font-medium text-bg"
          : "h-11 rounded-full text-sm font-medium text-muted"
      }
    >
      {label}
    </button>
  );
}

function Result({ lookup }: { lookup: Lookup | null }) {
  if (!lookup || lookup.status === "none") {
    return (
      <div className="flex flex-col rounded-lg border border-line bg-panel p-5">
        <ScanLine className="size-5 text-faint" />
        <p className="mt-3 text-lg font-medium">
          {lookup?.title ?? "Point the camera at a barcode"}
        </p>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-pretty text-muted">
          {lookup?.reason ??
            "Japanese prefixes 450–459 and 490–499 turn this card red. Anything else is checked against the ledger, then public company records."}
        </p>
        {lookup?.code ? (
          <p className="mt-4 font-mono text-xs tracking-wide text-faint">{lookup.code}</p>
        ) : null}
      </div>
    );
  }

  const style = tone[lookup.status];
  return (
    <div className={`flex flex-col gap-4 rounded-lg border p-5 ${style.wash}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-full px-2.5 py-1 font-mono text-xs tracking-wide uppercase ${style.chip}`}>
          {lookup.kind === "origin" ? "Origin" : lookup.kind === "unknown" ? "Unlisted" : statusLabel(lookup.status)}
        </span>
        <span className="font-mono text-xs text-muted">{lookup.code}</span>
      </div>
      <div>
        <h2 className={`text-3xl font-semibold tracking-tight ${style.word}`}>{lookup.title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-pretty text-ink/90">{lookup.reason}</p>
      </div>
    </div>
  );
}

function Scanner({
  active,
  camera,
  onCode,
  onState,
}: {
  active: boolean;
  camera: "starting" | "live" | "off";
  onCode: (code: string) => void;
  onState: (state: "starting" | "live" | "off", note: string) => void;
}) {
  const onCodeRef = useRef(onCode);
  const onStateRef = useRef(onState);
  onCodeRef.current = onCode;
  onStateRef.current = onState;

  useEffect(() => {
    if (!active) {
      onStateRef.current("off", "");
      return;
    }

    let stopped = false;
    let live = false;
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;

    onStateRef.current("starting", "");
    const timer = window.setTimeout(() => {
      if (!stopped && !live) onStateRef.current("off", "");
    }, 2500);

    (async () => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      if (stopped) return;
      const instance = new Html5Qrcode("reader", {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
      });
      scanner = instance;
      try {
        await instance.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => ({
              width: Math.max(160, Math.floor(width * 0.72)),
              height: Math.max(90, Math.floor(height * 0.38)),
            }),
          },
          (decoded) => onCodeRef.current(decoded),
          () => {},
        );
        if (stopped) {
          releaseScanner(instance);
          return;
        }
        live = true;
        onStateRef.current("live", "");
      } catch {
        if (!stopped) onStateRef.current("off", "");
      }
    })();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      onStateRef.current("off", "");
      const current = scanner;
      if (!current) return;
      releaseScanner(current);
    };
  }, [active]);

  return (
    <div className="relative h-72 overflow-hidden rounded-lg bg-panel ring-1 ring-line">
      <div id="reader" className={camera === "live" ? "absolute inset-0" : "absolute inset-0 opacity-0"} />
      {camera === "live" ? (
        <div className="pointer-events-none absolute inset-0">
          <span className="absolute top-4 left-4 size-7 border-t-2 border-l-2 border-ink" />
          <span className="absolute top-4 right-4 size-7 border-t-2 border-r-2 border-ink" />
          <span className="absolute bottom-4 left-4 size-7 border-b-2 border-l-2 border-ink" />
          <span className="absolute right-4 bottom-4 size-7 border-r-2 border-b-2 border-ink" />
          <span className="scanline absolute inset-x-8 h-px bg-ink/80" />
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-bg/70 px-4 py-2 text-xs text-muted">
            <Camera className="size-3.5" />
            Frame the bars, not the whole package
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <Camera className="size-6 text-faint" />
          <p className="text-sm font-medium">
            {camera === "starting" ? "Opening camera" : "Camera unavailable"}
          </p>
          <p className="max-w-xs text-sm text-muted">
            Type a barcode or tap one of the sample codes.
          </p>
        </div>
      )}
    </div>
  );
}

function releaseScanner(instance: { stop: () => Promise<void>; clear: () => void }) {
  try {
    const pending = instance.stop();
    if (pending && typeof pending.then === "function") {
      pending
        .then(() => {
          try {
            instance.clear();
          } catch {
            /* viewfinder already gone */
          }
        })
        .catch(() => {
          try {
            instance.clear();
          } catch {
            /* viewfinder already gone */
          }
        });
      return;
    }
  } catch {
    /* not running yet — stop() throws instead of rejecting */
  }
  try {
    instance.clear();
  } catch {
    /* viewfinder already gone */
  }
}

function SearchPane({
  query,
  filter,
  onQuery,
  onFilter,
}: {
  query: string;
  filter: Filter;
  onQuery: (value: string) => void;
  onFilter: (value: Filter) => void;
}) {
  const results = searchCompanies(query, filter);
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "red", label: "Strict" },
    { id: "orange", label: "Grey" },
    { id: "green", label: "Clear" },
  ];

  return (
    <section className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-6">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Studio, publisher, brand"
          className="h-12 w-full rounded-md border border-line bg-panel pr-12 pl-11 text-sm text-ink outline-none placeholder:text-faint focus:border-muted"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onQuery("")}
            className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="flex gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onFilter(item.id)}
            className={
              filter === item.id
                ? "h-9 rounded-full bg-ink px-3 text-xs font-medium text-bg"
                : "h-9 rounded-full border border-line px-3 text-xs font-medium text-muted"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {results.length === 0 ? (
          <li className="rounded-lg border border-dashed border-line px-4 py-8 text-sm text-muted">
            No matches for that name.
          </li>
        ) : (
          results.map((company) => {
            const style = tone[company.status];
            return (
              <li
                key={company.name}
                className="rounded-lg border border-line bg-panel px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-medium">{company.name}</h2>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-xs tracking-wide uppercase ${style.chip}`}
                  >
                    {statusLabel(company.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-pretty text-muted">{company.reason}</p>
                <span className={`mt-3 block h-0.5 w-10 rounded-full ${style.dot}`} />
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
