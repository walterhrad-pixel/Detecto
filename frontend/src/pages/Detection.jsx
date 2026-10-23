import { useCallback, useEffect, useRef, useState } from "react";
import { detect, validateImageFile } from "../api";
import Notice from "../components/Notice";
import { Counter, Metrics, PeopleList, ZonePanel } from "../components/Readout";
import SamplePicker from "../components/SamplePicker";
import Stage from "../components/Stage";
import { countInZone } from "../lib/geometry";

const DEFAULT_CONF = 0.3;
const LIVE_INTERVAL_MS = 400;
const LIVE_SAVE_EVERY_MS = 5000;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unreadable"));
    img.src = url;
  });
}

export default function Detection() {
  const [source, setSource] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [conf, setConf] = useState(DEFAULT_CONF);
  const [enhance, setEnhance] = useState(false);
  const [showBoxes, setShowBoxes] = useState(true);
  const [zone, setZone] = useState(null);
  const [drawMode, setDrawMode] = useState(false);
  const [limit, setLimit] = useState(3);
  const [live, setLive] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [activeSample, setActiveSample] = useState("");

  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const urlRef = useRef(null);
  const inflight = useRef(false);
  const lastSave = useRef(0);
  const sequence = useRef(0);
  const settings = useRef({ conf, enhance });
  settings.current = { conf, enhance };

  const runDetection = useCallback(async (file, save) => {
    const id = ++sequence.current;
    setBusy(true);
    setError("");
    try {
      const data = await detect(file, { conf: settings.current.conf, enhance: settings.current.enhance, overlay: false, save });
      if (id === sequence.current) setResult(data);
    } catch (err) {
      if (id === sequence.current) setError(err.message);
    } finally {
      if (id === sequence.current) setBusy(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);
  }, []);

  async function openFile(file, label) {
    if (streamRef.current) {
      stopCamera();
      setSource(null);
    }
    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      fileRef.current = file;
      setSource({ el: img, name: label || file.name, kind: "image" });
      setResult(null);
      runDetection(file, true);
    } catch {
      URL.revokeObjectURL(url);
      setError("The browser could not read this image. The file may be damaged.");
    }
  }

  async function pickSample(name) {
    setActiveSample(name);
    try {
      const res = await fetch(`/samples/${name}`);
      if (!res.ok) throw new Error("missing");
      const blob = await res.blob();
      await openFile(new File([blob], name, { type: blob.type || "image/jpeg" }), name);
    } catch {
      setError(`Could not load ${name}. Check that it exists in frontend/public/samples.`);
    }
  }

  function onChoose(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    setActiveSample("");
    openFile(file);
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (!file) return;
    setActiveSample("");
    openFile(file);
  }

  async function startCamera() {
    setError("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("This browser cannot open the camera. Use Chrome or Firefox on localhost or HTTPS.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 960 } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      fileRef.current = null;
      setActiveSample("");
      setResult(null);
      setSource({ el: video, name: "Camera", kind: "video" });
      setLive(true);
    } catch {
      setError("The camera could not be opened. Allow camera access in the browser and close other apps that use it.");
    }
  }

  function toggleCamera() {
    if (live) {
      stopCamera();
      setSource(null);
      setResult(null);
    } else {
      startCamera();
    }
  }

  useEffect(() => {
    if (!fileRef.current || live) return undefined;
    const timer = setTimeout(() => runDetection(fileRef.current, false), 250);
    return () => clearTimeout(timer);
  }, [conf, enhance, live, runDetection]);

  useEffect(() => {
    if (!live) return undefined;
    const capture = document.createElement("canvas");
    const timer = setInterval(async () => {
      const video = videoRef.current;
      if (inflight.current || !video || !video.videoWidth) return;
      inflight.current = true;
      try {
        const scale = Math.min(1, 640 / video.videoWidth);
        capture.width = Math.round(video.videoWidth * scale);
        capture.height = Math.round(video.videoHeight * scale);
        capture.getContext("2d").drawImage(video, 0, 0, capture.width, capture.height);
        const blob = await new Promise((resolve) => capture.toBlob(resolve, "image/jpeg", 0.8));
        const save = Date.now() - lastSave.current > LIVE_SAVE_EVERY_MS;
        const data = await detect(new File([blob], "frame.jpg", { type: "image/jpeg" }), {
          conf: settings.current.conf,
          enhance: settings.current.enhance,
          overlay: false,
          save,
        });
        if (save) lastSave.current = Date.now();
        setResult(data);
        setError("");
      } catch (err) {
        setError(err.message);
      } finally {
        inflight.current = false;
      }
    }, LIVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [live]);

  useEffect(
    () => () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const inside = result && zone ? countInZone(result.people, zone, result.image_size) : 0;
  const over = Boolean(zone && result && inside > limit);
  const frameClass = `stage-frame${over ? " is-over" : ""}${dragging ? " is-dragging" : ""}`;

  return (
    <main className="detect">
      <section className="detect-main">
        <Notice kind="error" onDismiss={() => setError("")}>
          {error}
        </Notice>

        <div
          className={frameClass}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {busy && <div className="progress" role="progressbar" aria-label="Detecting" />}
          <Stage
            source={source}
            people={result ? result.people : []}
            imageSize={result ? result.image_size : null}
            showBoxes={showBoxes}
            zone={zone}
            drawMode={drawMode}
            onZoneChange={(rect) => {
              setZone(rect);
              setDrawMode(false);
            }}
            live={live}
          >
            <div className="empty">
              <h2>Drop a photo here</h2>
              <p>Or choose an image, pick one of the samples below, or start the camera. JPEG and PNG, up to 15 MB.</p>
            </div>
          </Stage>
          {over && <p className="over-banner" role="alert">Over the limit: {inside} people in the zone, {limit} allowed.</p>}
        </div>

        <video ref={videoRef} className="hidden-video" muted playsInline />

        <div className="toolbar">
          <label className="btn btn-primary">
            Choose image
            <input type="file" accept="image/jpeg,image/png" onChange={onChoose} hidden />
          </label>
          <button type="button" className={`btn${live ? " is-on" : ""}`} onClick={toggleCamera}>
            {live ? "Stop camera" : "Start camera"}
          </button>
          <label className="check">
            <input type="checkbox" checked={showBoxes} onChange={(e) => setShowBoxes(e.target.checked)} />
            Show boxes
          </label>
          <label className="check">
            <input type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} />
            Boost contrast
          </label>
          <label className="slider">
            <span>
              Confidence threshold <strong>{conf.toFixed(2)}</strong>
            </span>
            <input type="range" min="0.1" max="0.9" step="0.05" value={conf} onChange={(e) => setConf(Number(e.target.value))} />
          </label>
        </div>
        <p className="hint">Changing the threshold or contrast re-runs the current image without adding a new row to the history.</p>

        <SamplePicker active={activeSample} disabled={busy && !live} onPick={pickSample} />
      </section>

      <aside className="readout">
        <Counter count={result ? result.count : null} busy={busy} />
        <Metrics result={result} />
        <ZonePanel
          zone={zone}
          drawMode={drawMode}
          limit={limit}
          inside={inside}
          onToggleDraw={() => setDrawMode((v) => !v)}
          onClear={() => {
            setZone(null);
            setDrawMode(false);
          }}
          onLimit={setLimit}
        />
        <PeopleList people={result ? result.people : []} />
      </aside>
    </main>
  );
}
