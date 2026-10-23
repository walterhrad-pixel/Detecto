import { seconds } from "../lib/format";

export function Counter({ count, busy }) {
  const empty = count === null;
  return (
    <div className={`counter${busy ? " is-busy" : ""}`} aria-live="polite">
      <span key={empty ? "empty" : count} className="counter-digits">
        {empty ? "--" : count}
      </span>
      <span className="counter-label">{empty ? "people in frame" : count === 1 ? "person in frame" : "people in frame"}</span>
    </div>
  );
}

export function Metrics({ result }) {
  const rows = [
    ["Average confidence", result ? result.avg_confidence.toFixed(2) : "-"],
    ["Processing time", result ? seconds(result.processing_time) : "-"],
    ["Image size", result ? `${result.image_size.width} x ${result.image_size.height}` : "-"],
    ["Threshold", result ? result.conf_threshold.toFixed(2) : "-"],
  ];
  return (
    <dl className="metrics">
      {rows.map(([label, value]) => (
        <div key={label} className="metrics-row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PeopleList({ people }) {
  if (!people || people.length === 0) return null;
  const ordered = people.map((p, i) => ({ ...p, index: i + 1 })).sort((a, b) => b.confidence - a.confidence);
  return (
    <ul className="people">
      {ordered.map((p) => (
        <li key={p.index} className="people-row">
          <span className="people-name">Person {p.index}</span>
          <span className="bar" role="presentation">
            <span className="bar-fill" style={{ width: `${Math.round(p.confidence * 100)}%` }} />
          </span>
          <span className="people-conf">{p.confidence.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );
}

export function ZonePanel({ zone, drawMode, limit, inside, onToggleDraw, onClear, onLimit }) {
  const over = zone && inside > limit;
  return (
    <section className={`zone${over ? " is-over" : ""}`} aria-label="Restricted zone">
      <div className="zone-head">
        <h3>Restricted zone</h3>
        <div className="zone-actions">
          <button type="button" className={`btn btn-small${drawMode ? " is-on" : ""}`} onClick={onToggleDraw}>
            {drawMode ? "Cancel drawing" : zone ? "Redraw zone" : "Draw zone"}
          </button>
          {zone && (
            <button type="button" className="btn btn-small btn-quiet" onClick={onClear}>
              Remove
            </button>
          )}
        </div>
      </div>
      {drawMode && <p className="hint">Drag on the image to mark the area.</p>}
      {!drawMode && !zone && <p className="hint">Mark an area and set how many people it can hold.</p>}
      {zone && (
        <>
          <label className="field-inline">
            <span>People allowed</span>
            <input type="number" min="0" max="99" value={limit} onChange={(e) => onLimit(Math.max(0, Number(e.target.value) || 0))} />
          </label>
          <p className="zone-status" role="status">
            {over ? `Over the limit: ${inside} in the zone, ${limit} allowed.` : `${inside} in the zone, ${limit} allowed.`}
          </p>
          <p className="hint">A person counts as inside when their feet are inside the zone.</p>
        </>
      )}
    </section>
  );
}
