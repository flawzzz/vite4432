import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../lib/auth";

export default function LogoutPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await logout();
                if (cancelled) return;
                navigate("/app", { replace: true });
            } catch (e) {
                if (cancelled) return;
                setError(e instanceof Error ? e.message : "로그아웃에 실패했습니다.");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [navigate]);

    return (
        <div className="flex flex-1 flex-col px-3 py-8">
            <div className="mx-auto w-full max-w-4xl space-y-3">
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">로그아웃</h1>

                {error ? (
                    <>
                        <p className="text-sm text-rose-300">{error}</p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => navigate(0)}
                                className="inline-flex rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-700"
                            >
                                다시 시도
                            </button>
                            <Link
                                to="/app"
                                className="inline-flex rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-200 hover:border-indigo-500/70"
                            >
                                앱허브로 이동
                            </Link>
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-slate-400">로그아웃 중…</p>
                )}
            </div>
        </div>
    );
}
