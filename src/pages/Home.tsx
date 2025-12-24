import { useEffect, useMemo, useState } from "react";

type Item = {
    name: string;
    type: string;
    effect: string;
    set_id: string;
    set_effect: string;
    image: string;
};

type Weapon = {
    name: string;
    type: string;
    available: string;
    basic_info: string;
    effect: string;
    image: string;
    [key: string]: unknown;
};

function normalizeText(value: unknown): string {
    return String(value ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function firstLine(text: string): string {
    const normalized = String(text ?? "").replace(/\r/g, "");
    const idx = normalized.indexOf("\n");
    return (idx >= 0 ? normalized.slice(0, idx) : normalized).trim();
}

export default function Home() {
    const [query, setQuery] = useState("");
    const [items, setItems] = useState<Item[]>([]);
    const [weapons, setWeapons] = useState<Weapon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);

    useEffect(() => {
        if (!selectedItem) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSelectedItem(null);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selectedItem]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                setIsLoading(true);
                setLoadError(null);
                const [itemRes, weaponRes] = await Promise.all([
                    fetch("/data/item.json"),
                    fetch("/data/weapon.json"),
                ]);

                if (!itemRes.ok) {
                    throw new Error(`item.json 로딩 실패 (${itemRes.status})`);
                }
                if (!weaponRes.ok) {
                    throw new Error(`weapon.json 로딩 실패 (${weaponRes.status})`);
                }

                const itemData = (await itemRes.json()) as Item[];
                const weaponData = (await weaponRes.json()) as Weapon[];

                if (cancelled) return;
                setItems(Array.isArray(itemData) ? itemData.filter((i) => i?.name) : []);
                setWeapons(Array.isArray(weaponData) ? weaponData.filter((w) => w?.name) : []);
            } catch (err) {
                if (cancelled) return;
                setLoadError(err instanceof Error ? err.message : "데이터 로딩 실패");
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const normalizedQuery = useMemo(() => normalizeText(query), [query]);
    const shouldSearch = normalizedQuery.length >= 2;

    const matchedItems = useMemo(() => {
        if (!shouldSearch) return [];
        return items.filter((item) => {
            const hay = `${item.name} ${item.effect}`;
            return normalizeText(hay).includes(normalizedQuery);
        });
    }, [items, normalizedQuery, shouldSearch]);

    const matchedWeapons = useMemo(() => {
        if (!shouldSearch) return [];
        return weapons.filter((weapon) => {
            const hay = `${weapon.name} ${weapon.effect}`;
            return normalizeText(hay).includes(normalizedQuery);
        });
    }, [weapons, normalizedQuery, shouldSearch]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
    };

    return (
        <div className="flex flex-1 items-center justify-center px-4">
            <div className="w-full max-w-xl space-y-6 text-center">
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                        던모아 - 던파모바일 모아보기
                    </h1>
                    <p className="text-xs text-slate-400 sm:text-sm">
                        캐릭터, 세트 아이템, 무기, 옵션을 한 번에 찾아보세요.
                        </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="relative">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 pr-12 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                            placeholder="예) 어느 말괄량이, 인챈트리스, 버블 반바지..."
                        />

                        {shouldSearch && (
                            <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-xl border border-slate-800 bg-slate-950/95 p-2 text-left shadow-sm">
                                {isLoading ? (
                                    <div className="px-3 py-3 text-xs text-slate-400">
                                        검색 데이터 로딩 중...
                                    </div>
                                ) : loadError ? (
                                    <div className="px-3 py-3 text-xs text-slate-400">
                                        {loadError}
                                    </div>
                                ) : matchedItems.length === 0 && matchedWeapons.length === 0 ? (
                                    <div className="px-3 py-3 text-xs text-slate-400">
                                        검색 결과가 없습니다.
                                    </div>
                                ) : (
                                    <div className="max-h-80 overflow-y-auto">
                                        {matchedItems.length > 0 && (
                                            <div className="px-2 py-2">
                                                <div className="px-1 text-[11px] font-semibold text-slate-300">
                                                    아이템 ({matchedItems.length})
                                                </div>
                                                <div className="mt-2 space-y-1">
                                                    {matchedItems.map((item) => (
                                                        <button
                                                            key={`item-${item.set_id}-${item.image}-${item.name}`}
                                                            type="button"
                                                            onClick={() => setSelectedItem(item)}
                                                            className="w-full rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-left hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-600"
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <div className="truncate text-xs font-semibold text-slate-100">
                                                                        {item.name}
                                                                    </div>
                                                                    <div className="truncate text-[11px] text-slate-400">
                                                                        {item.type} · {item.set_id}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="mt-1 truncate text-[11px] text-slate-300">
                                                                {firstLine(item.effect)}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {matchedWeapons.length > 0 && (
                                            <div className="px-2 py-2">
                                                <div className="px-1 text-[11px] font-semibold text-slate-300">
                                                    무기 ({matchedWeapons.length})
                                                </div>
                                                <div className="mt-2 space-y-1">
                                                    {matchedWeapons.map((weapon) => (
                                                        <div
                                                            key={`weapon-${weapon.image}-${weapon.name}`}
                                                            className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2"
                                                        >
                                                            <div className="min-w-0">
                                                                <div className="truncate text-xs font-semibold text-slate-100">
                                                                    {weapon.name}
                                                                </div>
                                                                <div className="truncate text-[11px] text-slate-400">
                                                                    {weapon.available} · {weapon.type}
                                                                </div>
                                                            </div>
                                                            <div className="mt-1 truncate text-[11px] text-slate-300">
                                                                {firstLine(weapon.effect)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </form>
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