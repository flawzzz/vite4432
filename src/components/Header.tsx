import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold shadow-md shadow-indigo-500/40">
            DM
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-100">Dunmoa</span>
        </Link>
        <div className="flex items-center gap-2 text-[0.7rem] text-slate-300">
          <Link
            to="/app"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-[0.65rem] font-semibold hover:border-indigo-400 hover:text-indigo-200"
            aria-label="Dunmoa APP"
          >
            A
          </Link>
          <Link
            to="/guide"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-[0.65rem] font-semibold hover:border-indigo-400 hover:text-indigo-200"
            aria-label="Guide"
          >
            G
          </Link>
        </div>
      </div>
    </header>
  );
}
