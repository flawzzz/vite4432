import { useEffect, useState } from "react";

export default function SetEffect() {

    interface SetEffectData {
        name: string;
        prefix: string;
        set_effect: string;
        type: string;
        image: string;
    }

    const [data, setData] = useState<SetEffectData[] | null>(null);

    useEffect(() => {
        async function load() {
            const res = await fetch("/data/set.json");
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

    const grouped: { [key: string]: SetEffectData[] } = {};

    data.forEach(item => {
        const key = item.name;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
    });

    return (
        <div className="flex flex-1 flex-col px-4 py-8">
            <div className="mx-auto w-full max-w-5xl space-y-6">
                <header className="space-y-1">
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        세트 아이템 효과
                    </h1>
                    <p className="text-xs text-slate-400 sm:text-sm">
                        세트 장비의 대표 아이콘과 이름만 심플하게 정리했습니다.
                    </p>
                </header>

                <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {Object.entries(grouped).map(([name, members]) => (
                        <div
                            key={name}
                            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-center text-xs text-slate-200 space-y-2"
                        >
                            <img
                                src={`/images/set/${members[0].image}.PNG`}
                                alt={members[0].image}
                                className="mx-auto h-16 w-16 rounded bg-slate-800 object-contain"
                            />
                            <p className="font-semibold truncate">{members[0].name}</p>
                        </div>
                    ))}
                </section>
            </div>
        </div>
    );
}
