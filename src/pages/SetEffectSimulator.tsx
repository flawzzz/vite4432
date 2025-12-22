import { useEffect, useMemo, useState } from "react";

type Character = {
    job: string;
    image: string;
    group: string;
};

type Item = {
    name: string;
    part: string; // 상의, 바지, 머리어깨, 벨트, 신발, 팔찌, 목걸이, 반지, 귀걸이, 보조장비, 마법석
    rank: string;
    prefix: string;
    effect: string;
    set: string;
    image?: string; // 섬네일 이미지 파일명 (가정)
};

type Weapon = {
    name: string;
    type: string;
    available: string;
    basic_info: string;
    effect: string;
    image: string;
};

type SetData = {
    name: string;
    prefix: string;
    set_effect: string;
    type: string;
    image: string;
};

type SlotId =
    | "headShoulder"
    | "top"
    | "bottom"
    | "belt"
    | "shoes"
    | "bracelet"
    | "necklace"
    | "ring"
    | "earring"
    | "support"
    | "magicStone"
    | "weapon";

type SlotDef = {
    id: SlotId;
    label: string;
    part: string | null; // item.json 의 part 값 (무기는 null)
};

const STORAGE_KEY = "setEffectSimulatorState_v1";

const ARMOR_SLOTS: SlotDef[] = [
    { id: "headShoulder", label: "머리어깨", part: "머리어깨" },
    { id: "top", label: "상의", part: "상의" },
    { id: "bottom", label: "하의", part: "바지" },
    { id: "belt", label: "벨트", part: "벨트" },
    { id: "shoes", label: "신발", part: "신발" },
];

const ACCESSORY_SLOTS: SlotDef[] = [
    { id: "bracelet", label: "팔찌", part: "팔찌" },
    { id: "necklace", label: "목걸이", part: "목걸이" },
    { id: "ring", label: "반지", part: "반지" },
];

const SPECIAL_SLOTS: SlotDef[] = [
    { id: "earring", label: "귀걸이", part: "귀걸이" },
    { id: "support", label: "보조장비", part: "보조장비" },
    { id: "magicStone", label: "마법석", part: "마법석" },
];

const ALL_SLOT_ORDER: SlotId[] = [
    "headShoulder",
    "top",
    "bottom",
    "belt",
    "shoes",
    "bracelet",
    "necklace",
    "ring",
    "earring",
    "support",
    "magicStone",
    "weapon",
];

type PersistedSlotInfo = {
    kind: "item" | "weapon";
    name: string;
    part?: string;
    prefix?: string;
};

type PersistedSlots = Partial<Record<SlotId, PersistedSlotInfo>>;

function getSlotDef(id: SlotId): SlotDef | null {
    return (
        ARMOR_SLOTS.find((s) => s.id === id) ||
        ACCESSORY_SLOTS.find((s) => s.id === id) ||
        SPECIAL_SLOTS.find((s) => s.id === id) ||
        (id === "weapon"
            ? { id: "weapon", label: "무기", part: null }
            : null)
    );
}

function extractSetSegments(text: string): { three?: string; five?: string } {
    const lines = text.split(/\r?\n/);
    const segments: Record<string, string[]> = {};
    let current: string | null = null;

    for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;

        const m = line.match(/^\[(\d+)]\s*세트효과/);
        if (m) {
            const key = m[1];
            if (key === "3" || key === "5") {
                current = key;
                if (!segments[current]) segments[current] = [];
            } else {
                current = null;
            }
            continue;
        }

        if (current) {
            segments[current].push(line);
        }
    }

    return {
        three: segments["3"]?.join("\n"),
        five: segments["5"]?.join("\n"),
    };
}

function getThumbnailSrc(value: Item | Weapon): string | null {
    if ("basic_info" in value) {
        // 무기 섬네일 (weapon.json 의 image 필드 사용)
        return value.image ? `/images/weapon/weapon_${value.image}.png` : null;
    }
    const item = value as Item;
    // 아이템 섬네일 (item.json 에 image 필드가 있다고 가정)
    return item.image ? `/images/item/item_${item.image}.png` : null;
}

function parseAndCombineEffects(effects: string[]): string {
    type StatAgg = { value: number; isPercent: boolean };

    const aggregated: Record<string, StatAgg> = {};
    const others: string[] = [];

    const addStat = (key: string, value: number, isPercent: boolean) => {
        const normKey = key.trim();
        const mapKey = `${normKey}${isPercent ? "(%)" : ""}`;
        const current = aggregated[mapKey];
        aggregated[mapKey] = {
            value: (current?.value ?? 0) + value,
            isPercent,
        };
    };

    const processText = (text?: string) => {
        if (!text) return;

        const rawLines = text.split(/\r?\n/);
        for (const raw of rawLines) {
            const line = raw.trim();
            if (!line) continue;

            // 세트효과 제목 같은 줄은 제거
            if (/^\[\d+]\s*세트효과/.test(line)) {
                continue;
            }

            // 패턴 1: "항마력 +8000", "공격 속도 +10%" 형식
            const plusMatch = line.match(/^(.+?)\s*\+([0-9,]+)(%?)\b/);
            if (plusMatch) {
                const key = plusMatch[1];
                const num = parseInt(plusMatch[2].replace(/,/g, ""), 10) || 0;
                const isPercent = plusMatch[3] === "%";
                addStat(key, num, isPercent);
                continue;
            }

            // 패턴 2: "화상 데미지 10% 증가", "모든 타입 피해 15% 증가" 형식
            const incMatch = line.match(/^(.+?)\s+([0-9,]+)%\s*증가/);
            if (incMatch) {
                const key = incMatch[1];
                const num = parseInt(incMatch[2].replace(/,/g, ""), 10) || 0;
                addStat(key, num, true);
                continue;
            }

            // 인식되지 않는 줄은 그대로 보존
            others.push(line);
        }
    };

    effects.forEach((e) => processText(e));

    const aggregatedLines = Object.entries(aggregated).map(([rawKey, stat]) => {
        const key = rawKey.replace(/\(\%\)$/, "");
        const formatted = stat.value.toLocaleString("ko-KR");
        return `${key} +${formatted}${stat.isPercent ? "%" : ""}`;
    });

    const parts: string[] = [];
    if (aggregatedLines.length) parts.push(...aggregatedLines);
    if (aggregatedLines.length && others.length) parts.push("");
    if (others.length) parts.push(...others);

    return parts.join("\n");
}

export default function SetEffectSimulator() {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [weapons, setWeapons] = useState<Weapon[]>([]);
    const [sets, setSets] = useState<SetData[]>([]);

    const [selectedJob, setSelectedJob] = useState<string>("");
    const [activeSlot, setActiveSlot] = useState<SlotId | null>(null);
    const [selectedSlots, setSelectedSlots] = useState<
        Partial<Record<SlotId, Item | Weapon>>
    >({});
    const [initialSlotsFromStorage, setInitialSlotsFromStorage] = useState<
        PersistedSlots | null
    >(null);
    const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

    useEffect(() => {
        async function loadData() {
            try {
                const [characterRes, itemRes, setRes, weaponRes] = await Promise.all([
                    fetch("/data/character.json"),
                    fetch("/data/item.json"),
                    fetch("/data/set.json"),
                    fetch("/data/weapon.json"),
                ]);

                const characterData: Character[] = await characterRes.json();
                const itemData: Item[] = await itemRes.json();
                const setData: SetData[] = await setRes.json();
                const weaponData: Weapon[] = await weaponRes.json();

                setCharacters(characterData.filter((c) => c.job));
                setItems(itemData.filter((i) => i.name));
                setSets(setData.filter((s) => s.name));
                setWeapons(weaponData.filter((w) => w.name));
            } catch (e) {
                console.error("세트 효과 데이터 로딩 실패", e);
            }
        }

        loadData();
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as {
                selectedJob?: string;
                slots?: PersistedSlots;
            };
            if (parsed.selectedJob) setSelectedJob(parsed.selectedJob);
            if (parsed.slots) setInitialSlotsFromStorage(parsed.slots);
        } catch (e) {
            console.error("세트 효과 시뮬레이터 상태 로딩 실패", e);
        } finally {
            setHasLoadedFromStorage(true);
        }
    }, []);

    useEffect(() => {
        if (!initialSlotsFromStorage) return;
        if (!items.length && !weapons.length) return;

        setSelectedSlots(() => {
            const next: Partial<Record<SlotId, Item | Weapon>> = {};

            (Object.entries(initialSlotsFromStorage) as [SlotId, PersistedSlotInfo][]).forEach(
                ([slotId, info]) => {
                    if (!info) return;
                    if (info.kind === "weapon") {
                        const weapon = weapons.find((w) => w.name === info.name);
                        if (weapon) next[slotId] = weapon;
                    } else {
                        const item = items.find(
                            (i) =>
                                i.name === info.name &&
                                (!info.part || i.part === info.part) &&
                                (i.prefix || "") === (info.prefix || "")
                        );
                        if (item) next[slotId] = item;
                    }
                }
            );

            return next;
        });

        setInitialSlotsFromStorage(null);
    }, [initialSlotsFromStorage, items, weapons]);

    const selectedCharacter = useMemo(
        () => characters.find((c) => c.job === selectedJob) || null,
        [characters, selectedJob]
    );

    const filteredWeapons = useMemo(() => {
        if (!selectedCharacter) return weapons;

        const baseGroup = selectedCharacter.group.replace(/\(.*\)/, "");

        return weapons.filter((w) => {
            const available = w.available || "";
            return (
                selectedCharacter.group.includes(available) ||
                baseGroup.includes(available) ||
                selectedCharacter.job.includes(available)
            );
        });
    }, [weapons, selectedCharacter]);

    type ActiveSetEffect = {
        name: string;
        count: number;
        three?: string;
        five?: string;
    };

    const activeSetEffects = useMemo<ActiveSetEffect[]>(() => {
        if (!sets.length) return [];

        const counts: Record<string, number> = {};

        Object.values(selectedSlots).forEach((value) => {
            if (!value) return;
            if ("set" in value && value.set) {
                const setName = value.set;
                counts[setName] = (counts[setName] || 0) + 1;
            }
        });

        const results: ActiveSetEffect[] = [];

        Object.entries(counts).forEach(([setName, count]) => {
            if (count < 3) return;

            const candidates = sets.filter((s) => s.name === setName);
            if (!candidates.length) return;

            const base =
                candidates.find((s) => (s.prefix || "") === "") ||
                candidates[0];

            if (!base.set_effect) return;

            const segments = extractSetSegments(base.set_effect);
            const three = count >= 3 ? segments.three : undefined;
            const five = count >= 5 ? segments.five : undefined;

            if (!three && !five) return;

            results.push({ name: setName, count, three, five });
        });

        return results;
    }, [selectedSlots, sets]);

    const combinedEffects = useMemo(() => {
        const effects: string[] = [];
        for (const value of Object.values(selectedSlots)) {
            if (!value) continue;
            if ("effect" in value && value.effect) {
                effects.push(value.effect);
            }
        }
        activeSetEffects.forEach((s) => {
            if (s.three) effects.push(s.three);
            if (s.five) effects.push(s.five);
        });
        if (!effects.length) return "";
        return parseAndCombineEffects(effects);
    }, [selectedSlots, activeSetEffects]);

    useEffect(() => {
        if (!hasLoadedFromStorage) return;
        if (typeof window === "undefined") return;
        try {
            const slotsToPersist: PersistedSlots = {};
            (Object.entries(selectedSlots) as [SlotId, Item | Weapon][]).forEach(
                ([slotId, value]) => {
                    if (!value) return;
                    if ("basic_info" in value) {
                        // weapon
                        slotsToPersist[slotId] = {
                            kind: "weapon",
                            name: value.name,
                        };
                    } else {
                        const item = value as Item;
                        slotsToPersist[slotId] = {
                            kind: "item",
                            name: item.name,
                            part: item.part,
                            prefix: item.prefix,
                        };
                    }
                }
            );

            const payload = {
                selectedJob,
                slots: slotsToPersist,
            };
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
            console.error("세트 효과 시뮬레이터 상태 저장 실패", e);
        }
    }, [selectedJob, selectedSlots, hasLoadedFromStorage]);

    if (!characters.length && !items.length && !weapons.length) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
                <p>loading...</p>
            </div>
        );
    }

    const handleClearSlot = (slotId: SlotId) => {
        setSelectedSlots((prev) => {
            const next = { ...prev };
            delete next[slotId];
            return next;
        });
    };

    const renderSlotButton = (def: SlotDef) => {
        const selected = selectedSlots[def.id];
        const isWeapon = def.id === "weapon";

        let title = def.label;
        let sub = isWeapon
            ? "무기를 선택하세요"
            : `${def.label} 장비를 선택하세요`;

        if (selected) {
            if (isWeapon) {
                const w = selected as Weapon;
                title = w.name;
                sub = w.type;
            } else {
                const item = selected as Item;
                title = item.name;
                sub = `${item.set || ""}${item.prefix ? ` / ${item.prefix}` : ""}`.trim();
            }
        }

        const isActive = activeSlot === def.id;
        const thumbSrc = selected
            ? getThumbnailSrc(selected as Item | Weapon)
            : null;

        const onlyImage = !!selected && !!thumbSrc;

        return (
            <button
                key={def.id}
                type="button"
                onClick={() => setActiveSlot(def.id)}
                onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClearSlot(def.id);
                }}
                className={`flex flex-col items-center justify-center rounded border px-2 py-2 text-xs min-h-[70px] transition-colors ${
                    isActive
                        ? "border-indigo-400 bg-slate-800"
                        : "border-slate-700 bg-slate-900 hover:border-indigo-400 hover:bg-slate-800"
                }`}
            >
                <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center overflow-hidden mb-1">
                    {thumbSrc ? (
                        <img
                            src={thumbSrc}
                            alt={title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-[9px] text-slate-500">
                            {def.label}
                        </span>
                    )}
                </div>
                {!onlyImage && (
                    <>
                        <div className="font-semibold text-center truncate w-full">
                            {title || def.label}
                        </div>
                        <div className="text-[10px] text-slate-400 text-center truncate w-full mt-0.5">
                            {sub}
                        </div>
                    </>
                )}
            </button>
        );
    };

    let selectionTitle = "슬롯을 클릭하면 하단에 선택 가능한 아이템 목록이 표시됩니다.";
    let selectionDescription = "";
    let selectionItems: (Item | Weapon)[] = [];

    if (activeSlot) {
        const def = getSlotDef(activeSlot);
        if (def) {
            if (activeSlot === "weapon") {
                selectionTitle = "무기 선택";
                selectionDescription = selectedCharacter
                    ? `${selectedCharacter.group} / ${selectedCharacter.job} 사용 가능 무기 기준으로 필터링됩니다.`
                    : "직업을 선택하지 않으면 모든 무기가 표시됩니다.";
                selectionItems = filteredWeapons;
            } else if (def.part) {
                selectionTitle = `${def.label} 아이템 선택`;
                selectionDescription = `${def.part} 부위의 아이템이 표시됩니다.`;
                selectionItems = items.filter((i) => i.part === def.part && i.name);
            }
        }
    }

    const handleSelectItem = (slotId: SlotId, value: Item | Weapon) => {
        setSelectedSlots((prev) => ({
            ...prev,
            [slotId]: value,
        }));
    };

    return (
        <div className="flex flex-1 flex-col px-4 py-10">
            <div className="mx-auto w-full max-w-6xl space-y-6">
                <h1 className="text-3xl font-bold">세트 효과 시뮬레이터</h1>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* 좌측: 장비 슬롯 + 선택 패널 */}
                    <div className="space-y-4">
                        <div>
                            <label className="block mb-1 text-sm font-semibold">
                                직업 선택
                            </label>
                            <select
                                className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
                                value={selectedJob}
                                onChange={(e) => setSelectedJob(e.target.value)}
                            >
                                <option value="">직업을 선택하세요</option>
                                {characters.map((c) => (
                                    <option key={c.job} value={c.job}>
                                        {c.group} - {c.job}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 장비 슬롯 UI (3줄, 라벨 제거로 컴팩트하게) */}
                        <div className="space-y-3">
                            {/* 1줄: 방어구 5칸 */}
                            <div className="grid grid-cols-5 gap-2">
                                {ARMOR_SLOTS.map((def) => renderSlotButton(def))}
                            </div>

                            {/* 2줄: 악세사리 3칸 (다른 슬롯과 동일한 크기) */}
                            <div className="grid grid-cols-5 gap-2">
                                {ACCESSORY_SLOTS.map((def) => renderSlotButton(def))}
                                <div />
                                <div />
                            </div>

                            {/* 3줄: 특수장비 3칸 + 빈칸 1칸 + 무기 1칸 (우하단) */}
                            <div className="grid grid-cols-5 gap-2">
                                {SPECIAL_SLOTS.map((def) => renderSlotButton(def))}
                                <div />
                                {renderSlotButton({
                                    id: "weapon",
                                    label: "무기",
                                    part: null,
                                })}
                            </div>
                        </div>

                        {/* 하단: 선택 가능한 아이템 목록 */}
                        <div className="rounded-lg bg-slate-900/70 border border-slate-700 p-3 space-y-2 text-sm min-h-[180px]">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold">아이템 선택</h2>
                                {activeSlot && (
                                    <span className="text-xs text-slate-400">
                                        현재 선택된 슬롯: {getSlotDef(activeSlot)?.label}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400">{selectionTitle}</p>
                            {selectionDescription && (
                                <p className="text-[11px] text-slate-500">{selectionDescription}</p>
                            )}

                            {activeSlot && selectionItems.length > 0 ? (
                                <div className="mt-2 max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {selectionItems.map((value) => {
                                        const isWeapon = "basic_info" in value;
                                        const key = isWeapon
                                            ? `weapon-${value.name}`
                                            : `item-${(value as Item).part}-${value.name}-${
                                                  (value as Item).prefix
                                              }`;
                                        const thumbSrc = getThumbnailSrc(value as Item | Weapon);

                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() =>
                                                    handleSelectItem(
                                                        activeSlot,
                                                        value
                                                    )
                                                }
                                                className="text-left rounded border border-slate-700 bg-slate-900 px-2 py-2 text-xs hover:border-indigo-400 hover:bg-slate-800 transition-colors h-24 overflow-hidden"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                        {thumbSrc ? (
                                                            <img
                                                                src={thumbSrc}
                                                                alt={value.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-[9px] text-slate-400 text-center px-1 line-clamp-2">
                                                                이미지 없음
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold truncate">
                                                            {value.name || "이름 없음"}
                                                        </div>
                                                        {"set" in value && value.set && (
                                                            <div className="text-[11px] text-amber-300 truncate">
                                                                {value.set}
                                                            </div>
                                                        )}
                                                        {"prefix" in value && value.prefix && (
                                                            <div className="text-[11px] text-sky-300 truncate">
                                                                {value.prefix}
                                                            </div>
                                                        )}
                                                        <div className="mt-1 text-[11px] text-slate-300 whitespace-pre-wrap line-clamp-3">
                                                            {value.effect}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="mt-4 text-xs text-slate-500">
                                    {activeSlot
                                        ? "해당 슬롯에 장비 가능한 아이템이 없습니다."
                                        : "위의 장비 슬롯 중 하나를 클릭하면 이곳에 선택 가능한 아이템들이 표시됩니다."}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 우측: 효과 요약 및 개별 효과 */}
                    <div className="space-y-4">
                        <div className="rounded-lg bg-slate-900/70 p-4 border border-slate-700 min-h-[160px] whitespace-pre-wrap text-sm">
                            <h2 className="text-lg font-semibold mb-2">효과 (요약)</h2>
                            {combinedEffects ? (
                                <p>{combinedEffects}</p>
                            ) : (
                                <p className="text-slate-400">
                                    장비 슬롯에 아이템을 채우면, 이곳에 모든 효과가 합산되어 표시됩니다.
                                </p>
                            )}
                        </div>

                        <div className="rounded-lg bg-slate-900/70 p-4 border border-slate-700 text-sm space-y-3">
                            <h2 className="text-lg font-semibold mb-2">개별 효과</h2>

                            {ALL_SLOT_ORDER.map((slotId) => {
                                const value = selectedSlots[slotId];
                                if (!value) return null;

                                const def = getSlotDef(slotId);
                                const label = def?.label || slotId;
                                const thumbSrc = getThumbnailSrc(value as Item | Weapon);

                                return (
                                    <div key={slotId}>
                                        <div className="flex items-start gap-2">
                                            <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {thumbSrc ? (
                                                    <img
                                                        src={thumbSrc}
                                                        alt={value.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-[9px] text-slate-400 text-center px-1 line-clamp-2">
                                                        이미지 없음
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-amber-300">
                                                    {label}: {value.name}
                                                </h3>
                                                <p className="whitespace-pre-wrap text-slate-200 text-xs mt-1">
                                                    {value.effect}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {!Object.values(selectedSlots).some(Boolean) && (
                                <p className="text-slate-400 text-sm">
                                    아직 선택된 장비가 없습니다. 왼쪽에서 장비를 선택하면 이곳에 각 장비의 효과가 개별로 표시됩니다.
                                </p>
                            )}

                            {activeSetEffects.length > 0 && (
                                <div className="pt-3 mt-2 border-t border-slate-700 space-y-2">
                                    <h3 className="font-semibold text-indigo-300 text-sm">
                                        세트 효과
                                    </h3>
                                    {activeSetEffects.map((set) => (
                                        <div key={set.name} className="text-xs text-slate-200 whitespace-pre-wrap">
                                            <div className="font-semibold text-amber-300 mb-1">
                                                {set.name} ({set.count}세트 착용)
                                            </div>
                                            {set.three && (
                                                <div className="mb-1">
                                                    <div className="text-[11px] text-slate-400">
                                                        [3세트 효과]
                                                    </div>
                                                    <p className="mt-0.5">{set.three}</p>
                                                </div>
                                            )}
                                            {set.five && (
                                                <div>
                                                    <div className="text-[11px] text-slate-400">
                                                        [5세트 효과]
                                                    </div>
                                                    <p className="mt-0.5">{set.five}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
