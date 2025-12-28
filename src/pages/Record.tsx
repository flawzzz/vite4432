import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";

import { auth, db } from "../lib/firebase";
import EquipmentPicker, { preloadEquipmentPickerData } from "../components/EquipmentPicker";

type JobData = {
  job: string;
  image?: string;
  group?: string;
};

type CrewDoc = {
  docId: string;
  id: string;
  job: string;
  order: number;
  equippedItems: string[] | null;
  skillCode: string | null;
  skillRune: string | null;
  antimagicPower: number | null;
  creature: string | null;
  aura: string | null;
  artifact: string | null;
  title: string | null;
  avatar: string | null;
  weaponAvatar: string | null;
  weaponEnhance: number;
  armorAccSpecialEnhance: number;
  weaponRefine: number;
  supportRefine: number;
};

export default function RecordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);

  const crewListRef = useRef<HTMLDivElement | null>(null);
  const editPanelRef = useRef<HTMLDivElement | null>(null);

  const [jobs, setJobs] = useState<JobData[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [equipIconByName, setEquipIconByName] = useState<Record<string, string>>({});

  const [crewLoading, setCrewLoading] = useState(false);
  const [crewError, setCrewError] = useState<string | null>(null);
  const [crew, setCrew] = useState<CrewDoc[]>([]);
  const [ignoredCrewCount, setIgnoredCrewCount] = useState(0);

  const [latestDamageByCrewDocId, setLatestDamageByCrewDocId] = useState<
    Record<string, { damage: number; memo: string | null; createdAt?: unknown }>
  >({});

  const [selectedCrew, setSelectedCrew] = useState<CrewDoc | null>(null);
  const [editing, setEditing] = useState(false);
  const [editResult, setEditResult] = useState<string | null>(null);

  const [pendingPick, setPendingPick] = useState<{ docId: string; job: string } | null>(null);

  const [editCharacterId, setEditCharacterId] = useState("");
  const [editJob, setEditJob] = useState("");
  const [editEquippedItems, setEditEquippedItems] = useState<string[]>([]);
  const [editSkillCode, setEditSkillCode] = useState("");
  const [editSkillRune, setEditSkillRune] = useState("");
  const [editAntimagicPower, setEditAntimagicPower] = useState("");
  const [editCreature, setEditCreature] = useState("없음");
  const [editAura, setEditAura] = useState("없음");
  const [editArtifact, setEditArtifact] = useState("없음");
  const [editTitle, setEditTitle] = useState("없음");
  const [editAvatar, setEditAvatar] = useState("없음");
  const [editWeaponAvatar, setEditWeaponAvatar] = useState("없음");
  const [editWeaponEnhance, setEditWeaponEnhance] = useState(0);
  const [editArmorAccSpecialEnhance, setEditArmorAccSpecialEnhance] = useState(0);
  const [editWeaponRefine, setEditWeaponRefine] = useState(0);
  const [editSupportRefine, setEditSupportRefine] = useState(0);

  const [reorderMode, setReorderMode] = useState(false);
  const reorderModeRef = useRef(false);
  const [reorderSaving, setReorderSaving] = useState(false);
  const [reorderResult, setReorderResult] = useState<string | null>(null);
  const [reorderDirty, setReorderDirty] = useState(false);
  const reorderOriginalOrderRef = useRef<Record<string, number> | null>(null);

  const [draggingCrewDocId, setDraggingCrewDocId] = useState<string | null>(null);
  const [dragOverCrewDocId, setDragOverCrewDocId] = useState<string | null>(null);

  useEffect(() => {
    reorderModeRef.current = reorderMode;
  }, [reorderMode]);

  useEffect(() => {
    // Warm caches so thumbnails can render immediately when edit form opens.
    preloadEquipmentPickerData();
  }, []);

  useEffect(() => {
    // Keep selectedCrew reference in sync when list is reordered/refreshed.
    if (!selectedCrew) return;
    const found = crew.find((c) => c.docId === selectedCrew.docId);
    if (!found) return;
    if (found === selectedCrew) return;
    setSelectedCrew(found);
  }, [crew, selectedCrew]);

  useEffect(() => {
    if (!selectedCrew) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (crewListRef.current && crewListRef.current.contains(target)) return;
      if (editPanelRef.current && editPanelRef.current.contains(target)) return;
      setSelectedCrew(null);
      setEditResult(null);
    };

    document.addEventListener("mousedown", onPointerDown, { capture: true });
    document.addEventListener("touchstart", onPointerDown, { capture: true, passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointerDown, { capture: true } as any);
      document.removeEventListener("touchstart", onPointerDown, { capture: true } as any);
    };
  }, [selectedCrew]);

  const getJobImageSrc = (jobName: string): string | null => {
    const found = jobs.find((j) => j.job === jobName);
    if (!found?.image) return null;
    return `/images/character/${found.image}.PNG`;
  };

  const getEquippedIconSrc = (name: string): string | null => {
    const key = String(name ?? "").trim();
    if (!key) return null;
    return equipIconByName[key] ?? null;
  };

  const FINISH_GRADE_OPTIONS = ["종결", "준종결", "일반", "없음"] as const;
  const AVATAR_GRADE_OPTIONS = ["레어", "커먼", "없음"] as const;
  const ENHANCE_LEVEL_OPTIONS = Array.from({ length: 21 }, (_, i) => i);
  const REFINE_LEVEL_OPTIONS = Array.from({ length: 11 }, (_, i) => i);

  const normalizeOption = (value: unknown, allowed: readonly string[], fallback: string) => {
    if (typeof value === "string" && allowed.includes(value)) return value;
    return fallback;
  };

  const displayGrade = (value: string | null): string => {
    const v = (value ?? "없음").trim();
    return v.length > 0 ? v : "없음";
  };

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

  const formatDamageToEokText = (damage: number): string | null => {
    const EOK = 100_000_000;
    if (!Number.isFinite(damage) || damage <= 0) return null;
    const eokValue = damage / EOK;
    const formatted = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(eokValue);
    return `${formatted} 億`;
  };

  useEffect(() => {
    if (!user) {
      setLatestDamageByCrewDocId({});
      return;
    }

    // Pull a recent window and pick the first record per crewDocId.
    // This avoids N queries (per character) while keeping the UI snappy.
    const ref = collection(db, "users", user.uid, "records");
    const q = query(ref, orderBy("createdAt", "desc"), limit(200));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: Record<string, { damage: number; memo: string | null; createdAt?: unknown }> = {};
        for (const d of snap.docs) {
          const data = d.data() as Record<string, unknown>;
          const crewDocId = typeof data.crewDocId === "string" ? data.crewDocId : "";
          if (!crewDocId) continue;
          if (next[crewDocId]) continue;
          const damageRaw = data.damage;
          const damage = typeof damageRaw === "number" && Number.isFinite(damageRaw) ? damageRaw : 0;
          if (!damage || damage <= 0) continue;
          const memoRaw = data.memo;
          const memo = typeof memoRaw === "string" && memoRaw.trim().length > 0 ? memoRaw.trim() : null;
          next[crewDocId] = { damage, memo, createdAt: (data as any).createdAt };
        }
        setLatestDamageByCrewDocId(next);
      },
      (err) => {
        console.error(err);
        setLatestDamageByCrewDocId({});
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const saveEditDraft = (next: {
    docId: string;
    editCharacterId: string;
    editJob: string;
    editEquippedItems: string[];
    editSkillCode: string;
    editSkillRune: string;
    editAntimagicPower: string;
    editCreature: string;
    editAura: string;
    editArtifact: string;
    editTitle: string;
    editAvatar: string;
    editWeaponAvatar: string;
    editWeaponEnhance: number;
    editArmorAccSpecialEnhance: number;
    editWeaponRefine: number;
    editSupportRefine: number;
  }) => {
    try {
      sessionStorage.setItem("editCrewDraft", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const clearEditDraft = () => {
    try {
      sessionStorage.removeItem("editCrewDraft");
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const state = location.state as unknown;
    if (!state || typeof state !== "object") return;
    if (!("pickerResult" in state)) return;
    const pickerResult = (state as { pickerResult?: unknown }).pickerResult;
    if (!pickerResult || typeof pickerResult !== "object") return;
    const kind = (pickerResult as { kind?: unknown }).kind;
    if (kind !== "job") return;
    const applyTo = (pickerResult as { applyTo?: unknown }).applyTo;
    if (applyTo !== "edit") return;
    const pickedJob = (pickerResult as { job?: unknown }).job;
    const docId = (pickerResult as { docId?: unknown }).docId;
    if (typeof pickedJob !== "string" || pickedJob.length === 0) return;
    if (typeof docId !== "string" || docId.length === 0) return;

    setPendingPick({ docId, job: pickedJob });
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });
  }, [location.state, location.pathname, location.search, location.hash, navigate]);

  useEffect(() => {
    if (!pendingPick) return;
    const found = crew.find((c) => c.docId === pendingPick.docId);
    if (!found) return;
    onSelectCrew(found);
    setEditJob(pendingPick.job);

    // Keep draft in sync without wiping other in-progress fields.
    try {
      const raw = sessionStorage.getItem("editCrewDraft");
      const parsed = raw ? (JSON.parse(raw) as any) : null;
      const same = parsed && typeof parsed.docId === "string" && parsed.docId === found.docId;
      saveEditDraft({
        docId: found.docId,
        editCharacterId: same && typeof parsed.editCharacterId === "string" ? parsed.editCharacterId : found.id,
        editJob: pendingPick.job,
        editEquippedItems: same && Array.isArray(parsed.editEquippedItems) ? parsed.editEquippedItems : (found.equippedItems ?? []),
        editSkillCode: same && typeof parsed.editSkillCode === "string" ? parsed.editSkillCode : (found.skillCode ?? ""),
        editSkillRune: same && typeof parsed.editSkillRune === "string" ? parsed.editSkillRune : (found.skillRune ?? ""),
        editAntimagicPower:
          same && typeof parsed.editAntimagicPower === "string"
            ? parsed.editAntimagicPower
            : typeof found.antimagicPower === "number"
              ? String(found.antimagicPower)
              : "",
        editCreature: same && typeof parsed.editCreature === "string" ? parsed.editCreature : (found.creature ?? "없음"),
        editAura: same && typeof parsed.editAura === "string" ? parsed.editAura : (found.aura ?? "없음"),
        editArtifact: same && typeof parsed.editArtifact === "string" ? parsed.editArtifact : (found.artifact ?? "없음"),
        editTitle: same && typeof parsed.editTitle === "string" ? parsed.editTitle : (found.title ?? "없음"),
        editAvatar: same && typeof parsed.editAvatar === "string" ? parsed.editAvatar : (found.avatar ?? "없음"),
        editWeaponAvatar:
          same && typeof parsed.editWeaponAvatar === "string" ? parsed.editWeaponAvatar : (found.weaponAvatar ?? "없음"),
        editWeaponEnhance: same ? normalizeIntOption(parsed.editWeaponEnhance, 0, 20, found.weaponEnhance) : found.weaponEnhance,
        editArmorAccSpecialEnhance: same
          ? normalizeIntOption(parsed.editArmorAccSpecialEnhance, 0, 20, found.armorAccSpecialEnhance)
          : found.armorAccSpecialEnhance,
        editWeaponRefine: same ? normalizeIntOption(parsed.editWeaponRefine, 0, 10, found.weaponRefine) : found.weaponRefine,
        editSupportRefine: same ? normalizeIntOption(parsed.editSupportRefine, 0, 10, found.supportRefine) : found.supportRefine,
      });
    } catch {
      saveEditDraft({
        docId: found.docId,
        editCharacterId: found.id,
        editJob: pendingPick.job,
        editEquippedItems: found.equippedItems ?? [],
        editSkillCode: found.skillCode ?? "",
        editSkillRune: found.skillRune ?? "",
        editAntimagicPower: typeof found.antimagicPower === "number" ? String(found.antimagicPower) : "",
        editCreature: found.creature ?? "없음",
        editAura: found.aura ?? "없음",
        editArtifact: found.artifact ?? "없음",
        editTitle: found.title ?? "없음",
        editAvatar: found.avatar ?? "없음",
        editWeaponAvatar: found.weaponAvatar ?? "없음",
        editWeaponEnhance: found.weaponEnhance,
        editArmorAccSpecialEnhance: found.armorAccSpecialEnhance,
        editWeaponRefine: found.weaponRefine,
        editSupportRefine: found.supportRefine,
      });
    }

    setPendingPick(null);
  }, [pendingPick, crew]);

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
        const [jobRes, itemRes, weaponRes] = await Promise.all([
          fetch("/data/character.json"),
          fetch("/data/item.json"),
          fetch("/data/weapon.json"),
        ]);
        if (!jobRes.ok) throw new Error(`character.json 로딩 실패 (${jobRes.status})`);
        if (!itemRes.ok) throw new Error(`item.json 로딩 실패 (${itemRes.status})`);
        if (!weaponRes.ok) throw new Error(`weapon.json 로딩 실패 (${weaponRes.status})`);

        const jobsJson = (await jobRes.json()) as unknown;
        const itemsJson = (await itemRes.json()) as unknown;
        const weaponsJson = (await weaponRes.json()) as unknown;

        const nextJobs = Array.isArray(jobsJson) ? (jobsJson as JobData[]) : [];

        const iconIndex: Record<string, string> = {};
        const items = Array.isArray(itemsJson) ? (itemsJson as Array<Record<string, unknown>>) : [];
        for (const it of items) {
          const name = typeof it?.name === "string" ? it.name.trim() : "";
          const image = typeof it?.image === "string" ? it.image.trim() : "";
          if (!name || !image) continue;
          iconIndex[name] = `/images/item/item_${image}.png`;
        }

        const weapons = Array.isArray(weaponsJson) ? (weaponsJson as Array<Record<string, unknown>>) : [];
        for (const w of weapons) {
          const name = typeof w?.name === "string" ? w.name.trim() : "";
          const image = typeof w?.image === "string" ? w.image.trim() : "";
          if (!name || !image) continue;
          iconIndex[name] = `/images/weapon/weapon_${image}.png`;
        }

        if (cancelled) return;
        setJobs(nextJobs.filter((j) => typeof j?.job === "string" && j.job.length > 0));
        setEquipIconByName(iconIndex);
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

  useEffect(() => {
    if (!user) {
      setCrew([]);
      setCrewLoading(false);
      setCrewError(null);
      setIgnoredCrewCount(0);
      return;
    }

    setCrewLoading(true);
    setCrewError(null);
    const ref = collection(db, "users", user.uid, "crew");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const parsed = snap.docs.map((d, idx) => {
          const data = d.data() as Record<string, unknown>;
          const id = typeof data.id === "string" ? data.id.trim() : "";
          const job = typeof data.job === "string" ? data.job.trim() : "";
          const rawOrder = (data as any).order;
          const order = typeof rawOrder === "number" && Number.isFinite(rawOrder) ? rawOrder : idx;
          const equippedItems = Array.isArray(data.equippedItems)
            ? (data.equippedItems.filter((x) => typeof x === "string") as string[])
            : null;

          return {
            docId: d.id,
            id,
            job,
            order,
            equippedItems,
            skillCode: typeof data.skillCode === "string" ? data.skillCode : null,
            skillRune: typeof data.skillRune === "string" ? data.skillRune : null,
            antimagicPower:
              typeof (data as any).antimagicPower === "number" && Number.isFinite((data as any).antimagicPower)
                ? ((data as any).antimagicPower as number)
                : typeof (data as any).antimagicPower === "string" && (data as any).antimagicPower.trim().length > 0
                  ? Number((data as any).antimagicPower.replaceAll(",", ""))
                  : null,
            creature: typeof data.creature === "string" ? data.creature : null,
            aura: typeof data.aura === "string" ? data.aura : null,
            artifact: typeof data.artifact === "string" ? data.artifact : null,
            title: typeof data.title === "string" ? data.title : null,
            avatar: typeof data.avatar === "string" ? data.avatar : null,
            weaponAvatar: typeof (data as any).weaponAvatar === "string" ? ((data as any).weaponAvatar as string) : null,
            weaponEnhance: normalizeIntOption((data as any).weaponEnhance, 0, 20, 0),
            armorAccSpecialEnhance: normalizeIntOption((data as any).armorAccSpecialEnhance, 0, 20, 0),
            weaponRefine: normalizeIntOption((data as any).weaponRefine, 0, 10, 0),
            supportRefine: normalizeIntOption((data as any).supportRefine, 0, 10, 0),
          } satisfies CrewDoc;
        });

        const valid = parsed.filter((c) => c.id.length > 0 && c.job.length > 0);
        valid.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        // When user is manually reordering, keep local list stable until they finish.
        if (!reorderModeRef.current) {
          setCrew(valid);
        }
        setIgnoredCrewCount(parsed.length - valid.length);
        setCrewLoading(false);
      },
      (err) => {
        console.error(err);
        setCrewError(err?.message ?? "캐릭터 목록을 불러오지 못했습니다.");
        setCrewLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const persistCrewOrder = async (nextCrew: CrewDoc[], originalOrders: Record<string, number> | null) => {
    if (!user) return;
    const batch = writeBatch(db);
    let changed = 0;
    nextCrew.forEach((c, idx) => {
      const before = originalOrders ? originalOrders[c.docId] : undefined;
      if (typeof before === "number" && before === idx) return;
      const ref = doc(db, "users", user.uid, "crew", c.docId);
      batch.update(ref, { order: idx });
      changed += 1;
    });
    if (changed === 0) return;
    await batch.commit();
  };

  const onStartReorderMode = () => {
    if (editing || reorderSaving || crewLoading || crew.length === 0) return;
    setReorderResult(null);
    setReorderMode(true);
    setReorderDirty(false);
    reorderOriginalOrderRef.current = Object.fromEntries(crew.map((c) => [c.docId, c.order]));
  };

  const onFinishReorderMode = async () => {
    if (!user) return;
    if (!reorderMode) return;
    if (reorderSaving) return;

    if (!reorderDirty) {
      setReorderResult(null);
      setReorderMode(false);
      setReorderDirty(false);
      reorderOriginalOrderRef.current = null;
      setDraggingCrewDocId(null);
      setDragOverCrewDocId(null);
      return;
    }

    setReorderResult(null);
    setReorderSaving(true);
    try {
      await persistCrewOrder(crew, reorderOriginalOrderRef.current);
      setReorderResult("순서 저장 완료!");
      setReorderMode(false);
      setReorderDirty(false);
      reorderOriginalOrderRef.current = null;
      setDraggingCrewDocId(null);
      setDragOverCrewDocId(null);
    } catch (err) {
      console.error(err);
      setReorderResult("순서 저장 실패: 콘솔을 확인해주세요.");
    } finally {
      setReorderSaving(false);
    }
  };

  const onSelectCrew = (c: CrewDoc) => {
    setSelectedCrew(c);
    setEditResult(null);
    try {
      const raw = sessionStorage.getItem("editCrewDraft");
      const parsed = raw ? (JSON.parse(raw) as any) : null;
      const same = parsed && typeof parsed.docId === "string" && parsed.docId === c.docId;

      const nextCharacterId = same && typeof parsed.editCharacterId === "string" ? parsed.editCharacterId : c.id;
      const nextJob = same && typeof parsed.editJob === "string" ? parsed.editJob : c.job;
      const nextEquippedItems = same && Array.isArray(parsed.editEquippedItems) ? parsed.editEquippedItems : (c.equippedItems ?? []);
      const nextSkillCode = same && typeof parsed.editSkillCode === "string" ? parsed.editSkillCode : (c.skillCode ?? "");
      const nextSkillRune = same && typeof parsed.editSkillRune === "string" ? parsed.editSkillRune : (c.skillRune ?? "");
      const nextAntimagicPower =
        same && typeof parsed.editAntimagicPower === "string"
          ? parsed.editAntimagicPower
          : typeof c.antimagicPower === "number" && Number.isFinite(c.antimagicPower)
            ? String(c.antimagicPower)
            : "";
      const nextCreature = normalizeOption(
        same ? parsed.editCreature : (c.creature ?? "없음"),
        FINISH_GRADE_OPTIONS,
        "없음"
      );
      const nextAura = normalizeOption(same ? parsed.editAura : (c.aura ?? "없음"), FINISH_GRADE_OPTIONS, "없음");
      const nextArtifact = normalizeOption(
        same ? parsed.editArtifact : (c.artifact ?? "없음"),
        FINISH_GRADE_OPTIONS,
        "없음"
      );
      const nextTitle = normalizeOption(same ? parsed.editTitle : (c.title ?? "없음"), FINISH_GRADE_OPTIONS, "없음");
      const nextAvatar = normalizeOption(same ? parsed.editAvatar : (c.avatar ?? "없음"), AVATAR_GRADE_OPTIONS, "없음");
      const nextWeaponAvatar = normalizeOption(
        same ? parsed.editWeaponAvatar : (c.weaponAvatar ?? "없음"),
        FINISH_GRADE_OPTIONS,
        "없음"
      );

      const nextWeaponEnhance = normalizeIntOption(same ? parsed.editWeaponEnhance : c.weaponEnhance, 0, 20, 0);
      const nextArmorAccSpecialEnhance = normalizeIntOption(
        same ? parsed.editArmorAccSpecialEnhance : c.armorAccSpecialEnhance,
        0,
        20,
        0
      );
      const nextWeaponRefine = normalizeIntOption(same ? parsed.editWeaponRefine : c.weaponRefine, 0, 10, 0);
      const nextSupportRefine = normalizeIntOption(same ? parsed.editSupportRefine : c.supportRefine, 0, 10, 0);

      setEditCharacterId(nextCharacterId);
      setEditJob(nextJob);
      setEditEquippedItems(nextEquippedItems);
      setEditSkillCode(nextSkillCode);
      setEditSkillRune(nextSkillRune);
      setEditAntimagicPower(nextAntimagicPower);
      setEditCreature(nextCreature);
      setEditAura(nextAura);
      setEditArtifact(nextArtifact);
      setEditTitle(nextTitle);
      setEditAvatar(nextAvatar);
      setEditWeaponAvatar(nextWeaponAvatar);
      setEditWeaponEnhance(nextWeaponEnhance);
      setEditArmorAccSpecialEnhance(nextArmorAccSpecialEnhance);
      setEditWeaponRefine(nextWeaponRefine);
      setEditSupportRefine(nextSupportRefine);

      saveEditDraft({
        docId: c.docId,
        editCharacterId: nextCharacterId,
        editJob: nextJob,
        editEquippedItems: nextEquippedItems,
        editSkillCode: nextSkillCode,
        editSkillRune: nextSkillRune,
        editAntimagicPower: nextAntimagicPower,
        editCreature: nextCreature,
        editAura: nextAura,
        editArtifact: nextArtifact,
        editTitle: nextTitle,
        editAvatar: nextAvatar,
        editWeaponAvatar: nextWeaponAvatar,
        editWeaponEnhance: nextWeaponEnhance,
        editArmorAccSpecialEnhance: nextArmorAccSpecialEnhance,
        editWeaponRefine: nextWeaponRefine,
        editSupportRefine: nextSupportRefine,
      });
    } catch {
      setEditCharacterId(c.id);
      setEditJob(c.job);
      setEditEquippedItems(c.equippedItems ?? []);
      setEditSkillCode(c.skillCode ?? "");
      setEditSkillRune(c.skillRune ?? "");
      setEditAntimagicPower(typeof c.antimagicPower === "number" ? String(c.antimagicPower) : "");
      setEditCreature(normalizeOption(c.creature ?? "없음", FINISH_GRADE_OPTIONS, "없음"));
      setEditAura(normalizeOption(c.aura ?? "없음", FINISH_GRADE_OPTIONS, "없음"));
      setEditArtifact(normalizeOption(c.artifact ?? "없음", FINISH_GRADE_OPTIONS, "없음"));
      setEditTitle(normalizeOption(c.title ?? "없음", FINISH_GRADE_OPTIONS, "없음"));
      setEditAvatar(normalizeOption(c.avatar ?? "없음", AVATAR_GRADE_OPTIONS, "없음"));
      setEditWeaponAvatar(normalizeOption(c.weaponAvatar ?? "없음", FINISH_GRADE_OPTIONS, "없음"));
      setEditWeaponEnhance(c.weaponEnhance);
      setEditArmorAccSpecialEnhance(c.armorAccSpecialEnhance);
      setEditWeaponRefine(c.weaponRefine);
      setEditSupportRefine(c.supportRefine);

      saveEditDraft({
        docId: c.docId,
        editCharacterId: c.id,
        editJob: c.job,
        editEquippedItems: c.equippedItems ?? [],
        editSkillCode: c.skillCode ?? "",
        editSkillRune: c.skillRune ?? "",
        editAntimagicPower: typeof c.antimagicPower === "number" ? String(c.antimagicPower) : "",
        editCreature: normalizeOption(c.creature ?? "없음", FINISH_GRADE_OPTIONS, "없음"),
        editAura: normalizeOption(c.aura ?? "없음", FINISH_GRADE_OPTIONS, "없음"),
        editArtifact: normalizeOption(c.artifact ?? "없음", FINISH_GRADE_OPTIONS, "없음"),
        editTitle: normalizeOption(c.title ?? "없음", FINISH_GRADE_OPTIONS, "없음"),
        editAvatar: normalizeOption(c.avatar ?? "없음", AVATAR_GRADE_OPTIONS, "없음"),
        editWeaponAvatar: normalizeOption(c.weaponAvatar ?? "없음", FINISH_GRADE_OPTIONS, "없음"),
        editWeaponEnhance: c.weaponEnhance,
        editArmorAccSpecialEnhance: c.armorAccSpecialEnhance,
        editWeaponRefine: c.weaponRefine,
        editSupportRefine: c.supportRefine,
      });
    }
  };

  const onUpdateCrew = async () => {
    if (!user) return;
    if (!selectedCrew) return;
    if (editing) return;

    const idTrimmed = editCharacterId.trim();
    const jobTrimmed = editJob.trim();
    if (!idTrimmed) {
      setEditResult("아이디는 필수입니다.");
      return;
    }
    if (!jobTrimmed) {
      setEditResult("직업은 필수입니다.");
      return;
    }

    setEditing(true);
    setEditResult(null);
    try {
      const ref = doc(db, "users", user.uid, "crew", selectedCrew.docId);

      const antimagicTrimmed = editAntimagicPower.trim().replaceAll(",", "");
      const antimagicParsed = antimagicTrimmed.length > 0 ? Number(antimagicTrimmed) : null;
      const antimagicValue =
        typeof antimagicParsed === "number" && Number.isFinite(antimagicParsed) ? antimagicParsed : null;

      await updateDoc(ref, {
        id: idTrimmed,
        job: jobTrimmed,
        equippedItems: editEquippedItems.length > 0 ? editEquippedItems : null,
        skillCode: editSkillCode.trim() || null,
        skillRune: editSkillRune.trim() || null,
        antimagicPower: antimagicValue,
        creature: editCreature === "없음" ? null : editCreature,
        aura: editAura === "없음" ? null : editAura,
        artifact: editArtifact === "없음" ? null : editArtifact,
        title: editTitle === "없음" ? null : editTitle,
        avatar: editAvatar === "없음" ? null : editAvatar,
        weaponAvatar: editWeaponAvatar === "없음" ? null : editWeaponAvatar,
        weaponEnhance: normalizeIntOption(editWeaponEnhance, 0, 20, 0),
        armorAccSpecialEnhance: normalizeIntOption(editArmorAccSpecialEnhance, 0, 20, 0),
        weaponRefine: normalizeIntOption(editWeaponRefine, 0, 10, 0),
        supportRefine: normalizeIntOption(editSupportRefine, 0, 10, 0),
        updatedAt: serverTimestamp(),
      });
      setEditResult("수정 완료!");
      clearEditDraft();
    } catch (e) {
      console.error(e);
      setEditResult("수정 실패: 콘솔을 확인해주세요.");
    } finally {
      setEditing(false);
    }
  };

  const onPickEditJobClick = () => {
    if (!selectedCrew) return;
    saveEditDraft({
      docId: selectedCrew.docId,
      editCharacterId,
      editJob,
      editEquippedItems,
      editSkillCode,
      editSkillRune,
      editAntimagicPower,
      editCreature,
      editAura,
      editArtifact,
      editTitle,
      editAvatar,
      editWeaponAvatar,
      editWeaponEnhance,
      editArmorAccSpecialEnhance,
      editWeaponRefine,
      editSupportRefine,
    });
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    navigate("/pick/job", { state: { returnTo, applyTo: "edit", docId: selectedCrew.docId } });
  };

  const dndDisabled = editing || reorderSaving || !reorderMode;

  const onDragStartCrew = (docId: string, e: React.DragEvent<HTMLDivElement>) => {
    if (dndDisabled) return;
    setDraggingCrewDocId(docId);
    setDragOverCrewDocId(null);
    setReorderResult(null);
    try {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", docId);
    } catch {
      // ignore
    }
  };

  const onDragOverCrew = (docId: string, e: React.DragEvent<HTMLDivElement>) => {
    if (dndDisabled) return;
    if (!draggingCrewDocId) return;
    e.preventDefault();
    setDragOverCrewDocId(docId);
    try {
      e.dataTransfer.dropEffect = "move";
    } catch {
      // ignore
    }
  };

  const onDropCrew = async (docId: string, e: React.DragEvent<HTMLDivElement>) => {
    if (dndDisabled) return;
    e.preventDefault();
    const fromId = draggingCrewDocId;
    const toId = docId;
    if (!fromId || !toId || fromId === toId) {
      setDraggingCrewDocId(null);
      setDragOverCrewDocId(null);
      return;
    }

    const fromIndex = crew.findIndex((c) => c.docId === fromId);
    const toIndex = crew.findIndex((c) => c.docId === toId);
    if (fromIndex < 0 || toIndex < 0) {
      setDraggingCrewDocId(null);
      setDragOverCrewDocId(null);
      return;
    }

    const next = [...crew];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const nextWithOrder = next.map((c, idx) => ({ ...c, order: idx }));
    setCrew(nextWithOrder);

    setReorderDirty(true);
    setDraggingCrewDocId(null);
    setDragOverCrewDocId(null);
  };

  const onDragEndCrew = () => {
    setDraggingCrewDocId(null);
    setDragOverCrewDocId(null);
  };

  return (
    <div className="flex flex-1 flex-col px-3 py-6">
      <div className="mx-auto w-full max-w-4xl space-y-3">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">기록</h1>
        <p className="text-xs text-slate-400 sm:text-sm">
          {user ? "나중에 캐릭터 성장 기록 기능을 추가할 예정입니다." : "로그인이 필요합니다."}
        </p>

        {user ? (
          <div className="space-y-3">
            {dataError ? <div className="text-xs text-red-300">{dataError}</div> : null}

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">내 캐릭터</div>
                <div className="flex items-center gap-2">
                  {reorderMode ? (
                    <button
                      type="button"
                      onClick={() => void onFinishReorderMode()}
                      disabled={reorderSaving}
                      className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-200 hover:border-indigo-500/70 disabled:opacity-60"
                    >
                      {reorderSaving ? "저장 중..." : "변경 완료"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onStartReorderMode}
                      disabled={editing || reorderSaving || crewLoading || crew.length === 0}
                      className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-200 hover:border-indigo-500/70 disabled:opacity-60"
                    >
                      순서 변경
                    </button>
                  )}
                  <Link
                    to="/record/create"
                    className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-200 hover:border-indigo-500/70"
                  >
                    캐릭터 생성
                  </Link>
                </div>
              </div>

              {reorderResult ? <div className="text-xs text-slate-300">{reorderResult}</div> : null}

              {ignoredCrewCount > 0 ? (
                <div className="text-[0.7rem] text-slate-500">
                  캐릭터 형식이 아닌 데이터 {ignoredCrewCount}개는 숨김 처리했습니다.
                </div>
              ) : null}
              {crewLoading ? (
                <div className="text-xs text-slate-300">불러오는 중...</div>
              ) : crewError ? (
                <div className="text-xs text-red-300">{crewError}</div>
              ) : crew.length === 0 ? (
                <div className="text-xs text-slate-300">
                  아직 생성한 캐릭터가 없습니다. 오른쪽 버튼으로 생성해주세요.
                </div>
              ) : (
                <div ref={crewListRef} className="space-y-2">
                  {crew.map((c) => (
                    <div
                      key={c.docId}
                      role="button"
                      tabIndex={0}
                      draggable={!dndDisabled}
                      onDragStart={(e) => onDragStartCrew(c.docId, e)}
                      onDragOver={(e) => onDragOverCrew(c.docId, e)}
                      onDrop={(e) => void onDropCrew(c.docId, e)}
                      onDragEnd={onDragEndCrew}
                      onClick={() => {
                        if (reorderMode) return;
                        onSelectCrew(c);
                      }}
                      onDoubleClick={(e) => {
                        if (reorderMode) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedCrew(null);
                        setEditResult(null);
                      }}
                      onKeyDown={(e) => {
                        if (reorderMode) return;
                        if (e.key === "Enter" || e.key === " ") onSelectCrew(c);
                      }}
                      className={`rounded-xl border bg-slate-950/40 px-3 py-2 hover:border-indigo-500/70 ${
                        dragOverCrewDocId === c.docId ? "border-indigo-400" : "border-slate-800"
                      } ${draggingCrewDocId === c.docId ? "opacity-70" : ""} ${reorderMode ? "select-none cursor-grab" : "cursor-pointer"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {reorderMode ? (
                            <div
                              className="text-slate-500"
                              aria-hidden="true"
                              title="드래그해서 순서를 변경하세요"
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M5 7H19M5 12H19M5 17H19"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </div>
                          ) : null}
                          {getJobImageSrc(c.job) ? (
                            <img
                              src={getJobImageSrc(c.job)!}
                              alt={c.job}
                              className="h-9 w-9 rounded-full border border-slate-800 bg-slate-950/40 object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full border border-slate-800 bg-slate-950/40" />
                          )}
                          <div className="text-sm text-slate-100">{c.id}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-slate-400">{c.job}</div>
                        </div>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.7rem] text-slate-400">
                        <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">
                          강화 {c.weaponEnhance}/{c.armorAccSpecialEnhance}
                        </span>
                        <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">
                          연마  {c.weaponRefine}/{c.supportRefine}
                        </span>
                        <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">크리처 {displayGrade(c.creature)}</span>
                        <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">오라 {displayGrade(c.aura)}</span>
                        <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">아티팩트 {displayGrade(c.artifact)}</span>
                        <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">칭호 {displayGrade(c.title)}</span>
                        <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">아바타 {displayGrade(c.avatar)}</span>
                        <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">무기아바타 {displayGrade(c.weaponAvatar)}</span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {(() => {
                          const MIN_SLOTS = 12;
                          const equipped = Array.isArray(c.equippedItems) ? c.equippedItems : [];
                          const entries = equipped
                            .map((rawName, idx) => {
                              const name = String(rawName ?? "").trim();
                              if (!name) return null;
                              const src = getEquippedIconSrc(name);
                              const isWeapon = !!src && src.startsWith("/images/weapon/");
                              return { name, idx, src, isWeapon };
                            })
                            .filter(Boolean) as Array<{ name: string; idx: number; src: string | null; isWeapon: boolean }>;

                          entries.sort((a, b) => {
                            if (a.isWeapon !== b.isWeapon) return a.isWeapon ? -1 : 1;
                            return a.idx - b.idx;
                          });

                          const slotCount = Math.max(MIN_SLOTS, entries.length);
                          return Array.from({ length: slotCount }, (_, i) => {
                            const entry = entries[i] ?? null;
                            const key = `${c.docId}-equip-slot-${i}`;
                            if (!entry) {
                              return (
                                <div
                                  key={key}
                                  className="h-7 w-7 rounded border border-slate-800 bg-slate-950/40"
                                  aria-hidden="true"
                                />
                              );
                            }

                            if (entry.src) {
                              return (
                                <img
                                  key={key}
                                  src={entry.src}
                                  alt={entry.name}
                                  title={entry.name}
                                  className="h-7 w-7 rounded border border-slate-800 bg-slate-950/40 object-contain"
                                  loading="lazy"
                                  decoding="async"
                                />
                              );
                            }

                            return (
                              <div
                                key={key}
                                title={entry.name}
                                className="h-7 w-7 rounded border border-slate-800 bg-slate-950/40"
                              />
                            );
                          });
                        })()}
                      </div>

                      {(() => {
                        const latest = latestDamageByCrewDocId[c.docId];
                        if (!latest) return null;
                        const text = formatDamageToEokText(latest.damage);
                        if (!text) return null;
                        return (
                          <div className="mt-1 flex justify-end text-xs text-slate-400">
                            최근 데미지: <span className="ml-1 text-slate-200">{text}</span>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedCrew ? (
              <div ref={editPanelRef} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">캐릭터 수정</div>
                  <button
                    onClick={() => setSelectedCrew(null)}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-200 hover:border-indigo-500/70"
                    disabled={editing}
                  >
                    닫기
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-slate-400">아이디 (필수)</div>
                  <input
                    value={editCharacterId}
                    onChange={(e) => setEditCharacterId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500"
                    disabled={editing}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-slate-400">직업 (필수)</div>
                  <button
                    type="button"
                    onClick={onPickEditJobClick}
                    disabled={editing}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-left text-sm text-slate-100 hover:border-indigo-500/70 disabled:opacity-60"
                  >
                    {editJob ? editJob : "직업을 선택하세요"}
                  </button>
                  {editJob && getJobImageSrc(editJob) ? (
                    <div className="flex items-center gap-2 pt-1">
                      <img
                        src={getJobImageSrc(editJob)!}
                        alt={editJob}
                        className="h-10 w-10 rounded-full border border-slate-800 bg-slate-950/40 object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="text-xs text-slate-300">{editJob}</div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-slate-400">장착중인 아이템 </div>
                  <EquipmentPicker
                    job={editJob}
                    value={editEquippedItems}
                    onChange={setEditEquippedItems}
                    disabled={editing}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400">항마력</div>
                    <input
                      value={editAntimagicPower}
                      onChange={(e) => setEditAntimagicPower(e.target.value)}
                      inputMode="numeric"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                      disabled={editing}
                    />
                  </div>
                  <div className="space-y-2">
                  <div className="text-xs text-slate-400">스킬룬 </div>
                    <input
                      value={editSkillRune}
                      onChange={(e) => setEditSkillRune(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                      disabled={editing}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400">무기 강화</div>
                    <select
                      value={String(editWeaponEnhance)}
                      onChange={(e) => setEditWeaponEnhance(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                      disabled={editing}
                    >
                      {ENHANCE_LEVEL_OPTIONS.map((lv) => (
                        <option key={lv} value={lv}>
                          {lv}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400">방어구/악세사리/특수장비 강화</div>
                    <select
                      value={String(editArmorAccSpecialEnhance)}
                      onChange={(e) => setEditArmorAccSpecialEnhance(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                      disabled={editing}
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
                      value={String(editWeaponRefine)}
                      onChange={(e) => setEditWeaponRefine(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                      disabled={editing}
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
                      value={String(editSupportRefine)}
                      onChange={(e) => setEditSupportRefine(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                      disabled={editing}
                    >
                      {REFINE_LEVEL_OPTIONS.map((lv) => (
                        <option key={lv} value={lv}>
                          {lv}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400">크리처 </div>
                      <select
                        value={editCreature}
                        onChange={(e) => setEditCreature(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                        disabled={editing}
                      >
                        {FINISH_GRADE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400">오라 </div>
                      <select
                        value={editAura}
                        onChange={(e) => setEditAura(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                        disabled={editing}
                      >
                        {FINISH_GRADE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400">아티팩트 </div>
                      <select
                        value={editArtifact}
                        onChange={(e) => setEditArtifact(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                        disabled={editing}
                      >
                        {FINISH_GRADE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400">칭호 </div>
                      <select
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                        disabled={editing}
                      >
                        {FINISH_GRADE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400">아바타 </div>
                      <select
                        value={editAvatar}
                        onChange={(e) => setEditAvatar(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                        disabled={editing}
                      >
                        {AVATAR_GRADE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400">무기아바타 </div>
                    <select
                      value={editWeaponAvatar}
                      onChange={(e) => setEditWeaponAvatar(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                      disabled={editing}
                    >
                      {FINISH_GRADE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={onUpdateCrew}
                  disabled={editing}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:border-indigo-500/70 disabled:opacity-60"
                >
                  {editing ? "저장 중..." : "저장"}
                </button>

                {editResult ? <div className="text-xs text-slate-300">{editResult}</div> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
