/**
 * Off-main-thread ONNX runner for the background remover.
 *
 * Holds a lazily-created U-2-Netp session (a ~4.5MB salient-object model, Apache-2.0,
 * self-hosted under /models) and turns a 320×320 RGBA frame into a 320×320 alpha mask.
 * Inference on the main thread would jank the whole page, so it lives here; the model
 * is fetched manually to report download progress, then cached by the HTTP layer.
 *
 * Threads are pinned to 1 on purpose: multi-threaded ORT needs SharedArrayBuffer, which
 * would force COOP/COEP headers site-wide and break the embedded fonts and hero video.
 * U-2-Netp is small enough that single-threaded wasm still runs in well under a second.
 */
import * as ort from "onnxruntime-web/wasm";
import { MEAN, MODEL_SIZE, MODEL_URL, STD, type WorkerRequest, type WorkerResponse } from "./bg-remove";

ort.env.wasm.wasmPaths = "/ort/";
ort.env.wasm.numThreads = 1;
ort.env.logLevel = "error";

const post = (msg: WorkerResponse, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(msg, transfer);

let sessionPromise: Promise<ort.InferenceSession> | null = null;

/** Fetch the weights by hand so the UI can show real download progress. */
async function fetchModel(id: number): Promise<ArrayBuffer> {
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`Couldn't load the model (HTTP ${res.status}).`);

  const total = Number(res.headers.get("content-length")) || 0;
  if (!res.body || !total) return res.arrayBuffer();

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    post({ id, stage: "download", progress: Math.min(1, received / total) });
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  return bytes.buffer;
}

function loadSession(id: number): Promise<ort.InferenceSession> {
  sessionPromise ??= (async () => {
    const weights = await fetchModel(id);
    post({ id, stage: "init", progress: 1 });
    return ort.InferenceSession.create(weights, { executionProviders: ["wasm"] });
  })();
  return sessionPromise;
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, buffer } = e.data;
  try {
    const session = await loadSession(id);

    // RGBA bytes -> normalized NCHW float32.
    const rgba = new Uint8ClampedArray(buffer);
    const px = MODEL_SIZE * MODEL_SIZE;
    const input = new Float32Array(3 * px);
    for (let i = 0; i < px; i++) {
      for (let c = 0; c < 3; c++) {
        input[c * px + i] = (rgba[i * 4 + c] / 255 - MEAN[c]) / STD[c];
      }
    }

    const feeds = { [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, MODEL_SIZE, MODEL_SIZE]) };
    const out = await session.run(feeds);
    // U-2-Net emits one fused map plus six side outputs; the first is the refined one.
    const pred = out[session.outputNames[0]].data as Float32Array;

    // The graph already applies sigmoid, but min-max normalizing restores full
    // contrast on images where the model is merely lukewarm about the subject.
    let mn = Infinity;
    let mx = -Infinity;
    for (const v of pred) {
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    const span = mx - mn || 1;

    const mask = new Uint8ClampedArray(px);
    for (let i = 0; i < px; i++) mask[i] = ((pred[i] - mn) / span) * 255;

    post({ id, ok: true, mask: mask.buffer }, [mask.buffer]);
  } catch (err) {
    post({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
