import { useEffect, useState } from "react";

export default function Character() {

    interface CharacterData {
        job: string;
        image: string;
        group: string;
    }

    const [data, setData] = useState<CharacterData[] | null>(null);

    useEffect(() => {
        async function load() {
            const res = await fetch("/data/character.json");
            const json = await res.json();
            setData(json);
        }
        load();
    }, []);

    if (!data) {
        return (
            <div className="flex flex-1 items-center justify-center px-3 py-6 text-slate-300">
                loading...
            </div>
        );
    }

    const grouped: { [key: string]: CharacterData[] } = {};

    data.forEach(person => {
        const group = person.group;
        if (!grouped[group]) grouped[group] = [];
        grouped[group].push(person);
    });

    return (
        <div className="flex flex-1 flex-col px-3 py-6">
            <div className="mx-auto w-full max-w-4xl space-y-4">
                <header className="space-y-1">
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        캐릭터 고유 효과 모아보기
                    </h1>

                </header>

                <section className="space-y-3">
                    {Object.entries(grouped).map(([group, members]) => (
                        <div
                            key={group}
                            className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-3"
                        >
                            <h2 className="text-sm font-semibold text-slate-100">
                                {group}
                            </h2>
                            <div className="flex flex-wrap gap-3">
                                {members.map((member) => (
                                    <div
                                        key={member.job}
                                        className="w-20 space-y-1 text-center text-xs text-slate-200"
                                    >
                                        <img
                                            src={`/images/character/${member.image}.PNG`}
                                            alt={member.job}
                                            className="mx-auto h-12 w-12 rounded bg-slate-800 object-contain"
                                        />
                                        <p className="truncate">{member.job}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            </div>
        </div>
    );
}
