import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-2">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-slate-100">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M12 3.5c-4.7 0-8.5 3.4-8.5 7.6 0 3.3 2.3 5.6 5.4 6.7 2.5.9 3.6 2.1 3.6 3.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M12 20.5c4.7 0 8.5-3.4 8.5-7.6 0-3.3-2.3-5.6-5.4-6.7-2.5-.9-3.6-2.1-3.6-3.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-100">Dunmoa</span>
        </Link>
        <div className="flex items-center gap-2 text-[0.7rem] text-slate-300">
          <Link
            to="/app"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-[0.65rem] font-semibold hover:border-indigo-400 hover:text-indigo-200 focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            aria-label="Dunmoa APP"
          >
            <span className="grid grid-cols-2 gap-[2px]">
              <span className="h-1.5 w-1.5 rounded-[2px] bg-current" />
              <span className="h-1.5 w-1.5 rounded-[2px] bg-current" />
              <span className="h-1.5 w-1.5 rounded-[2px] bg-current" />
              <span className="h-1.5 w-1.5 rounded-[2px] bg-current" />
            </span>
          </Link>
          {/* <Link
            to="/guide"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-[0.65rem] font-semibold hover:border-indigo-400 hover:text-indigo-200 focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            aria-label="Guide"
          >
            G
          </Link> */}
        </div>
      </div>
    </header>
  );
}
