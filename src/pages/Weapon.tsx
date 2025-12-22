import { useEffect, useState } from "react";

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

    useEffect(() => {
        async function load() {
            const res = await fetch("/data/weapon.json");
            const json = await res.json();
            setData(json);
        }
        load();
    }, []);

    if (!data) {
        return (
            <div className="flex flex-1 items-center justify-center px-4 py-8 text-slate-300">
                loading...
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col px-4 py-8">
            <div className="mx-auto w-full max-w-5xl space-y-6">
                <header className="space-y-1">
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        무기 정보
                    </h1>
                    <p className="text-xs text-slate-400 sm:text-sm">
                        직업별로 사용 가능한 무기들을 간단한 카드 형태로 정리했습니다.
                    </p>
                </header>

                <section className="grid gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {data.map((weapon) => (
                        <div
                            key={weapon.name + weapon.type}
                            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-center text-xs text-slate-200 space-y-2"
                        >
                            <img
                                src={`/images/weapon/weapon_${weapon.image}.png`}
                                alt={weapon.name}
                                className="mx-auto h-14 w-14 rounded bg-slate-800 object-contain"
                            />
                            <p className="font-semibold truncate">{weapon.name}</p>
                            <p className="text-[0.7rem] text-slate-400 truncate">{weapon.type}</p>
                        </div>
                    ))}
                </section>
            </div>
        </div>
    );
}
