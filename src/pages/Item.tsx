import { useEffect, useMemo, useState } from "react";

export default function ItemPage() {
    interface ItemData {
        name: string;
        type: string;
        effect: string;
        set_id: string;
        set_effect: string;
        image: string;
    }

    const [data, setData] = useState<ItemData[] | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<
        "방어구" | "악세사리" | "특수장비" | null
    >(null);
    const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
    const [query, setQuery] = useState("");

    function normalizeText(value: unknown): string {
        return String(value ?? "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    const categoryTags = useMemo(
        () => ["방어구", "악세사리", "특수장비"] as const,
        []
    );

    const itemCategory = (
        item: ItemData
    ): "방어구" | "악세사리" | "특수장비" | null => {
        const t = (item.type ?? "").trim();
        if (!t) return null;
        if (t.includes("방어구")) return "방어구";
        if (t.includes("악세")) return "악세사리";
        if (t.includes("특수")) return "특수장비";
        return null;
    };

    const normalizedQuery = useMemo(() => normalizeText(query), [query]);
    const shouldSearch = normalizedQuery.length >= 2;

    const filteredData = useMemo(() => {
        if (!data) return null;
        let list = data;
        if (selectedCategory) {
            list = list.filter((i) => itemCategory(i) === selectedCategory);
        }

        if (!shouldSearch) return list;
        return list.filter((i) => {
            const hay = `${i.name} ${i.type} ${i.set_id} ${i.effect} ${i.set_effect}`;
            return normalizeText(hay).includes(normalizedQuery);
        });
    }, [data, normalizedQuery, selectedCategory, shouldSearch]);

    useEffect(() => {
        async function load() {
            const res = await fetch("/data/item.json");
            const json = await res.json();
            setData(json);
        }
        load();
    }, []);

    useEffect(() => {
        if (!selectedItem) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSelectedItem(null);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selectedItem]);

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
                        아이템 정보
                    </h1>
                    <p className="text-xs text-slate-400 sm:text-sm">
                        아이템 종류(방어구/악세사리/특수장비) 기준으로 태그로 분류했습니다.
                    </p>
                </header>

                <section className="space-y-2">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                        placeholder="아이템 이름/효과/세트명으로 검색 (2글자 이상)"
                    />
                    <p className="text-[11px] text-slate-500">
                        2글자 이상 입력하면 필터링됩니다.
                    </p>
                </section>

                <section className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setSelectedCategory(null)}
                        className={
                            !selectedCategory
                                ? "rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-100"
                                : "rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-300 hover:border-slate-700"
                        }
                    >
                        전체
                    </button>
                    {categoryTags.map((tag) => {
                        const active = selectedCategory === tag;
                        return (
                            <button
                                key={tag}
                                type="button"
                                onClick={() =>
                                    setSelectedCategory((prev) => (prev === tag ? null : tag))
                                }
                                className={
                                    active
                                        ? "rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-100"
                                        : "rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-300 hover:border-slate-700"
                                }
                            >
                                {tag}
                            </button>
                        );
                    })}
                </section>

                <section className="grid gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {filteredData?.map((item) => (
                        <button
                            key={`${item.set_id}-${item.image}-${item.name}`}
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-center text-xs text-slate-200 space-y-2 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-600"
                        >
                            <img
                                src={`/images/item/item_${item.image}.png`}
                                alt={item.name}
                                className="mx-auto h-14 w-14 rounded bg-slate-800 object-contain"
                            />
                            <p className="font-semibold truncate">{item.name}</p>
                            <p className="text-[0.7rem] text-slate-400 truncate">
                                {item.type} · {item.set_id}
                            </p>
                        </button>
                    ))}
                </section>
            </div>

            {selectedItem && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${selectedItem.name} 상세 정보`}
                >
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-950/70"
                        onClick={() => setSelectedItem(null)}
                        aria-label="닫기"
                    />
                    <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 text-slate-200 shadow-xl">
                        <div className="flex items-start gap-3 border-b border-slate-800 p-4">
                            <img
                                src={`/images/item/item_${selectedItem.image}.png`}
                                alt={selectedItem.name}
                                className="h-14 w-14 shrink-0 rounded bg-slate-800 object-contain"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-semibold">
                                    {selectedItem.name}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    {selectedItem.type} · {selectedItem.set_id}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedItem(null)}
                                className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-300 hover:border-slate-700"
                            >
                                닫기
                            </button>
                        </div>

                        <div className="max-h-[70vh] space-y-4 overflow-auto p-4 text-sm">
                            <div>
                                <p className="mb-1 text-xs font-semibold text-slate-300">
                                    효과
                                </p>
                                <p className="whitespace-pre-wrap text-xs text-slate-200">
                                    {selectedItem.effect}
                                </p>
                            </div>

                            {selectedItem.set_effect?.trim() && (
                                <div>
                                    <p className="mb-1 text-xs font-semibold text-slate-300">
                                        세트 효과
                                    </p>
                                    <p className="whitespace-pre-wrap text-xs text-slate-200">
                                        {selectedItem.set_effect}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
