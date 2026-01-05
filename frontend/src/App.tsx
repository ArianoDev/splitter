import { Routes, Route, Link, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import CalculationPage from "./pages/CalculationPage";

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="font-semibold tracking-tight">
            Splitter
          </Link>
          <a
            className="text-sm text-slate-600 hover:text-slate-900"
            href="https://github.com/ArianoDev/splitter"
            target="_blank"
            rel="noreferrer"
            aria-label="Repository (placeholder)"
          >
            Repo ↗
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/c/:token" element={<CalculationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 text-xs text-slate-500">
          Open source. Made with ❤️
        </div>
      </footer>
    </div>
  );
}
