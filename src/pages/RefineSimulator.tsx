import { getProb, getRefineCost, refineAttempt, type Outcome, type State } from "../engine";
import { useEffect, useMemo, useRef, useState } from "react";

type LogEntry = {
    id: string;
    at: number;
    attemptNo: number;
    prev: State;
    next: State;
    outcome: Outcome;
    roll: number;
    prob: {
        success: number;
        keep: number;
        fail: number;
        break: number;
    };
};

type ClickEffect = {
    key: number;
    outcome: Outcome;
};

function outcomeLabel(outcome: Outcome): string {
    switch (outcome) {
        case "SUCCESS":
            return "성공";
        case "KEEP":
            return "유지";
        case "FAIL":
            return "실패";
        case "BREAK":
            return "파괴";
    }
}

function outcomeTone(outcome: Outcome): string {
    switch (outcome) {
        case "SUCCESS":
            return "text-emerald-300";
        case "KEEP":
            return "text-slate-300";
        case "FAIL":
            return "text-amber-300";
        case "BREAK":
            return "text-rose-300";
    }
}

function outcomeRingTone(outcome: Outcome): string {
    switch (outcome) {
        case "SUCCESS":
            return "border-emerald-400/40";
        case "KEEP":
            return "border-slate-400/30";
        case "FAIL":
            return "border-amber-400/40";
        case "BREAK":
            return "border-rose-400/40";
    }
}

function outcomeChipTone(outcome: Outcome): string {
    switch (outcome) {
        case "SUCCESS":
            return "border-emerald-500/30 bg-emerald-500/10";
        case "KEEP":
            return "border-slate-500/30 bg-slate-500/10";
        case "FAIL":
            return "border-amber-500/30 bg-amber-500/10";
        case "BREAK":
            return "border-rose-500/30 bg-rose-500/10";
    }
}

function effectAnim(outcome: Outcome): string {
    if (outcome === "BREAK") return "animate-refine-shake";
    return "animate-bounce";
}

export default function RefineSimulator() {
    const [state, setState] = useState<State>({ level: 0, failGuard: 0 });
    const [resetLevel, setResetLevel] = useState<number>(0);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [logFilter, setLogFilter] = useState<"ALL" | "SUCCESS" | "KEEP" | "FAIL" | "BREAK">("ALL");
    const [maxLevel, setMaxLevel] = useState(0);
    const [totalAttempts, setTotalAttempts] = useState(0);
    const [totalStone, setTotalStone] = useState(0);
    const [totalCatalyst, setTotalCatalyst] = useState(0);
    const [totalRion, setTotalRion] = useState(0);
    const [totalGold, setTotalGold] = useState(0);
    const [totalTerra, setTotalTerra] = useState(0);
    const [effect, setEffect] = useState<ClickEffect | null>(null);
    const logContainerRef = useRef<HTMLDivElement | null>(null);
    const attemptCounterRef = useRef(0);
    const effectTimerRef = useRef<number | null>(null);

    const prob = useMemo(() => getProb(state.level, state.failGuard), [state.level, state.failGuard]);
    const nf = useMemo(() => new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }), []);

    const filteredLogs = useMemo(() => {
        if (logFilter === "ALL") return logs;
        return logs.filter((l) => l.outcome === logFilter);
    }, [logs, logFilter]);

    useEffect(() => {
        return () => {
            if (effectTimerRef.current !== null) window.clearTimeout(effectTimerRef.current);
        };
    }, []);

    function handleAttempt() {
        const attempt = refineAttempt(state);
        const cost = getRefineCost(attempt.prev.level);
        attemptCounterRef.current += 1;
        const nextAttemptNo = attemptCounterRef.current;

        const entry: LogEntry = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            at: Date.now(),
            attemptNo: nextAttemptNo,
            prev: attempt.prev,
            next: attempt.next,
            outcome: attempt.outcome,
            roll: attempt.roll,
            prob: attempt.prob,
        };

        setState(attempt.next);
        setMaxLevel((prev) => Math.max(prev, attempt.prev.level, attempt.next.level));
        setTotalAttempts(nextAttemptNo);
        setTotalStone((prev) => prev + cost.stone);
        setTotalCatalyst((prev) => prev + cost.catalyst);
        setTotalRion((prev) => prev + cost.rion);
        setTotalGold((prev) => prev + cost.gold);
        setTotalTerra((prev) => prev + cost.terra);
        setLogs((prev) => {
            const next = [entry, ...prev];
            return next.length > 200 ? next.slice(0, 200) : next;
        });

        // 최신 로그가 위에 오므로, 스크롤도 위로 고정
        requestAnimationFrame(() => {
            if (logContainerRef.current) logContainerRef.current.scrollTop = 0;
        });

        // 클릭 이펙트
        setEffect({ key: nextAttemptNo, outcome: attempt.outcome });
        if (effectTimerRef.current !== null) window.clearTimeout(effectTimerRef.current);
        effectTimerRef.current = window.setTimeout(() => setEffect(null), 650);
    }

    function handleReset() {
        const nextLevel = Number.isFinite(resetLevel) ? Math.min(9, Math.max(0, Math.trunc(resetLevel))) : 0;
        setState({ level: nextLevel, failGuard: 0 });
        setLogs([]);
        setLogFilter("ALL");
        setMaxLevel(nextLevel);
        setTotalAttempts(0);
        setTotalStone(0);
        setTotalCatalyst(0);
        setTotalRion(0);
        setTotalGold(0);
        setTotalTerra(0);
        attemptCounterRef.current = 0;
        setEffect(null);
        if (effectTimerRef.current !== null) window.clearTimeout(effectTimerRef.current);
        effectTimerRef.current = null;
    }

    const guardLabel = state.failGuard === 0 ? "보정 없음" : state.failGuard === 1 ? "1회 보정" : "2회 보정";

    return (
        <div className="flex flex-1 flex-col px-3 py-6">
            <div className="mx-auto w-full max-w-4xl space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">연마 시뮬레이터</h1>
                        <p className="text-xs text-slate-400 sm:text-sm">연마 시도 결과를 로그로 기록합니다.</p>
                    </div>
                    <img
                        src="/images/refine/weapon.png"
                        alt="Weapon"
                        className="h-10 w-auto rounded-full border border-slate-800 bg-slate-950/40 p-1"
                    />
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                    <section className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                                <p className="text-xs text-slate-400">현재 상태</p>
                                <div className="flex items-end gap-3">
                                    <div className="text-3xl font-semibold tracking-tight text-slate-100">{state.level}</div>
                                    <div className="pb-1 text-xs text-slate-400">{guardLabel}</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleAttempt}
                                    className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-sm text-indigo-200 hover:border-indigo-400 hover:bg-indigo-500/15"
                                >
                                    연마 시도
                                </button>

                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-700"
                                >
                                    초기화
                                </button>
                                <label className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-700">
                                    <select
                                        aria-label="초기화 레벨"
                                        value={resetLevel}
                                        onChange={(e) => setResetLevel(parseInt(e.target.value, 10))}
                                        className="bg-transparent text-sm text-slate-100 outline-none"
                                    >
                                        {Array.from({ length: 10 }, (_, i) => (
                                            <option key={i} value={i}>
                                                {i}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-3">
                            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium text-slate-200">현재 확률</div>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                                    <div className="flex items-center justify-between text-slate-200">
                                        <span className="text-emerald-300">성공</span>
                                        <span className="tabular-nums text-slate-200">{prob.success}%</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-200">
                                        <span className="text-slate-300">유지</span>
                                        <span className="tabular-nums text-slate-200">{prob.keep}%</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-200">
                                        <span className="text-amber-300">실패</span>
                                        <span className="tabular-nums text-slate-200">{prob.fail}%</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-200">
                                        <span className="text-rose-300">파괴</span>
                                        <span className="tabular-nums text-slate-200">{prob.break}%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium text-slate-200">누적</div>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-sm">
                                    <span className="text-slate-400">최고 연마</span>
                                    <span className="tabular-nums text-slate-100">{maxLevel}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-sm">
                                    <span className="text-slate-400">시도 횟수</span>
                                    <span className="tabular-nums text-slate-100">{totalAttempts}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-sm">
                                    <span className="text-slate-400">상급 라이언코크스</span>
                                    <span className="tabular-nums text-slate-100">{nf.format(totalRion)}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-sm">
                                    <span className="text-slate-400">연마석</span>
                                    <span className="tabular-nums text-slate-100">{nf.format(totalStone)}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-sm">
                                    <span className="text-slate-400">촉매제</span>
                                    <span className="tabular-nums text-slate-100">{nf.format(totalCatalyst)}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-sm">
                                    <span className="text-slate-400">골드</span>
                                    <span className="tabular-nums text-slate-100">{nf.format(totalGold)}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-sm">
                                    <span className="text-slate-400">테라</span>
                                    <span className="tabular-nums text-slate-100">{nf.format(totalTerra)}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-sm">
                                    <span className="text-slate-400">세라</span>
                                    <span className="tabular-nums text-slate-100">{nf.format(totalTerra / 25)}</span>
                                </div>
                            </div>
                        </div>

                        {effect && (
                            <div key={effect.key} className="pointer-events-none absolute inset-0 grid place-items-center">
                                <div className="relative">
                                    <div
                                        className={`absolute inset-0 rounded-full border ${outcomeRingTone(effect.outcome)} animate-ping ${
                                            effect.outcome === "BREAK" ? "scale-110" : ""
                                        }`}
                                    />
                                    <div
                                        className={`relative rounded-full border px-5 py-2 text-sm font-semibold ${outcomeTone(effect.outcome)} ${outcomeChipTone(effect.outcome)} ${effectAnim(effect.outcome)} backdrop-blur`}
                                    >
                                        {outcomeLabel(effect.outcome)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-sm font-medium text-slate-200">로그</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setLogFilter((prev) => (prev === "SUCCESS" ? "ALL" : "SUCCESS"))}
                                    aria-pressed={logFilter === "SUCCESS"}
                                    className={`rounded-full border px-3 py-1 text-xs hover:border-slate-700 ${
                                        logFilter === "SUCCESS"
                                            ? `${outcomeChipTone("SUCCESS")} ${outcomeTone("SUCCESS")}`
                                            : "border-slate-800 bg-slate-950/40 text-slate-200"
                                    }`}
                                >
                                    성공
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLogFilter((prev) => (prev === "KEEP" ? "ALL" : "KEEP"))}
                                    aria-pressed={logFilter === "KEEP"}
                                    className={`rounded-full border px-3 py-1 text-xs hover:border-slate-700 ${
                                        logFilter === "KEEP"
                                            ? `${outcomeChipTone("KEEP")} ${outcomeTone("KEEP")}`
                                            : "border-slate-800 bg-slate-950/40 text-slate-200"
                                    }`}
                                >
                                    유지
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLogFilter((prev) => (prev === "FAIL" ? "ALL" : "FAIL"))}
                                    aria-pressed={logFilter === "FAIL"}
                                    className={`rounded-full border px-3 py-1 text-xs hover:border-slate-700 ${
                                        logFilter === "FAIL"
                                            ? `${outcomeChipTone("FAIL")} ${outcomeTone("FAIL")}`
                                            : "border-slate-800 bg-slate-950/40 text-slate-200"
                                    }`}
                                >
                                    실패
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLogFilter((prev) => (prev === "BREAK" ? "ALL" : "BREAK"))}
                                    aria-pressed={logFilter === "BREAK"}
                                    className={`rounded-full border px-3 py-1 text-xs hover:border-slate-700 ${
                                        logFilter === "BREAK"
                                            ? `${outcomeChipTone("BREAK")} ${outcomeTone("BREAK")}`
                                            : "border-slate-800 bg-slate-950/40 text-slate-200"
                                    }`}
                                >
                                    파괴
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLogs([])}
                                    className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-xs text-slate-200 hover:border-slate-700"
                                    disabled={logs.length === 0}
                                >
                                    로그 비우기
                                </button>
                            </div>
                        </div>

                        <div
                            ref={logContainerRef}
                            className="mt-3 h-[360px] overflow-auto rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                        >
                            {logs.length === 0 ? (
                                <p className="text-sm text-slate-500">아직 로그가 없어요. “연마 시도”를 눌러보세요.</p>
                            ) : filteredLogs.length === 0 ? (
                                <p className="text-sm text-slate-500">선택한 필터에 해당하는 로그가 없어요.</p>
                            ) : (
                                <div className="space-y-2">
                                    {filteredLogs.map((l) => {
                                            const time = new Date(l.at).toLocaleTimeString();
                                            return (
                                                <div key={l.id} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="text-xs text-slate-500">
                                                            #{l.attemptNo} · {time}
                                                        </div>
                                                        <div className={`text-xs font-medium ${outcomeTone(l.outcome)}`}>{outcomeLabel(l.outcome)}</div>
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                                                        <span className="tabular-nums">{l.prev.level}</span>
                                                        <span className="text-slate-600">→</span>
                                                        <span className="tabular-nums">{l.next.level}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}