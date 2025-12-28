import { useEffect, useMemo, useRef, useState } from "react";

type EquipmentDataBundle = {
  characters: Character[];
  items: Item[];
  weapons: Weapon[];
};

let equipmentDataCache: EquipmentDataBundle | null = null;
let equipmentDataPromise: Promise<EquipmentDataBundle> | null = null;

async function loadEquipmentData(): Promise<EquipmentDataBundle> {
  if (equipmentDataCache) return equipmentDataCache;
  if (equipmentDataPromise) return equipmentDataPromise;

  equipmentDataPromise = (async () => {
    const [characterRes, itemRes, weaponRes] = await Promise.all([
      fetch("/data/character.json"),
      fetch("/data/item.json"),
      fetch("/data/weapon.json"),
    ]);

    if (!characterRes.ok) throw new Error(`character.json 로딩 실패 (${characterRes.status})`);
    if (!itemRes.ok) throw new Error(`item.json 로딩 실패 (${itemRes.status})`);
    if (!weaponRes.ok) throw new Error(`weapon.json 로딩 실패 (${weaponRes.status})`);

    const characterData = (await characterRes.json()) as unknown;
    const rawItemData = (await itemRes.json()) as unknown;
    const weaponData = (await weaponRes.json()) as unknown;

    const nextCharacters = Array.isArray(characterData) ? (characterData as Character[]) : [];
    const nextRawItems = Array.isArray(rawItemData) ? (rawItemData as RawItem[]) : [];
    const nextWeapons = Array.isArray(weaponData) ? (weaponData as Weapon[]) : [];

    const bundle: EquipmentDataBundle = {
      characters: nextCharacters.filter((c) => typeof c?.job === "string" && c.job),
      items: deriveItemsWithParts(nextRawItems).filter((i) => typeof i?.name === "string" && i.name),
      weapons: nextWeapons.filter((w) => typeof w?.name === "string" && w.name),
    };

    equipmentDataCache = bundle;
    return bundle;
  })();

  try {
    return await equipmentDataPromise;
  } finally {
    // keep the cache, but allow retry on failure
    equipmentDataPromise = null;
  }
}

export function preloadEquipmentPickerData() {
  void loadEquipmentData().catch(() => {
    // ignore; UI will surface error when mounted
  });
}

type Character = {
  job: string;
  image: string;
  group: string;
};

type ItemType = "방어구" | "악세사리" | "특수장비";

type Part =
  | "머리어깨"
  | "상의"
  | "바지"
  | "벨트"
  | "신발"
  | "팔찌"
  | "목걸이"
  | "반지"
  | "귀걸이"
  | "보조장비"
  | "마법석";

type RawItem = {
  name: string;
  type: ItemType;
  effect: string;
  set_id: string;
  set_effect: string;
  image: string;
};

type Item = RawItem & {
  part: Part;
};

type Weapon = {
  name: string;
  type: string;
  available: string;
  basic_info: string;
  effect: string;
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
  part: Part | null;
};

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

function getSlotDef(id: SlotId): SlotDef | null {
  return (
    ARMOR_SLOTS.find((s) => s.id === id) ||
    ACCESSORY_SLOTS.find((s) => s.id === id) ||
    SPECIAL_SLOTS.find((s) => s.id === id) ||
    (id === "weapon" ? { id: "weapon", label: "무기", part: null } : null)
  );
}

const EXPECTED_PARTS_BY_ITEM_TYPE: Record<ItemType, Part[]> = {
  방어구: ["머리어깨", "상의", "바지", "벨트", "신발"],
  악세사리: ["팔찌", "목걸이", "반지"],
  특수장비: ["귀걸이", "보조장비", "마법석"],
};

const PART_KEYWORDS: Record<Part, string[]> = {
  머리어깨: [
    "머리어깨",
    "헤드기어",
    "고글",
    "헬름",
    "헬멧",
    "햇",
    "모자",
    "캡",
    "마스크",
    "두건",
    "후드",
    "머리",
    "뿔",
    "장식",
  ],
  상의: ["상의", "자켓", "자킷", "재킷", "코트", "아머", "메일", "플레이트 메일"],
  바지: ["하의", "바지", "반바지", "팬츠", "스커트", "레깅스", "각반"],
  벨트: ["벨트", "허리", "코일"],
  신발: ["신발", "부츠", "슈즈", "사바톤", "그리브"],
  팔찌: ["팔찌", "브레이슬릿"],
  목걸이: ["목걸이", "네크리스", "펜던트"],
  반지: ["반지", "링"],
  귀걸이: ["귀걸이", "이어링"],
  보조장비: ["보조장비"],
  마법석: ["마법석"],
};

function scorePart(name: string, part: Part): number {
  const n = (name || "").toLowerCase();
  let score = 0;

  if (n.includes(part)) score += 10;

  for (const kw of PART_KEYWORDS[part]) {
    const k = kw.toLowerCase();
    if (k && n.includes(k)) score += 3;
  }

  return score;
}

function assignPartsForGroup(group: RawItem[]): Item[] {
  if (!group.length) return [];

  const itemType = group[0].type;
  const expectedParts = EXPECTED_PARTS_BY_ITEM_TYPE[itemType];
  if (!expectedParts || expectedParts.length !== group.length) {
    return group.map((it) => ({ ...it, part: "상의" } as Item));
  }

  const scores = group.map((it) => expectedParts.map((p) => scorePart(it.name, p)));

  const order = [...group.keys()].sort((a, b) => {
    const aMax = Math.max(...scores[a]);
    const bMax = Math.max(...scores[b]);
    return bMax - aMax;
  });

  let bestTotal = -Infinity;
  let bestAssign: number[] | null = null;

  const used = new Array(expectedParts.length).fill(false);
  const cur: number[] = new Array(group.length).fill(-1);

  const dfs = (i: number, total: number) => {
    if (i === order.length) {
      if (total > bestTotal) {
        bestTotal = total;
        bestAssign = [...cur];
      }
      return;
    }

    const itemIdx = order[i];

    const partIndices = [...expectedParts.keys()].sort(
      (a, b) => scores[itemIdx][b] - scores[itemIdx][a]
    );

    for (const partIdx of partIndices) {
      if (used[partIdx]) continue;
      used[partIdx] = true;
      cur[itemIdx] = partIdx;
      dfs(i + 1, total + scores[itemIdx][partIdx]);
      used[partIdx] = false;
      cur[itemIdx] = -1;
    }
  };

  dfs(0, 0);

  const finalAssign = bestAssign ?? group.map((_, idx) => idx);

  return group.map((it, idx) => ({
    ...it,
    part: expectedParts[finalAssign[idx]] ?? expectedParts[0],
  }));
}

function deriveItemsWithParts(rawItems: RawItem[]): Item[] {
  const groups: Record<string, RawItem[]> = {};
  for (const it of rawItems) {
    const key = `${it.type}::${it.set_id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(it);
  }

  const derived: Item[] = [];
  Object.values(groups).forEach((group) => {
    derived.push(...assignPartsForGroup(group));
  });

  return derived;
}

function getThumbnailSrc(value: Item | Weapon): string | null {
  if ("basic_info" in value) {
    return value.image ? `/images/weapon/weapon_${value.image}.png` : null;
  }
  const item = value as Item;
  return item.image ? `/images/item/item_${item.image}.png` : null;
}

function arraysEqual(a: string[], b: string[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export type EquipmentPickerProps = {
  job: string;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export default function EquipmentPicker({ job, value, onChange, disabled }: EquipmentPickerProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeSlot, setActiveSlot] = useState<SlotId | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Partial<Record<SlotId, Item | Weapon>>>({});
  const [unassignedNames, setUnassignedNames] = useState<string[]>([]);
  const [hydratedFromValue, setHydratedFromValue] = useState(false);

  const ignoreNextEmitRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const bundle = await loadEquipmentData();
        if (cancelled) return;
        setCharacters(bundle.characters);
        setItems(bundle.items);
        setWeapons(bundle.weapons);
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setError("아이템 데이터를 불러오지 못했습니다. 콘솔을 확인해주세요.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCharacter = useMemo(() => {
    if (!job) return null;
    return characters.find((c) => c.job === job) || null;
  }, [characters, job]);

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

  const slotIdForPart = (part: Part): SlotId | null => {
    switch (part) {
      case "머리어깨":
        return "headShoulder";
      case "상의":
        return "top";
      case "바지":
        return "bottom";
      case "벨트":
        return "belt";
      case "신발":
        return "shoes";
      case "팔찌":
        return "bracelet";
      case "목걸이":
        return "necklace";
      case "반지":
        return "ring";
      case "귀걸이":
        return "earring";
      case "보조장비":
        return "support";
      case "마법석":
        return "magicStone";
      default:
        return null;
    }
  };

  // Sync external value -> selectedSlots (best-effort)
  useEffect(() => {
    if (!items.length && !weapons.length) return;

    const normalizedValue = value
      .map((n) => (typeof n === "string" ? n.trim() : ""))
      .filter((n) => n.length > 0);

    const next: Partial<Record<SlotId, Item | Weapon>> = {};
    const used = new Set<string>();
    const leftovers: string[] = [];

    for (const name of normalizedValue) {
      if (used.has(name)) continue;

      // weapon
      const weapon = filteredWeapons.find((w) => w.name === name) ?? weapons.find((w) => w.name === name) ?? null;
      if (weapon) {
        if (!next.weapon) {
          next.weapon = weapon;
          used.add(name);
        } else {
          leftovers.push(name);
        }
        continue;
      }

      // item (map by name -> derived part -> slot)
      const item = items.find((i) => i.name === name) ?? null;
      if (!item) {
        leftovers.push(name);
        continue;
      }

      const slotId = slotIdForPart(item.part);
      if (!slotId) {
        leftovers.push(name);
        continue;
      }

      if (!next[slotId]) {
        next[slotId] = item;
        used.add(name);
      } else {
        leftovers.push(name);
      }
    }

    ignoreNextEmitRef.current = true;
    setSelectedSlots(next);
    setUnassignedNames(leftovers);
    setHydratedFromValue(true);

    // keep activeSlot valid
    if (activeSlot && !getSlotDef(activeSlot)) {
      setActiveSlot(null);
    }
  }, [value, items, weapons, filteredWeapons]);

  // Emit selectedSlots -> onChange (names)
  useEffect(() => {
    // Important: before we've hydrated from the external value, emitting would
    // incorrectly overwrite parent state with an empty array (causing "click twice" symptoms).
    if (!hydratedFromValue) return;
    if (ignoreNextEmitRef.current) {
      ignoreNextEmitRef.current = false;
      return;
    }

    const names: string[] = [];
    for (const slotId of ALL_SLOT_ORDER) {
      const v = selectedSlots[slotId];
      if (!v) continue;
      if (typeof v.name === "string" && v.name.trim()) names.push(v.name.trim());
    }

    // Preserve names that couldn't be mapped into slots so we don't accidentally drop saved items.
    const next = [...names, ...unassignedNames];

    if (!arraysEqual(value, next)) {
      onChange(next);
    }
  }, [selectedSlots, onChange, value, unassignedNames, hydratedFromValue]);

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

  const handleClearSlot = (slotId: SlotId) => {
    setSelectedSlots((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  const handleSelectItem = (slotId: SlotId, v: Item | Weapon) => {
    setSelectedSlots((prev) => ({
      ...prev,
      [slotId]: v,
    }));
  };

  const renderSlotButton = (def: SlotDef) => {
    const selected = selectedSlots[def.id];
    const isWeapon = def.id === "weapon";

    let title = def.label;
    let sub = "";

    if (selected) {
      if (isWeapon) {
        const w = selected as Weapon;
        title = w.name;
        sub = w.type;
      } else {
        const item = selected as Item;
        title = item.name;
        sub = item.set_id || "";
      }
    }

    const isActive = activeSlot === def.id;
    const thumbSrc = selected ? getThumbnailSrc(selected as Item | Weapon) : null;
    const onlyImage = !!selected && !!thumbSrc;
    const thumbBoxClass = onlyImage ? "w-14 h-14" : "w-10 h-10";

    return (
      <button
        key={def.id}
        type="button"
        disabled={disabled}
        onClick={() => setActiveSlot(def.id)}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (disabled) return;
          handleClearSlot(def.id);
        }}
        className={`flex flex-col items-center justify-center rounded border px-2 py-2 text-xs min-h-[70px] transition-colors ${
          isActive
            ? "border-indigo-400 bg-slate-800"
            : "border-slate-700 bg-slate-900 hover:border-indigo-400 hover:bg-slate-800"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <div
          className={`${thumbBoxClass} rounded bg-slate-800 flex items-center justify-center overflow-hidden mb-1`}
        >
          {thumbSrc ? (
            <img src={thumbSrc} alt={title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[9px] text-slate-500">{def.label}</span>
          )}
        </div>
        {!onlyImage && (
          <>
            <div className="font-semibold text-center truncate w-full">{title || def.label}</div>
            {sub ? (
              <div className="text-[10px] text-slate-400 text-center truncate w-full mt-0.5">{sub}</div>
            ) : null}
          </>
        )}
      </button>
    );
  };

  if (loading && !items.length && !weapons.length) {
    return <div className="text-xs text-slate-300">불러오는 중...</div>;
  }

  if (error) {
    return <div className="text-xs text-red-300">{error}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        <div className="grid grid-cols-5 gap-2">{ARMOR_SLOTS.map((def) => renderSlotButton(def))}</div>
        <div className="grid grid-cols-5 gap-2">
          {ACCESSORY_SLOTS.map((def) => renderSlotButton(def))}
          <div />
          <div />
        </div>
        <div className="grid grid-cols-5 gap-2">
          {SPECIAL_SLOTS.map((def) => renderSlotButton(def))}
          <div />
          {renderSlotButton({ id: "weapon", label: "무기", part: null })}
        </div>
      </div>

      {activeSlot ? (
        <div className="rounded-lg bg-slate-900/70 border border-slate-700 p-3 space-y-2 text-sm min-h-[180px]">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">아이템 선택</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">현재 선택된 슬롯: {getSlotDef(activeSlot)?.label}</span>
              <button
                type="button"
                onClick={() => setActiveSlot(null)}
                disabled={disabled}
                className="rounded border border-slate-700 bg-slate-950/40 px-2 py-1 text-xs text-slate-200 hover:border-indigo-400 disabled:opacity-60"
              >
                닫기
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400">{selectionTitle}</p>
          {selectionDescription && <p className="text-[11px] text-slate-500">{selectionDescription}</p>}

          {selectionItems.length > 0 ? (
            <div className="mt-2 max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectionItems.map((v) => {
                const isWeapon = "basic_info" in v;
                const key = isWeapon
                  ? `weapon-${v.name}`
                  : `item-${(v as Item).part}-${(v as Item).set_id}-${v.name}`;
                const thumbSrc = getThumbnailSrc(v as Item | Weapon);

                const selectedForActive = selectedSlots[activeSlot];
                const isSelected = !!selectedForActive && selectedForActive.name === v.name;

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelectItem(activeSlot, v)}
                    className={`text-left rounded border bg-slate-900 px-2 py-2 text-xs transition-colors h-24 overflow-hidden ${
                      isSelected
                        ? "border-indigo-400 bg-slate-800"
                        : "border-slate-700 hover:border-indigo-400 hover:bg-slate-800"
                    } ${disabled ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {thumbSrc ? (
                          <img src={thumbSrc} alt={v.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] text-slate-400 text-center px-1 line-clamp-2">이미지 없음</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{v.name || "이름 없음"}</div>
                        {"set_id" in v && (v as Item).set_id && (
                          <div className="text-[11px] text-amber-300 truncate">{(v as Item).set_id}</div>
                        )}
                        <div className="mt-1 text-[11px] text-slate-300 whitespace-pre-wrap line-clamp-3">{v.effect}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 text-xs text-slate-500">해당 슬롯에 장비 가능한 아이템이 없습니다.</div>
          )}
        </div>
      ) : null}

      {unassignedNames.length > 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-300">
          <div className="font-semibold text-slate-200">미지정 아이템</div>
          <div className="mt-1 text-[11px] text-slate-400">
            슬롯에 자동 매칭하지 못한 항목입니다. (이름 불일치/중복/부위 추론 실패 등)
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {unassignedNames.map((n, idx) => (
              <span
                key={`${n}-${idx}`}
                className="rounded-full border border-slate-700 bg-slate-950/40 px-2 py-1 text-[11px] text-slate-200"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
