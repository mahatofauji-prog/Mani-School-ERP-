import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, CheckCircle2, XCircle, Loader2, RotateCcw } from "lucide-react";

const REGION_ID = "qr-reader-region";

export function QrAttendancePanel({ classId, sectionId, date }) {
  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  const lastRef = useRef({ token: "", at: 0 });
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState(null); // { ok, name, msg, status, time, photo, dup }
  const [log, setLog] = useState([]); // [{name, time, dup}]

  const handleToken = useCallback(async (token) => {
    if (busyRef.current) return;
    const nowT = Date.now();
    // debounce identical token within 3s to avoid rescans of the same card
    if (lastRef.current.token === token && nowT - lastRef.current.at < 3000) return;
    lastRef.current = { token, at: nowT };
    busyRef.current = true;
    try {
      const { data } = await api.post("/qr/scan", { qr_token: token, class_id: classId, section_id: sectionId, date });
      const entry = { id: data.student?.id, name: data.student?.name, time: data.time, dup: data.already_marked, photo: data.student?.photo_path };
      setLast({ ok: true, dup: data.already_marked, msg: data.message, ...entry });
      if (!data.already_marked) {
        setLog((l) => [{ ...entry }, ...l.filter((x) => x.id !== entry.id)]);
        if (navigator.vibrate) navigator.vibrate(120);
      }
    } catch (e) {
      setLast({ ok: false, msg: apiError(e) });
      if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    } finally {
      setTimeout(() => { busyRef.current = false; }, 700);
    }
  }, [classId, sectionId, date]);

  const start = async () => {
    setError("");
    try {
      const scanner = new Html5Qrcode(REGION_ID, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => handleToken(decoded),
        () => {}
      );
      setScanning(true);
    } catch (e) {
      const msg = String(e?.message || e);
      if (/permission|NotAllowed/i.test(msg)) setError("Camera permission denied. Please allow camera access to scan.");
      else if (/NotFound|no camera|Requested device/i.test(msg)) setError("No camera found on this device.");
      else if (/NotSupported|secure context|https/i.test(msg)) setError("Camera not supported in this browser. Use a modern mobile browser over HTTPS.");
      else setError("Could not start the camera. " + msg);
      setScanning(false);
    }
  };

  const stop = useCallback(async () => {
    const s = scannerRef.current;
    if (s) {
      try { await s.stop(); await s.clear(); } catch (err) { console.warn("QR scanner stop failed", err); }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => () => { stop(); }, [stop]);

  return (
    <div className="grid lg:grid-cols-2 gap-6" data-testid="qr-attendance-panel">
      <div className="bg-white border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-slate-900">QR Scanner</h3>
          {!scanning
            ? <Button onClick={start} className="bg-primary hover:bg-primary/90 gap-2" data-testid="start-qr-scan"><Camera className="h-4 w-4" /> Start Scanning</Button>
            : <Button onClick={stop} variant="outline" className="gap-2 text-destructive" data-testid="stop-qr-scan"><CameraOff className="h-4 w-4" /> Stop</Button>}
        </div>

        <div id={REGION_ID} className="w-full rounded-lg overflow-hidden bg-slate-900/90 min-h-[240px] flex items-center justify-center">
          {!scanning && <div className="text-center text-white/60 py-16 px-4"><Camera className="h-8 w-8 mx-auto mb-2" /><p className="text-sm">Point the camera at a student's ID card QR code.</p></div>}
        </div>

        {error && <div className="mt-4 flex items-start gap-2 text-sm text-destructive bg-destructive/5 rounded-md p-3" data-testid="qr-error"><XCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}</div>}

        {last && (
          <div className={`mt-4 rounded-lg p-4 flex items-center gap-3 ${last.ok ? (last.dup ? "bg-amber-50" : "bg-emerald-50") : "bg-destructive/5"}`} data-testid="qr-last-result">
            {last.ok ? <CheckCircle2 className={`h-6 w-6 shrink-0 ${last.dup ? "text-amber-600" : "text-emerald-600"}`} /> : <XCircle className="h-6 w-6 text-destructive shrink-0" />}
            <div className="min-w-0">
              {last.ok
                ? <><div className="font-semibold text-slate-900">{last.name}</div><div className="text-xs text-slate-600">{last.msg}{last.time ? ` · ${last.time}` : ""} · Status: PRESENT</div></>
                : <div className="text-sm text-destructive font-medium">{last.msg}</div>}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-slate-900">Marked Present</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground" data-testid="qr-present-count">{log.length} scanned</span>
            {log.length > 0 && <Button size="sm" variant="ghost" onClick={() => setLog([])} className="gap-1.5 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Clear</Button>}
          </div>
        </div>
        {log.length === 0
          ? <div className="text-center text-muted-foreground py-12 text-sm">No students scanned yet.</div>
          : <div className="divide-y divide-border max-h-[420px] overflow-y-auto" data-testid="qr-present-list">
              {log.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="font-medium text-slate-800">{e.name}</span></div>
                  <span className="text-xs text-muted-foreground">Present · {e.time}</span>
                </div>
              ))}
            </div>}
      </div>
    </div>
  );
}
