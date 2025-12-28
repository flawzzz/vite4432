import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";

import { loginWithGoogle, logout } from "../lib/auth";
import { auth } from "../lib/firebase";

export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<User | null>(auth.currentUser);
    const [authReady, setAuthReady] = useState(false);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (nextUser) => {
            setUser(nextUser);
            setAuthReady(true);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!authReady) return;
        if (!user) return;
        navigate("/app", { replace: true });
    }, [authReady, user, navigate]);

    const onLoginClick = async () => {
        if (loading) return;            // 중복 클릭 방지
        setLoading(true);
        try {
            const nextUser = await loginWithGoogle();
            setUser(nextUser);
            navigate("/app", { replace: true });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const onLogoutClick = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await logout();
            setUser(null);
            navigate("/app", { replace: true });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col px-3 py-6">
            <div className="mx-auto w-full max-w-4xl space-y-4">
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">로그인</h1>
                    <p className="text-xs text-slate-400 sm:text-sm">계정으로 로그인해 기록/동기화 기능을 사용할 수 있어요.</p>
                </div>

                {user ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt="profile"
                                    className="h-10 w-10 rounded-full border border-slate-800"
                                    referrerPolicy="no-referrer"
                                />
                            ) : null}
                            <div className="flex flex-col">
                                <div className="text-sm font-semibold text-slate-100">로그인됨</div>
                                <div className="text-xs text-slate-300">{user.displayName ?? "(이름 없음)"}</div>
                            </div>
                        </div>
                            <Link
                                to="/app"
                                className="shrink-0 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-200 hover:border-indigo-500/70"
                            >
                                앱허브로
                            </Link>
                        </div>

                        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-xs">
                            <div>
                                <span className="text-slate-400">uid:</span> {user.uid}
                            </div>
                            <div>
                                <span className="text-slate-400">email:</span> {user.email ?? "(없음)"}
                            </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={onLogoutClick}
                                disabled={loading}
                                className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-700 disabled:opacity-60"
                            >
                                {loading ? "처리 중..." : "로그아웃"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 sm:p-4">
                        <div className="space-y-1">
                            <div className="text-sm font-semibold text-slate-100">로그인이 필요합니다</div>
                            <div className="text-xs text-slate-400">Google 계정으로 간단히 로그인할 수 있어요.</div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={onLoginClick}
                                disabled={loading}
                                className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-sm text-indigo-200 hover:border-indigo-400 hover:bg-indigo-500/15 disabled:opacity-60"
                            >
                                {loading ? "로그인 중..." : "Google로 로그인"}
                            </button>
                            <Link
                                to="/app"
                                className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-700"
                            >
                                로그인 없이 둘러보기
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
