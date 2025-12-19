import { useEffect, useMemo, useState } from "react";

type Character = {
    job: string;
    image: string;
    group: string;
};

type EquipmentSet = {
    name: string;
    prefix: string;
    set_effect: string;
    type: string;
    image: string;
};

type Weapon = {
    name: string;
    type: string;
    available: string;
    basic_info: string;
    effect: string;
    image: string;
};

export default function SetEffectSimulator() {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [armorSets, setArmorSets] = useState<EquipmentSet[]>([]);
    const [accessorySets, setAccessorySets] = useState<EquipmentSet[]>([]);
    const [specialSets, setSpecialSets] = useState<EquipmentSet[]>([]);
    const [weapons, setWeapons] = useState<Weapon[]>([]);

    const [selectedJob, setSelectedJob] = useState<string>("");
    const [selectedArmor, setSelectedArmor] = useState<string>("");
    const [selectedAccessory, setSelectedAccessory] = useState<string>("");
    const [selectedSpecial, setSelectedSpecial] = useState<string>("");
    const [selectedWeapon, setSelectedWeapon] = useState<string>("");

    const [topUnique, setTopUnique] = useState<string>("");
    const [braceletUnique, setBraceletUnique] = useState<string>("");
    const [earringUnique, setEarringUnique] = useState<string>("");

    useEffect(() => {
        async function loadData() {
            try {
                const [characterRes, setRes, weaponRes] = await Promise.all([
                    fetch("/data/character.json"),
                    fetch("/data/set.json"),
                    fetch("/data/weapon.json"),
                ]);

                const characterData: Character[] = await characterRes.json();
                const setData: EquipmentSet[] = await setRes.json();
                const weaponData: Weapon[] = await weaponRes.json();

                setCharacters(characterData.filter((c) => c.job));

                setArmorSets(
                    setData.filter((s) => s.type === "방어구" && s.name)
                );
                setAccessorySets(
                    setData.filter((s) => s.type === "악세사리" && s.name)
                );
                setSpecialSets(
                    setData.filter((s) => s.type === "특수장비" && s.name)
                );

                setWeapons(weaponData.filter((w) => w.name));
            } catch (e) {
                console.error("세트 효과 데이터 로딩 실패", e);
            }
        }

        loadData();
    }, []);

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

    const armor = armorSets.find((s) => s.name === selectedArmor && (s.prefix || "") === "");
    const accessory = accessorySets.find(
        (s) => s.name === selectedAccessory && (s.prefix || "") === ""
    );
    const special = specialSets.find(
        (s) => s.name === selectedSpecial && (s.prefix || "") === ""
    );
    const weapon = filteredWeapons.find((w) => w.name === selectedWeapon);

    const combinedEffects = useMemo(() => {
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

                // 요약에서는 [3] 세트효과, [5] 세트효과 같은 제목 라인은 숨김
                if (/^\[\d+]\s*세트효과/.test(line)) {
                    continue;
                }

                // 패턴 1: "항마력 +8000", "공격속도 +10%" 형식
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

        // 방어구 / 악세 / 특수 / 무기 / 고유효과를 전부 한 번에 처리
        if (armor?.set_effect) processText(armor.set_effect);
        if (accessory?.set_effect) processText(accessory.set_effect);
        if (special?.set_effect) processText(special.set_effect);
        if (weapon?.effect) processText(weapon.effect);
        if (topUnique) processText(topUnique);
        if (braceletUnique) processText(braceletUnique);
        if (earringUnique) processText(earringUnique);

        const aggregatedLines = Object.entries(aggregated).map(([rawKey, stat]) => {
            const key = rawKey.replace(/\(\%\)$/, "");
            const formatted = stat.value.toLocaleString("ko-KR");
            return `${key} +${formatted}${stat.isPercent ? "%" : ""}`;
        });

        return [...aggregatedLines, aggregatedLines.length && others.length ? "" : "", ...others].join("\n");
    }, [armor, accessory, special, weapon, topUnique, braceletUnique, earringUnique]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
            <div className="max-w-6xl mx-auto px-4 py-10">
                <h1 className="text-3xl font-bold mb-6">세트 효과 시뮬레이터</h1>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <div>
                            <label className="block mb-1 text-sm font-semibold">
                                직업을 선택하세요
                            </label>
                            <select
                                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
                                value={selectedJob}
                                onChange={(e) => {
                                    setSelectedJob(e.target.value);
                                    setSelectedWeapon("");
                                }}
                            >
                                <option value="">선택</option>
                                {characters.map((c) => (
                                    <option key={c.job} value={c.job}>
                                        {c.group} - {c.job}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-semibold">
                                방어구 세트를 선택하세요
                            </label>
                            <select
                                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
                                value={selectedArmor}
                                onChange={(e) => setSelectedArmor(e.target.value)}
                            >
                                <option value="">선택</option>
                                {[...new Set(armorSets.map((s) => s.name))]
                                    .filter(Boolean)
                                    .map((name) => (
                                        <option key={name} value={name}>
                                            {name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-semibold">
                                상의 고유효과를 입력하세요
                            </label>
                            <textarea
                                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm min-h-[60px]"
                                placeholder="예) 상의 고유옵션 내용을 적어주세요"
                                value={topUnique}
                                onChange={(e) => setTopUnique(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-semibold">
                                악세사리 세트를 선택하세요
                            </label>
                            <select
                                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
                                value={selectedAccessory}
                                onChange={(e) => setSelectedAccessory(e.target.value)}
                            >
                                <option value="">선택</option>
                                {[...new Set(accessorySets.map((s) => s.name))]
                                    .filter(Boolean)
                                    .map((name) => (
                                        <option key={name} value={name}>
                                            {name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-semibold">
                                팔찌 고유효과를 입력하세요
                            </label>
                            <textarea
                                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm min-h-[60px]"
                                placeholder="예) 팔찌 고유옵션 내용을 적어주세요"
                                value={braceletUnique}
                                onChange={(e) => setBraceletUnique(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-semibold">
                                특수장비 세트를 선택하세요
                            </label>
                            <select
                                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
                                value={selectedSpecial}
                                onChange={(e) => setSelectedSpecial(e.target.value)}
                            >
                                <option value="">선택</option>
                                {[...new Set(specialSets.map((s) => s.name))]
                                    .filter(Boolean)
                                    .map((name) => (
                                        <option key={name} value={name}>
                                            {name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-semibold">
                                귀걸이 고유효과를 입력하세요
                            </label>
                            <textarea
                                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm min-h-[60px]"
                                placeholder="예) 귀걸이 고유옵션 내용을 적어주세요"
                                value={earringUnique}
                                onChange={(e) => setEarringUnique(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-semibold">
                                무기를 선택하세요
                            </label>
                            <select
                                className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
                                value={selectedWeapon}
                                onChange={(e) => setSelectedWeapon(e.target.value)}
                            >
                                <option value="">선택</option>
                                {filteredWeapons.map((w) => (
                                    <option key={w.name} value={w.name}>
                                        {w.type} - {w.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-lg bg-slate-900/70 p-4 border border-slate-700 min-h-[160px] whitespace-pre-wrap text-sm">
                            <h2 className="text-lg font-semibold mb-2">효과 (요약)</h2>
                            {combinedEffects ? (
                                <p>{combinedEffects}</p>
                            ) : (
                                <p className="text-slate-400">
                                    왼쪽에서 직업, 세트, 고유효과, 무기를 선택하면 여기에서
                                    전체 효과가 한 번에 표시됩니다.
                                </p>
                            )}
                        </div>

                        <div className="rounded-lg bg-slate-900/70 p-4 border border-slate-700 text-sm space-y-3">
                            <h2 className="text-lg font-semibold mb-2">개별 효과</h2>

                            {armor && (
                                <div>
                                    <h3 className="font-semibold text-amber-300">
                                        방어구 세트: {armor.name}
                                    </h3>
                                    <p className="whitespace-pre-wrap text-slate-200">
                                        {armor.set_effect}
                                    </p>
                                </div>
                            )}

                            {accessory && (
                                <div>
                                    <h3 className="font-semibold text-amber-300">
                                        악세사리 세트: {accessory.name}
                                    </h3>
                                    <p className="whitespace-pre-wrap text-slate-200">
                                        {accessory.set_effect}
                                    </p>
                                </div>
                            )}

                            {special && (
                                <div>
                                    <h3 className="font-semibold text-amber-300">
                                        특수장비 세트: {special.name}
                                    </h3>
                                    <p className="whitespace-pre-wrap text-slate-200">
                                        {special.set_effect}
                                    </p>
                                </div>
                            )}

                            {weapon && (
                                <div>
                                    <h3 className="font-semibold text-sky-300">
                                        무기: {weapon.name}
                                    </h3>
                                    <p className="whitespace-pre-wrap text-slate-200">
                                        {weapon.effect}
                                    </p>
                                </div>
                            )}

                            {topUnique && (
                                <div>
                                    <h3 className="font-semibold text-emerald-300">
                                        상의 고유효과
                                    </h3>
                                    <p className="whitespace-pre-wrap text-slate-200">
                                        {topUnique}
                                    </p>
                                </div>
                            )}

                            {braceletUnique && (
                                <div>
                                    <h3 className="font-semibold text-emerald-300">
                                        팔찌 고유효과
                                    </h3>
                                    <p className="whitespace-pre-wrap text-slate-200">
                                        {braceletUnique}
                                    </p>
                                </div>
                            )}

                            {earringUnique && (
                                <div>
                                    <h3 className="font-semibold text-emerald-300">
                                        귀걸이 고유효과
                                    </h3>
                                    <p className="whitespace-pre-wrap text-slate-200">
                                        {earringUnique}
                                    </p>
                                </div>
                            )}

                            {!armor &&
                                !accessory &&
                                !special &&
                                !weapon &&
                                !topUnique &&
                                !braceletUnique &&
                                !earringUnique && (
                                    <p className="text-slate-400">
                                        선택된 세트나 고유효과가 없습니다. 좌측에서 선택하면
                                        여기에서 각각 따로 볼 수 있습니다.
                                    </p>
                                )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
