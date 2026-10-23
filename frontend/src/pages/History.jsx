import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { exportUrl, getHistory, getStats, resetHistory } from "../api";
import { CountChart, HourlyChart } from "../components/Charts";
import Notice from "../components/Notice";
import { formatDateTime, seconds } from "../lib/format";

const TABLE_ROWS = 100;
const EMPTY_FILTERS = { start: "", end: "", minConfidence: 0 };

export default function History() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, summary] = await Promise.all([getHistory(filters), getStats(filters)]);
      setRecords(rows);
      setStats(summary);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  async function onReset() {
    if (!window.confirm("Delete every saved detection? This cannot be undone.")) return;
    try {
      await resetHistory();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const set = (key) => (event) => setFilters((f) => ({ ...f, [key]: key === "minConfidence" ? Number(event.target.value) : event.target.value }));
  const filtered = filters.start || filters.end || filters.minConfidence > 0;
  const invalidRange = filters.start && filters.end && filters.start > filters.end;
  const hasData = records.length > 0;

  return (
    <main className="history">
      <header className="page-head">
        <h1>History</h1>
        <p>Every detection is logged with its time, crowd size and confidence.</p>
      </header>

      <Notice kind="error" onDismiss={() => setError("")}>
        {error}
      </Notice>

      <form className="filters" onSubmit={(e) => e.preventDefault()} aria-label="Filters">
        <label className="field">
          <span>From</span>
          <input type="datetime-local" value={filters.start} onChange={set("start")} />
        </label>
        <label className="field">
          <span>To</span>
          <input type="datetime-local" value={filters.end} onChange={set("end")} />
        </label>
        <label className="field field-range">
          <span>
            Minimum average confidence <strong>{filters.minConfidence.toFixed(2)}</strong>
          </span>
          <input type="range" min="0" max="0.95" step="0.05" value={filters.minConfidence} onChange={set("minConfidence")} />
        </label>
        <div className="filter-actions">
          <button type="button" className="btn btn-small btn-quiet" disabled={!filtered} onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear filters
          </button>
          <a className="btn btn-small" href={exportUrl(filters)} download>
            Export CSV
          </a>
          <button type="button" className="btn btn-small btn-danger" onClick={onReset}>
            Clear history
          </button>
        </div>
      </form>
      {invalidRange && <Notice kind="error">The start time is after the end time, so nothing can match.</Notice>}

      {!loading && !error && !hasData && (
        <div className="empty empty-history">
          <h2>{filtered ? "No detections match these filters" : "No detections yet"}</h2>
          <p>{filtered ? "Widen the time range or lower the confidence." : "Run a detection and it will appear here."}</p>
          {!filtered && (
            <Link className="btn btn-primary" to="/">
              Open detection
            </Link>
          )}
        </div>
      )}

      {hasData && stats && (
        <>
          <dl className="figures">
            <div>
              <dt>Detections</dt>
              <dd>{stats.detections}</dd>
            </div>
            <div>
              <dt>Average crowd</dt>
              <dd>{stats.avg_count}</dd>
            </div>
            <div>
              <dt>Busiest frame</dt>
              <dd>{stats.peak_count}</dd>
            </div>
            <div>
              <dt>Average confidence</dt>
              <dd>{stats.avg_confidence.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Average processing</dt>
              <dd>{seconds(stats.avg_inference_time)}</dd>
            </div>
          </dl>

          <section className="panel" aria-label="People over time">
            <h2>People over time</h2>
            <CountChart records={records} />
          </section>

          <section className="panel" aria-label="Average crowd per hour">
            <h2>Average crowd per hour</h2>
            <HourlyChart hourly={stats.hourly} />
          </section>

          <section className="panel" aria-label="Detection log">
            <h2>Detection log</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Time</th>
                    <th scope="col" className="num">People</th>
                    <th scope="col" className="num">Average confidence</th>
                    <th scope="col" className="num">Processing</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, TABLE_ROWS).map((r) => (
                    <tr key={r.id}>
                      <td>{formatDateTime(r.timestamp)}</td>
                      <td className="num">{r.count}</td>
                      <td className="num">{r.count === 0 ? "-" : r.avg_confidence.toFixed(2)}</td>
                      <td className="num">{seconds(r.inference_time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {records.length > TABLE_ROWS && <p className="hint">Showing the latest {TABLE_ROWS} of {records.length} rows. The CSV export includes all of them.</p>}
          </section>
        </>
      )}
    </main>
  );
}
