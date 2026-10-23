import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { API_URL, checkHealth } from "./api";
import Detection from "./pages/Detection";
import History from "./pages/History";

function BackendStatus() {
  const [online, setOnline] = useState(null);

  useEffect(() => {
    let active = true;
    const ping = () =>
      checkHealth()
        .then(() => active && setOnline(true))
        .catch(() => active && setOnline(false));
    ping();
    const timer = setInterval(ping, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const label = online === null ? "Checking backend" : online ? "Backend online" : "Backend offline";
  return (
    <span className={`status status-${online === null ? "wait" : online ? "up" : "down"}`} title={API_URL}>
      <span className="status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

export default function App() {
  return (
    <>
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="Detecto home">
          <span className="brand-mark" aria-hidden="true" />
          Detecto
        </NavLink>
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>
            Detection
          </NavLink>
          <NavLink to="/history">History</NavLink>
        </nav>
        <BackendStatus />
      </header>
      <Routes>
        <Route path="/" element={<Detection />} />
        <Route path="/history" element={<History />} />
        <Route
          path="*"
          element={
            <main className="history">
              <div className="empty empty-history">
                <h2>Page not found</h2>
                <p>Use the links at the top to go back to detection or history.</p>
              </div>
            </main>
          }
        />
      </Routes>
    </>
  );
}
