import { useEffect, useState } from "react";

interface Character {
    job: string;
    image: string;
    group: string;
}

interface Skill {
    name: string;
    level_requried: string;
    min_level_damage: string;
    increment: string;
    cooltime: string;
    job: string;
}

interface SkillConfig {
    levelUp: number; // 추가 레벨 수 (1레벨 기준에서 얼마나 더 올렸는지)
    enhance: number; // 강화 횟수
}

interface StatInputs {
    attack: number; // 물리/마법 공격력 (%)
    damageIncrease: number; // 데미지 증가 (%)
    extraDamageOnHit: number; // 공격 시 추가 데미지 (%)
    critDamage: number; // 물리/마법 크리티컬 데미지 (%)
    skillAttackIncrease: number; // 스킬 공격력 증가 (%)
    allTypeDamage: number; // 모든 타입 피해 증가 (%)
    elementEnhance: number; // 최고 속성 강화 (수치)
}

function toFactor(percent: number): number {
    return 1 + percent / 100;
}

function calcSkillDamage(skill: Skill, config: SkillConfig): number {
    const base = parseFloat(skill.min_level_damage);
    const inc = parseFloat(skill.increment);

    const levelUp = Math.max(0, config.levelUp || 0);
    const enhance = Math.max(0, config.enhance || 0);

    let damageAtLevel = base + inc * (levelUp - 1);
    if(levelUp == 0) damageAtLevel = 0;

    let enhanceMultiplier = 1;
    if (enhance > 0) {
        // 첫 강화 +8%, 이후 강화마다 +3% (선형 적용)
        enhanceMultiplier = 1 + 0.08 + 0.03 * (enhance - 1);
    }

    return damageAtLevel * enhanceMultiplier;
}

function calcFinalDamage(skillDamage: number, stats: StatInputs): number {
    if (!skillDamage) return 0;

    const attackMul = stats.attack;
    const dmgIncMul = toFactor(stats.damageIncrease);
    const extraDmgMul = toFactor(stats.extraDamageOnHit);
    const skillAtkMul = toFactor(stats.skillAttackIncrease);
    const allTypeMul = toFactor(stats.allTypeDamage);

    const critMul = 1.5 + (stats.critDamage || 0) / 100;
    const elementMul = 1.05 + (stats.elementEnhance || 0) / 220;

    const ret = 
        attackMul *
        (skillDamage / 100) *
        dmgIncMul *
        extraDmgMul *
        critMul *
        skillAtkMul *
        allTypeMul *
        elementMul *
        1.375
        *0.384
        ;

    console.log(ret)
    return ret;    
}

export default function DamageSimulator() {
    const [characters, setCharacters] = useState<Character[] | null>(null);
    const [skills, setSkills] = useState<Skill[] | null>(null);
    const [selectedJob, setSelectedJob] = useState<string>("");

    const [statInputs, setStatInputs] = useState<StatInputs>({
        attack: 0,
        damageIncrease: 0,
        extraDamageOnHit: 0,
        critDamage: 0,
        skillAttackIncrease: 0,
        allTypeDamage: 0,
        elementEnhance: 0,
    });

    const [skillConfigs, setSkillConfigs] = useState<Record<string, SkillConfig>>({});

    const [rankMode, setRankMode] = useState<"damage" | "perCool">("damage");

    useEffect(() => {
        async function load() {
            const [characterRes, skillRes] = await Promise.all([
                fetch("/data/character.json"),
                fetch("/data/skill.json"),
            ]);

            const characterJson = await characterRes.json();
            const skillJson = await skillRes.json();

            setCharacters(characterJson);
            setSkills(skillJson);
        }

        load();
    }, []);

    // 가능한 직업 목록 구성
    const allJobs: string[] = [];
    if (characters) {
        characters.forEach((c) => {
            if (!allJobs.includes(c.job)) allJobs.push(c.job);
        });
    }
    if (skills) {
        skills.forEach((s) => {
            if (!allJobs.includes(s.job)) allJobs.push(s.job);
        });
    }

    useEffect(() => {
        if (!selectedJob && allJobs.length > 0) {
            setSelectedJob(allJobs[0]);
        }
    }, [selectedJob, allJobs]);

    if (!characters || !skills) {
        return <p>loading...</p>;
    }

    const jobSkills = skills.filter((s) => s.job === selectedJob);

    const totalFinalDamage = jobSkills.reduce((sum, skill) => {
        const config: SkillConfig = skillConfigs[skill.name] ?? {
            levelUp: 0,
            enhance: 0,
        };
        const skillDamage = calcSkillDamage(skill, config);
        const finalDamage = calcFinalDamage(skillDamage, statInputs);
        return sum + finalDamage;
    }, 0);

    const rankedSkills = jobSkills
        .map((skill) => {
            const config: SkillConfig = skillConfigs[skill.name] ?? {
                levelUp: 0,
                enhance: 0,
            };
            const skillDamage = calcSkillDamage(skill, config);
            const finalDamage = calcFinalDamage(skillDamage, statInputs);
            const cool = parseFloat(skill.cooltime) || 0;
            const damagePerCool = cool > 0 ? finalDamage / cool : 0;
            return { skill, skillDamage, finalDamage, damagePerCool };
        })
        .filter((item) => item.finalDamage > 0)
        .sort((a, b) =>
            rankMode === "damage"
                ? b.finalDamage - a.finalDamage
                : b.damagePerCool - a.damagePerCool
        );

    const handleStatChange = (field: keyof StatInputs, value: string) => {
        setStatInputs((prev) => ({
            ...prev,
            [field]: value === "" ? 0 : Number(value),
        }));
    };

    const handleSkillConfigChange = (
        skillName: string,
        field: keyof SkillConfig,
        value: string
    ) => {
        setSkillConfigs((prev) => ({
            ...prev,
            [skillName]: {
                levelUp: prev[skillName]?.levelUp ?? 0,
                enhance: prev[skillName]?.enhance ?? 0,
                [field]: value === "" ? 0 : Number(value),
            },
        }));
    };

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">데미지 시뮬레이터</h1>

            {/* 직업 선택 */}
            <section className="space-y-2">
                <h2 className="text-lg font-semibold">1. 직업 선택</h2>
                <select
                    className="border rounded px-2 py-1"
                    value={selectedJob}
                    onChange={(e) => setSelectedJob(e.target.value)}
                >
                    {allJobs.map((job) => (
                        <option key={job} value={job}>
                            {job}
                        </option>
                    ))}
                </select>
            </section>

            {/* 스탯 입력 */}
            <section className="space-y-2">
                <h2 className="text-lg font-semibold">2. 스탯 입력</h2>
                <p className="text-sm text-gray-600">
                    모든 % 수치는 "퍼센트" 기준으로 입력해주세요. 예) 92% → 92
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1 text-sm">
                        <span>물리/마법 공격력 (%)</span>
                        <input
                            type="number"
                            className="border rounded px-2 py-1"
                            value={statInputs.attack || ""}
                            onChange={(e) => handleStatChange("attack", e.target.value)}
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span>데미지 증가 (%)</span>
                        <input
                            type="number"
                            className="border rounded px-2 py-1"
                            value={statInputs.damageIncrease || ""}
                            onChange={(e) =>
                                handleStatChange("damageIncrease", e.target.value)
                            }
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span>공격 시 추가 데미지 (%)</span>
                        <input
                            type="number"
                            className="border rounded px-2 py-1"
                            value={statInputs.extraDamageOnHit || ""}
                            onChange={(e) =>
                                handleStatChange("extraDamageOnHit", e.target.value)
                            }
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span>물리/마법 크리티컬 데미지 (%)</span>
                        <input
                            type="number"
                            className="border rounded px-2 py-1"
                            value={statInputs.critDamage || ""}
                            onChange={(e) =>
                                handleStatChange("critDamage", e.target.value)
                            }
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span>스킬 공격력 증가 (%)</span>
                        <input
                            type="number"
                            className="border rounded px-2 py-1"
                            value={statInputs.skillAttackIncrease || ""}
                            onChange={(e) =>
                                handleStatChange("skillAttackIncrease", e.target.value)
                            }
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span>모든 타입 피해 증가 (%)</span>
                        <input
                            type="number"
                            className="border rounded px-2 py-1"
                            value={statInputs.allTypeDamage || ""}
                            onChange={(e) =>
                                handleStatChange("allTypeDamage", e.target.value)
                            }
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span>최고 속성 강화 (수치)</span>
                        <input
                            type="number"
                            className="border rounded px-2 py-1"
                            value={statInputs.elementEnhance || ""}
                            onChange={(e) =>
                                handleStatChange("elementEnhance", e.target.value)
                            }
                        />
                    </label>
                </div>
            </section>

            {/* 스킬 목록 및 레벨/강화 설정 */}
            <section className="space-y-2">
                <h2 className="text-lg font-semibold">3. 스킬 레벨/강화 설정 및 최종 데미지</h2>
                {jobSkills.length === 0 ? (
                    <p>선택한 직업의 스킬 데이터가 없습니다.</p>
                ) : (
                    <div className="space-y-2">
                        <div className="text-right font-semibold">
                            전체 스킬 최종 데미지 합계: {" "}
                            {totalFinalDamage > 0
                                ? totalFinalDamage.toLocaleString(undefined, {
                                      maximumFractionDigits: 2,
                                  })
                                : "-"}
                        </div>
                        <div className="overflow-x-auto">
                        <table className="min-w-full border text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="border px-2 py-1">스킬명</th>
                                    <th className="border px-2 py-1">요구 레벨</th>
                                    <th className="border px-2 py-1 text-blue-600">
                                        추가 레벨 수
                                    </th>
                                    <th className="border px-2 py-1 text-red-600">
                                        강화 횟수
                                    </th>
                                    <th className="border px-2 py-1">스킬 데미지</th>
                                    <th className="border px-2 py-1">최종 데미지</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobSkills.map((skill) => {
                                    const config: SkillConfig =
                                        skillConfigs[skill.name] ?? {
                                            levelUp: 0,
                                            enhance: 0,
                                        };
                                    const skillDamage = calcSkillDamage(
                                        skill,
                                        config
                                    );
                                    const finalDamage = calcFinalDamage(
                                        skillDamage,
                                        statInputs
                                    );

                                    return (
                                        <tr key={skill.name}>
                                            <td className="border px-2 py-1 whitespace-nowrap">
                                                {skill.name}
                                            </td>
                                            <td className="border px-2 py-1 text-center">
                                                {skill.level_requried}
                                            </td>
                                            <td className="border px-2 py-1 text-center">
                                                <input
                                                    type="number"
                                                    className="w-20 border rounded px-1 py-0.5 text-blue-600"
                                                    min={0}
                                                    value={config.levelUp}
                                                    onChange={(e) =>
                                                        handleSkillConfigChange(
                                                            skill.name,
                                                            "levelUp",
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </td>
                                            <td className="border px-2 py-1 text-center">
                                                <input
                                                    type="number"
                                                    className="w-20 border rounded px-1 py-0.5 text-red-600"
                                                    min={0}
                                                    value={config.enhance}
                                                    onChange={(e) =>
                                                        handleSkillConfigChange(
                                                            skill.name,
                                                            "enhance",
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </td>
                                            <td className="border px-2 py-1 text-right">
                                                {skillDamage.toLocaleString(undefined, {
                                                    maximumFractionDigits: 2,
                                                })}
                                            </td>
                                            <td className="border px-2 py-1 text-right">
                                                {finalDamage > 0
                                                    ? finalDamage.toLocaleString(
                                                          undefined,
                                                          {
                                                              maximumFractionDigits:
                                                                  2,
                                                          }
                                                      )
                                                    : "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>
                    </div>
                )}
            </section>

            {/* 스킬 딜 순위표 */}
            {rankedSkills.length > 0 && (
                <section className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-lg font-semibold">4. 스킬 딜 순위</h2>
                        <div className="flex gap-2 text-xs">
                            <button
                                type="button"
                                className={`px-2 py-1 border rounded ${
                                    rankMode === "damage"
                                        ? "bg-blue-500 text-white border-blue-500"
                                        : "bg-white text-gray-700"
                                }`}
                                onClick={() => setRankMode("damage")}
                            >
                                최종 데미지 기준
                            </button>
                            <button
                                type="button"
                                className={`px-2 py-1 border rounded ${
                                    rankMode === "perCool"
                                        ? "bg-blue-500 text-white border-blue-500"
                                        : "bg-white text-gray-700"
                                }`}
                                onClick={() => setRankMode("perCool")}
                            >
                                쿨타임당 데미지 기준
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="border px-2 py-1">순위</th>
                                    <th className="border px-2 py-1">스킬명</th>
                                    <th className="border px-2 py-1">스킬 데미지</th>
                                    <th className="border px-2 py-1">쿨타임(초)</th>
                                    <th className="border px-2 py-1">
                                        {rankMode === "damage"
                                            ? "최종 데미지"
                                            : "쿨타임당 데미지"}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rankedSkills.map((item, index) => (
                                    <tr key={item.skill.name}>
                                        <td className="border px-2 py-1 text-center">
                                            {index + 1}
                                        </td>
                                        <td className="border px-2 py-1 whitespace-nowrap">
                                            {item.skill.name}
                                        </td>
                                        <td className="border px-2 py-1 text-right">
                                            {item.skillDamage.toLocaleString(undefined, {
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                        <td className="border px-2 py-1 text-right">
                                            {item.skill.cooltime}
                                        </td>
                                        <td className="border px-2 py-1 text-right">
                                            {(rankMode === "damage"
                                                ? item.finalDamage
                                                : item.damagePerCool
                                            ).toLocaleString(undefined, {
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}
