import { useEffect, useMemo, useState } from "react";

export default function WeaponPage() {

    interface WeaponData {
        name: string;
        type: string;
        available: string;
        basic_info: string;
        effect: string;
        image: string;
    }

    const [data, setData] = useState<WeaponData[] | null>(null);
    const [selectedJob, setSelectedJob] = useState<string | null>(null);
    const [selectedWeapon, setSelectedWeapon] = useState<WeaponData | null>(null);

    const jobTags = useMemo(() => {
        if (!data) return [] as string[];
        const tags = Array.from(
            new Set(
                data
                    .map((w) => (w.available ?? "").trim())
                    .filter((v) => v.length > 0)
            )
        );
        tags.sort((a, b) => a.localeCompare(b, "ko"));
        return tags;
    }, [data]);

    const filteredData = useMemo(() => {
        if (!data) return null;
        if (!selectedJob) return data;
        return data.filter((w) => (w.available ?? "").trim() === selectedJob);
    }, [data, selectedJob]);

    const toggleJob = (job: string) => {
        setSelectedJob((prev) => (prev === job ? null : job));
    };

    useEffect(() => {
        async function load() {
            const res = await fetch("/data/weapon.json");
            const json = await res.json();
            setData(json);
        }
        load();
    }, []);

    useEffect(() => {
        if (!selectedWeapon) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSelectedWeapon(null);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selectedWeapon]);

    if (!data) {
        return (
            <div className="flex flex-1 items-center justify-center px-3 py-6 text-slate-300">
                loading...
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col px-3 py-6">
            <div className="mx-auto w-full max-w-4xl space-y-4">
                <header className="space-y-1">
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        무기 모아보기
                    </h1>
                </header>

                <section className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setSelectedJob(null)}
                        className={
                            !selectedJob
                                ? "rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-100"
                                : "rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-300 hover:border-slate-700"
                        }
                    >
                        전체
                    </button>
                    {jobTags.map((job) => {
                        const active = selectedJob === job;
                        return (
                            <button
                                key={job}
                                type="button"
                                onClick={() => toggleJob(job)}
                                className={
                                    active
                                        ? "rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-100"
                                        : "rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-300 hover:border-slate-700"
                                }
                            >
                                {job}
                            </button>
                        );
                    })}
                </section>

                <section className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {filteredData?.map((weapon) => (
                        <button
                            key={weapon.name + weapon.type}
                            type="button"
                            onClick={() => setSelectedWeapon(weapon)}
                            className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-center text-xs text-slate-200 space-y-2 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-600"
                        >
                            <img
                                src={`/images/weapon/weapon_${weapon.image}.png`}
                                alt={weapon.name}
                                className="mx-auto h-14 w-14 rounded bg-slate-800 object-contain"
                            />
                            <p className="font-semibold truncate">{weapon.name}</p>
                            <p className="text-[0.7rem] text-slate-400 truncate">{weapon.type}</p>
                        </button>
                    ))}
                </section>
            </div>

            {selectedWeapon && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${selectedWeapon.name} 상세 정보`}
                >
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-950/70"
                        onClick={() => setSelectedWeapon(null)}
                        aria-label="닫기"
                    />
                    <div className="relative w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 text-slate-200 shadow-xl">
                        <div className="flex items-start gap-3 border-b border-slate-800 p-3">
                            <img
                                src={`/images/weapon/weapon_${selectedWeapon.image}.png`}
                                alt={selectedWeapon.name}
                                className="h-14 w-14 shrink-0 rounded bg-slate-800 object-contain"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-semibold">
                                    {selectedWeapon.name}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    {selectedWeapon.available} · {selectedWeapon.type}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedWeapon(null)}
                                className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-300 hover:border-slate-700"
                            >
                                닫기
                            </button>
                        </div>

                        <div className="max-h-[70vh] space-y-3 overflow-auto p-3 text-sm">
                            <div>
                                <p className="mb-1 text-xs font-semibold text-slate-300">
                                    기본 정보
                                </p>
                                <p className="whitespace-pre-wrap text-xs text-slate-200">
                                    {selectedWeapon.basic_info}
                                </p>
                            </div>

                            <div>
                                <p className="mb-1 text-xs font-semibold text-slate-300">
                                    효과
                                </p>
                                <p className="whitespace-pre-wrap text-xs text-slate-200">
                                    {selectedWeapon.effect}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
