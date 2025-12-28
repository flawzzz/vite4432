import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../lib/firebase";
import EquipmentPicker, { preloadEquipmentPickerData } from "../components/EquipmentPicker";

type JobData = {
  job: string;
  image?: string;
  group?: string;
};

export default function CreateCharacterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);

  const [jobs, setJobs] = useState<JobData[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<string | null>(null);

  const [characterId, setCharacterId] = useState("");
  const [job, setJob] = useState("");
  const [equippedItems, setEquippedItems] = useState<string[]>([]);
  const [skillCode, setSkillCode] = useState("");
  const [weaponEnhance, setWeaponEnhance] = useState(0);
  const [armorAccSpecialEnhance, setArmorAccSpecialEnhance] = useState(0);
  const [weaponRefine, setWeaponRefine] = useState(0);
  const [supportRefine, setSupportRefine] = useState(0);
  const [creature, setCreature] = useState("");
  const [aura, setAura] = useState("");
  const [artifact, setArtifact] = useState("");
  const [title, setTitle] = useState("");
  const [avatar, setAvatar] = useState("");

  const ENHANCE_LEVEL_OPTIONS = Array.from({ length: 21 }, (_, i) => i);
  const REFINE_LEVEL_OPTIONS = Array.from({ length: 11 }, (_, i) => i);

  const normalizeIntOption = (value: unknown, min: number, max: number, fallback: number) => {
    let n: number | null = null;
    if (typeof value === "number" && Number.isFinite(value)) n = value;
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) n = parsed;
    }
    if (n === null) return fallback;
    const rounded = Math.trunc(n);
    if (rounded < min || rounded > max) return fallback;
    return rounded;
  };

  useEffect(() => {
    // Warm caches so thumbnails can render immediately.
    preloadEquipmentPickerData();
  }, []);

  const saveDraft = (next: {
    characterId: string;
    job: string;
    equippedItems: string[];
    skillCode: string;
    weaponEnhance: number;
    armorAccSpecialEnhance: number;
    weaponRefine: number;
    supportRefine: number;
    creature: string;
    aura: string;
    artifact: string;
    title: string;
    avatar: string;
  }) => {
    try {
      sessionStorage.setItem("createCrewDraft", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const clearDraft = () => {
    try {
      sessionStorage.removeItem("createCrewDraft");
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // Restore draft (e.g. after navigating to picker pages)
    try {
      const raw = sessionStorage.getItem("createCrewDraft");
      if (!raw) return;
      const parsed = JSON.parse(raw) as any;
      if (!parsed || typeof parsed !== "object") return;
      if (typeof parsed.characterId === "string") setCharacterId(parsed.characterId);
      if (typeof parsed.job === "string") setJob(parsed.job);
      if (Array.isArray(parsed.equippedItems)) setEquippedItems(parsed.equippedItems);
      if (typeof parsed.skillCode === "string") setSkillCode(parsed.skillCode);
      setWeaponEnhance(normalizeIntOption(parsed.weaponEnhance, 0, 20, 0));
      setArmorAccSpecialEnhance(normalizeIntOption(parsed.armorAccSpecialEnhance, 0, 20, 0));
      setWeaponRefine(normalizeIntOption(parsed.weaponRefine, 0, 10, 0));
      setSupportRefine(normalizeIntOption(parsed.supportRefine, 0, 10, 0));
      if (typeof parsed.creature === "string") setCreature(parsed.creature);
      if (typeof parsed.aura === "string") setAura(parsed.aura);
      if (typeof parsed.artifact === "string") setArtifact(parsed.artifact);
      if (typeof parsed.title === "string") setTitle(parsed.title);
      if (typeof parsed.avatar === "string") setAvatar(parsed.avatar);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (user) return;

    const from = `${location.pathname}${location.search}${location.hash}`;
    navigate("/login", { replace: true, state: { from } });
  }, [authReady, user, navigate, location.pathname, location.search, location.hash]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDataError(null);
      try {
        const [jobRes] = await Promise.all([fetch("/data/character.json")]);
        if (!jobRes.ok) throw new Error(`character.json 로딩 실패 (${jobRes.status})`);

        const jobsJson = (await jobRes.json()) as unknown;

        const nextJobs = Array.isArray(jobsJson) ? (jobsJson as JobData[]) : [];

        if (cancelled) return;
        setJobs(nextJobs.filter((j) => typeof j?.job === "string" && j.job.length > 0));
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setDataError("직업/아이템 데이터를 불러오지 못했습니다. 콘솔을 확인해주세요.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const jobImageSrc = useMemo(() => {
    if (!job) return null;
    const found = jobs.find((j) => j.job === job);
    if (!found?.image) return null;
    return `/images/character/${found.image}.PNG`;
  }, [job, jobs]);

  useEffect(() => {
    const state = location.state as unknown;
    if (!state || typeof state !== "object") return;
    if (!("pickerResult" in state)) return;
    const pickerResult = (state as { pickerResult?: unknown }).pickerResult;
    if (!pickerResult || typeof pickerResult !== "object") return;
    const kind = (pickerResult as { kind?: unknown }).kind;
    if (kind !== "job") return;
    const applyTo = (pickerResult as { applyTo?: unknown }).applyTo;
    if (applyTo !== "create") return;
    const pickedJob = (pickerResult as { job?: unknown }).job;
    if (typeof pickedJob !== "string" || pickedJob.length === 0) return;

    setJob(pickedJob);
    saveDraft({
      characterId,
      job: pickedJob,
      equippedItems,
      skillCode,
      weaponEnhance,
      armorAccSpecialEnhance,
      weaponRefine,
      supportRefine,
      creature,
      aura,
      artifact,
      title,
      avatar,
    });
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });
  }, [location.state, location.pathname, location.search, location.hash, navigate]);

  const onPickJobClick = () => {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    saveDraft({
      characterId,
      job,
      equippedItems,
      skillCode,
      weaponEnhance,
      armorAccSpecialEnhance,
      weaponRefine,
      supportRefine,
      creature,
      aura,
      artifact,
      title,
      avatar,
    });
    navigate("/pick/job", { state: { returnTo, applyTo: "create" } });
  };

  const onCreateCrew = async () => {
    if (!user) return;
    if (creating) return;

    const idTrimmed = characterId.trim();
    const jobTrimmed = job.trim();
    if (!idTrimmed) {
      setCreateResult("아이디는 필수입니다.");
      return;
    }
    if (!jobTrimmed) {
      setCreateResult("직업은 필수입니다.");
      return;
    }

    setCreating(true);
    setCreateResult(null);
    try {
      await addDoc(collection(db, "users", user.uid, "crew"), {
        id: idTrimmed,
        job: jobTrimmed,
        order: Date.now(),
        equippedItems: equippedItems.length > 0 ? equippedItems : null,
        skillCode: skillCode.trim() || null,
        weaponEnhance: normalizeIntOption(weaponEnhance, 0, 20, 0),
        armorAccSpecialEnhance: normalizeIntOption(armorAccSpecialEnhance, 0, 20, 0),
        weaponRefine: normalizeIntOption(weaponRefine, 0, 10, 0),
        supportRefine: normalizeIntOption(supportRefine, 0, 10, 0),
        creature: creature.trim() || null,
        aura: aura.trim() || null,
        artifact: artifact.trim() || null,
        title: title.trim() || null,
        avatar: avatar.trim() || null,
        createdAt: serverTimestamp(),
      });
      clearDraft();
      navigate("/record", { replace: true });
    } catch (e) {
      console.error(e);
      setCreateResult("생성 실패: 콘솔을 확인해주세요.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col px-3 py-6">
      <div className="mx-auto w-full max-w-4xl space-y-3">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">캐릭터 생성</h1>
            <p className="text-xs text-slate-400 sm:text-sm">필수: 아이디, 직업</p>
          </div>
          <Link
            to="/record"
            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-200 hover:border-indigo-500/70"
          >
            목록으로
          </Link>
        </header>

        {dataError ? <div className="text-xs text-red-300">{dataError}</div> : null}

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-3">
          <div className="space-y-2">
            <div className="text-xs text-slate-400">아이디 (필수)</div>
            <input
              value={characterId}
              onChange={(e) => setCharacterId(e.target.value)}
              placeholder="예: 내캐릭터"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-400">직업 (필수)</div>
            <button
              type="button"
              onClick={onPickJobClick}
              disabled={creating}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-left text-sm text-slate-100 hover:border-indigo-500/70 disabled:opacity-60"
            >
              {job ? job : "직업을 선택하세요"}
            </button>
            {job && jobImageSrc ? (
              <div className="flex items-center gap-2 pt-1">
                <img
                  src={jobImageSrc}
                  alt={job}
                  className="h-10 w-10 rounded-full border border-slate-800 bg-slate-950/40 object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="text-xs text-slate-300">{job}</div>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-400">장착중인 아이템 (선택)</div>
            <EquipmentPicker
              job={job}
              value={equippedItems}
              onChange={setEquippedItems}
              disabled={creating}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs text-slate-400">무기 강화</div>
              <select
                value={String(weaponEnhance)}
                onChange={(e) => setWeaponEnhance(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100"
                disabled={creating}
              >
                {ENHANCE_LEVEL_OPTIONS.map((lv) => (
                  <option key={lv} value={lv}>
                    {lv}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-slate-400">방악특 강화</div>
              <select
                value={String(armorAccSpecialEnhance)}
                onChange={(e) => setArmorAccSpecialEnhance(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100"
                disabled={creating}
              >
                {ENHANCE_LEVEL_OPTIONS.map((lv) => (
                  <option key={lv} value={lv}>
                    {lv}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-slate-400">무기 연마</div>
              <select
                value={String(weaponRefine)}
                onChange={(e) => setWeaponRefine(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100"
                disabled={creating}
              >
                {REFINE_LEVEL_OPTIONS.map((lv) => (
                  <option key={lv} value={lv}>
                    {lv}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-slate-400">보조장비 연마</div>
              <select
                value={String(supportRefine)}
                onChange={(e) => setSupportRefine(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100"
                disabled={creating}
              >
                {REFINE_LEVEL_OPTIONS.map((lv) => (
                  <option key={lv} value={lv}>
                    {lv}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-slate-400">스킬 코드 (선택)</div>
              <input
                value={skillCode}
                onChange={(e) => setSkillCode(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500"
                placeholder="예: ABCD1234"
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-slate-400">크리처 (선택)</div>
              <input
                value={creature}
                onChange={(e) => setCreature(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100"
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-slate-400">오라 (선택)</div>
              <input
                value={aura}
                onChange={(e) => setAura(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100"
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-slate-400">아티팩트 (선택)</div>
              <input
                value={artifact}
                onChange={(e) => setArtifact(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100"
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-slate-400">칭호 (선택)</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100"
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-slate-400">아바타 (선택)</div>
              <input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100"
                disabled={creating}
              />
            </div>
          </div>

          <button
            onClick={onCreateCrew}
            disabled={creating}
            className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-200 hover:border-indigo-500/70 disabled:opacity-60"
          >
            {creating ? "생성 중..." : "캐릭터 생성"}
          </button>

          {createResult ? <div className="text-xs text-slate-300">{createResult}</div> : null}
        </div>
      </div>
    </div>
  );
}
