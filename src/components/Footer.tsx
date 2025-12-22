import { Link } from "react-router-dom";

export default function Footer() {

    return (
        <footer className="border-t border-slate-800 bg-slate-950/90">
            <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-3 text-[0.7rem] text-slate-500 sm:flex-row">
                <span>© {new Date().getFullYear()} Dunmoa</span>
                <div className="flex items-center gap-3">
                    <Link to="/privacy" className="hover:text-indigo-300">
                        개인정보처리방침
                    </Link>
                </div>
            </div>
        </footer>
    )
}