"use client";
import { useState, useRef } from "react";
import { useI18n } from "@/lib/I18nContext";

type StepResult = {
  step: string;
  status: "pending" | "running" | "ok" | "fail";
  detail: string;
  ms?: number;
};

export default function TestUploadPage() {
    const { locale } = useI18n();
  const [steps, setSteps] = useState<StepResult[]>([]);
  const [fileInfo, setFileInfo] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const log = (
    step: string,
    status: StepResult["status"],
    detail: string,
    ms?: number
  ) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.step === step);
      const entry = { step, status, detail, ms };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entry;
        return next;
      }
      return [...prev, entry];
    });
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setSteps([]);
    setFileInfo(
      `name=${file.name}  type="${file.type}"  size=${(file.size / 1024).toFixed(1)}KB`
    );

    // ===== STEP 1: Validate MIME =====
    const t0 = performance.now();
    log("1-mime", "running", "Checking MIME type...");
    const mime = file.type;
    if (!mime || !mime.startsWith("image/")) {
      log(
        "1-mime",
        "fail",
        `file.type="${mime}" — browser did NOT set image MIME. This is the bug on your device.`,
        performance.now() - t0
      );
      // Try to fix it
      const inferMime = (name: string) => {
        const l = name.toLowerCase();
        if (l.endsWith(".jpg") || l.endsWith(".jpeg")) return "image/jpeg";
        if (l.endsWith(".png")) return "image/png";
        if (l.endsWith(".webp")) return "image/webp";
        if (l.endsWith(".heic")) return "image/heic";
        return "";
      };
      const inferred = inferMime(file.name);
      if (!inferred) {
        log(
          "1-mime",
          "fail",
          `Cannot infer MIME from name "${file.name}" either. Upload will fail.`
        );
        return;
      }
      log(
        "1-mime",
        "ok",
        `file.type empty but inferred "${inferred}" from filename`,
        performance.now() - t0
      );
    } else {
      log("1-mime", "ok", `file.type="${mime}"`, performance.now() - t0);
    }

    // ===== STEP 2: Read file as ArrayBuffer =====
    const t1 = performance.now();
    log("2-read", "running", "Reading file into ArrayBuffer...");
    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
      log(
        "2-read",
        "ok",
        `Read ${(buffer.byteLength / 1024).toFixed(1)}KB`,
        performance.now() - t1
      );
    } catch (err: unknown) {
      log(
        "2-read",
        "fail",
        `Failed to read: ${err instanceof Error ? err.message : String(err)}`,
        performance.now() - t1
      );
      return;
    }

    // ===== STEP 3: Canvas compression (only if > 4MB) =====
    let uploadFile = file;
    if (file.size > 4 * 1024 * 1024) {
      const t2 = performance.now();
      log("3-compress", "running", "File >4MB, compressing via canvas...");
      try {
        const url = URL.createObjectURL(file);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => { URL.revokeObjectURL(url); resolve(el); };
          el.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
          el.src = url;
        });
        log("3-compress", "running", `Image loaded: ${img.width}x${img.height}`);

        const maxDim = 1920;
        const scale = Math.max(img.width, img.height) > maxDim
          ? maxDim / Math.max(img.width, img.height) : 1;
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context unavailable");
        ctx.drawImage(img, 0, 0, w, h);

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/jpeg", 0.75);
        });
        if (!blob) throw new Error("canvas.toBlob returned null");

        uploadFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
          type: "image/jpeg",
        });
        log(
          "3-compress",
          "ok",
          `Compressed: ${(uploadFile.size / 1024).toFixed(1)}KB (${w}x${h})`,
          performance.now() - t2
        );
      } catch (err: unknown) {
        log(
          "3-compress",
          "fail",
          `Compression failed: ${err instanceof Error ? err.message : String(err)}`,
          performance.now() - t2
        );
        return;
      }
    } else {
      log("3-compress", "ok", "File ≤4MB, skipping compression");
    }

    // ===== STEP 4: Test XHR to a simple echo endpoint =====
    const t4 = performance.now();
    log("4-xhr-echo", "running", "Testing XHR POST to /api/test-upload-echo...");
    try {
      const echoResult = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/test-upload-echo");
        xhr.timeout = 30000;
        xhr.setRequestHeader("Content-Type", uploadFile.type || "image/jpeg");
        xhr.setRequestHeader("X-Upload-Mode", "binary");
        xhr.onload = () => resolve(`status=${xhr.status} body=${xhr.responseText.slice(0, 200)}`);
        xhr.onerror = () => reject(new Error("XHR network error"));
        xhr.ontimeout = () => reject(new Error("XHR timeout (30s)"));
        xhr.onabort = () => reject(new Error("XHR aborted"));
        xhr.send(uploadFile);
      });
      log("4-xhr-echo", "ok", echoResult, performance.now() - t4);
    } catch (err: unknown) {
      log(
        "4-xhr-echo",
        "fail",
        `XHR echo failed: ${err instanceof Error ? err.message : String(err)}`,
        performance.now() - t4
      );
    }

    // ===== STEP 5: Test fetch POST to same echo endpoint =====
    const t5 = performance.now();
    log("5-fetch-echo", "running", "Testing fetch() POST to /api/test-upload-echo...");
    try {
      const resp = await fetch("/api/test-upload-echo", {
        method: "POST",
        headers: {
          "Content-Type": uploadFile.type || "image/jpeg",
          "X-Upload-Mode": "binary",
        },
        body: uploadFile,
      });
      const text = await resp.text();
      log(
        "5-fetch-echo",
        resp.ok ? "ok" : "fail",
        `status=${resp.status} body=${text.slice(0, 200)}`,
        performance.now() - t5
      );
    } catch (err: unknown) {
      log(
        "5-fetch-echo",
        "fail",
        `fetch echo failed: ${err instanceof Error ? err.message : String(err)}`,
        performance.now() - t5
      );
    }

    // ===== STEP 6: Real upload to Supabase (with dummy assignment) =====
    const t6 = performance.now();
    log("6-real-upload", "running", "Testing real upload API (will likely fail on assignment check)...");
    try {
      const params = new URLSearchParams({
        orderId: "diag-test",
        assignmentId: "diag-test",
        kind: "before",
        mode: "binary",
        name: uploadFile.name || "photo.jpg",
      });
      const resp = await fetch(`/api/staff/upload-work-photo?${params}`, {
        method: "POST",
        headers: {
          "Content-Type": uploadFile.type || "image/jpeg",
          "X-Upload-Mode": "binary",
        },
        body: uploadFile,
      });
      const text = await resp.text();
      // 404 "Assignment not found" is EXPECTED and proves the route works end-to-end
      const expected404 = resp.status === 404;
      log(
        "6-real-upload",
        expected404 ? "ok" : resp.ok ? "ok" : "fail",
        expected404
          ? `Got expected 404 (assignment check works). Route is HEALTHY.`
          : `status=${resp.status} body=${text.slice(0, 300)}`,
        performance.now() - t6
      );
    } catch (err: unknown) {
      log(
        "6-real-upload",
        "fail",
        `Real upload failed: ${err instanceof Error ? err.message : String(err)}`,
        performance.now() - t6
      );
    }

    log("done", "ok", "All diagnostics complete");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-xl font-bold mb-4">Upload Diagnostic</h1>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          e.target.value = "";
          handleFile(f);
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold text-lg mb-4"
      >
        {locale === 'en' ? '         เลือกรูปเพื่อทดสอบ       ' : locale === 'zh' ? '         เลือกรูปเพื่อทดสอบ       ' : '         เลือกรูปเพื่อทดสอบ       '}</button>

      {fileInfo && (
        <p className="text-xs font-mono bg-white p-2 rounded mb-4 break-all">
          {fileInfo}
        </p>
      )}

      <div className="space-y-2">
        {steps.map((s) => (
          <div
            key={s.step}
            className={`p-3 rounded-lg text-sm ${
              s.status === "ok"
                ? "bg-green-50 border border-green-200"
                : s.status === "fail"
                ? "bg-red-50 border border-red-200"
                : s.status === "running"
                ? "bg-yellow-50 border border-yellow-200"
                : "bg-gray-50 border border-gray-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>
                {s.status === "ok"
                  ? "✅"
                  : s.status === "fail"
                  ? "❌"
                  : s.status === "running"
                  ? "⏳"
                  : "⬜"}
              </span>
              <span className="font-semibold">{s.step}</span>
              {s.ms !== undefined && (
                <span className="text-xs text-gray-400">
                  {Math.round(s.ms)}ms
                </span>
              )}
            </div>
            <p className="text-xs font-mono mt-1 break-all">{s.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
