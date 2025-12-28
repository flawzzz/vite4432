import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  deleteDoc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { useLocation, useNavigate } from "react-router-dom";

import { auth, db } from "../lib/firebase";

type JobData = {
  job: string;
  image?: string;
  group?: string;
};

type CrewLite = {
  docId: string;
  id: string;
  job: string;
  order: number;
};

type CrewSnapshot = {
  id: string;
  job: string;
  equippedItems: string[] | null;
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

type DamageRecord = {
  docId: string;
  damage: number;
  crewDocId: string;
  crewId: string;
  crewJob: string;
  crewSnapshot: CrewSnapshot | null;
  memo: string | null;
  createdAt?: unknown;
};

export default function TrainingDamagePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const MEMO_MAX_LEN = 30;
  const EOK = 100_000_000;

  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);

  const [jobs, setJobs] = useState<JobData[]>([]);
  const [equipIconByName, setEquipIconByName] = useState<Record<string, string>>({});

  const [crewLoading, setCrewLoading] = useState(false);
  const [crewError, setCrewError] = useState<string | null>(null);
  const [crew, setCrew] = useState<CrewLite[]>([]);

  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [records, setRecords] = useState<DamageRecord[]>([]);

  const [filterCrewDocId, setFilterCrewDocId] = useState<string>("");

  const [openRecordId, setOpenRecordId] = useState<string | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  const [selectedCrewDocId, setSelectedCrewDocId] = useState<string>("");
  const [damageInput, setDamageInput] = useState<string>("");
  const [memoInput, setMemoInput] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [jobRes, itemRes, weaponRes] = await Promise.all([
          fetch("/data/character.json"),
          fetch("/data/item.json"),
          fetch("/data/weapon.json"),
        ]);
        if (!jobRes.ok) return;
        if (!itemRes.ok) return;
        if (!weaponRes.ok) return;

        const jobsJson = (await jobRes.json()) as unknown;
        const itemsJson = (await itemRes.json()) as unknown;
        const weaponsJson = (await weaponRes.json()) as unknown;

        const next = Array.isArray(jobsJson) ? (jobsJson as JobData[]) : [];

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
        setJobs(next.filter((j) => typeof j?.job === "string" && j.job.length > 0));
        setEquipIconByName(iconIndex);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getEquippedIconSrc = (name: string): string | null => {
    const key = String(name ?? "").trim();
    if (!key) return null;
    return equipIconByName[key] ?? null;
  };

  const getJobImageSrc = (jobName: string): string | null => {
    const found = jobs.find((j) => j.job === jobName);
    if (!found?.image) return null;
    return `/images/character/${found.image}.PNG`;
  };

  const formatCreatedAt = (value: unknown): string | null => {
    if (!value) return null;
    const maybeToDate = (value as any)?.toDate;
    if (typeof maybeToDate === "function") {
      const d = maybeToDate.call(value) as unknown;
      if (d instanceof Date && Number.isFinite(d.getTime())) {
        return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(d);
      }
    }
    if (value instanceof Date && Number.isFinite(value.getTime())) {
      return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(value);
    }
    return null;
  };

  const parseEokInputToDamage = (raw: string): number | null => {
    const trimmed = raw.replace(/,/g, "").trim();
    if (!trimmed) return null;
    // 억 단위 입력: 정수 또는 소숫점 최대 7자리까지 허용
    // 예) 1     -> 1억
    //     1.2   -> 1억 2천만
    //     1.02  -> 1억 2백만
    //     1.003 -> 1억 3십만
    //     4123.321 -> 4123억 3천만 2백만 1십만
    //     1.0000001 -> 1억 + 10 (최소 단위 10)
    if (!/^\d+(?:\.\d{1,7})?$/.test(trimmed)) return null;
    const [wholeRaw, fracRaw] = trimmed.split(".");
    const whole = Number(wholeRaw);
    if (!Number.isFinite(whole) || whole < 0) return null;
    const fracPadded = (fracRaw ?? "").padEnd(7, "0");
    const fracTenMillionths = fracPadded.length > 0 ? Number(fracPadded) : 0;
    if (!Number.isFinite(fracTenMillionths) || fracTenMillionths < 0 || fracTenMillionths > 9_999_999) return null;
    const damage = whole * EOK + fracTenMillionths * (EOK / 10_000_000);
    if (!Number.isFinite(damage)) return null;
    return damage;
  };

  const formatDamageEok = (damage: number): string => {
    const eok = damage / EOK;
    const eokInt = Number.isFinite(eok) ? Math.trunc(eok) : 0;
    const nf = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
    return `${nf.format(eokInt)} 億`;
  };

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
    if (!user) {
      setCrew([]);
      setCrewLoading(false);
      setCrewError(null);
      setFilterCrewDocId("");
      return;
    }

    setCrewLoading(true);
    setCrewError(null);

    const ref = collection(db, "users", user.uid, "crew");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const parsed = snap.docs
          .map((d, idx) => {
            const data = d.data() as Record<string, unknown>;
            const id = typeof data.id === "string" ? data.id.trim() : "";
            const job = typeof data.job === "string" ? data.job.trim() : "";
            const rawOrder = (data as any).order;
            const order = typeof rawOrder === "number" && Number.isFinite(rawOrder) ? rawOrder : idx;
            return { docId: d.id, id, job, order } satisfies CrewLite;
          })
          .filter((c) => c.id.length > 0 && c.job.length > 0);

        parsed.sort((a, b) => a.order - b.order);

        setCrew(parsed);
        setCrewLoading(false);

        // keep selection valid
        if (parsed.length > 0 && selectedCrewDocId && !parsed.some((c) => c.docId === selectedCrewDocId)) {
          setSelectedCrewDocId("");
        }

        // keep filter valid
        if (filterCrewDocId && !parsed.some((c) => c.docId === filterCrewDocId)) {
          setFilterCrewDocId("");
        }
      },
      (err) => {
        console.error(err);
        setCrewError(err?.message ?? "캐릭터 목록을 불러오지 못했습니다.");
        setCrewLoading(false);
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const visibleRecords = useMemo(() => {
    if (!filterCrewDocId) return records;
    return records.filter((r) => r.crewDocId === filterCrewDocId);
  }, [records, filterCrewDocId]);

  useEffect(() => {
    // If current filter hides the opened record, close it.
    if (!openRecordId) return;
    if (visibleRecords.some((r) => r.docId === openRecordId)) return;
    setOpenRecordId(null);
  }, [openRecordId, visibleRecords]);

  useEffect(() => {
    if (!user) {
      setRecords([]);
      setRecordsLoading(false);
      setRecordsError(null);
      return;
    }

    setRecordsLoading(true);
    setRecordsError(null);

    const ref = collection(db, "users", user.uid, "records");
    const q = query(ref, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const parsed = snap.docs
          .map((d) => {
            const data = d.data() as Record<string, unknown>;
            const damageRaw = data.damage;
            const damage = typeof damageRaw === "number" && Number.isFinite(damageRaw) ? damageRaw : 0;
            const crewDocId = typeof data.crewDocId === "string" ? data.crewDocId : "";
            const crewId = typeof data.crewId === "string" ? data.crewId : "";
            const crewJob = typeof data.crewJob === "string" ? data.crewJob : "";
            const memoRaw = data.memo;
            const memo = typeof memoRaw === "string" && memoRaw.trim().length > 0 ? memoRaw : null;

            const snapshotRaw = data.crewSnapshot;
            const crewSnapshot = (() => {
              if (!snapshotRaw || typeof snapshotRaw !== "object") return null;
              const s = snapshotRaw as Record<string, unknown>;
              const id = typeof s.id === "string" ? s.id : "";
              const job = typeof s.job === "string" ? s.job : "";
              if (!id || !job) return null;
              const equippedItems = Array.isArray(s.equippedItems)
                ? (s.equippedItems.filter((x) => typeof x === "string") as string[])
                : null;
              const skillRune = typeof (s as any).skillRune === "string" ? ((s as any).skillRune as string) : null;
              const antimagicPower = (() => {
                const raw = (s as any).antimagicPower;
                if (typeof raw === "number" && Number.isFinite(raw)) return raw;
                if (typeof raw === "string" && raw.trim().length > 0) {
                  const parsed = Number(raw.replaceAll(",", ""));
                  return Number.isFinite(parsed) ? parsed : null;
                }
                return null;
              })();
              const creature = typeof s.creature === "string" ? s.creature : null;
              const aura = typeof s.aura === "string" ? s.aura : null;
              const artifact = typeof s.artifact === "string" ? s.artifact : null;
              const title = typeof s.title === "string" ? s.title : null;
              const avatar = typeof s.avatar === "string" ? s.avatar : null;
              const weaponAvatar = typeof (s as any).weaponAvatar === "string" ? ((s as any).weaponAvatar as string) : null;
              const weaponEnhance = normalizeIntOption((s as any).weaponEnhance, 0, 20, 0);
              const armorAccSpecialEnhance = normalizeIntOption((s as any).armorAccSpecialEnhance, 0, 20, 0);
              const weaponRefine = normalizeIntOption((s as any).weaponRefine, 0, 10, 0);
              const supportRefine = normalizeIntOption((s as any).supportRefine, 0, 10, 0);
              return {
                id,
                job,
                equippedItems,
                skillRune,
                antimagicPower,
                creature,
                aura,
                artifact,
                title,
                avatar,
                weaponAvatar,
                weaponEnhance,
                armorAccSpecialEnhance,
                weaponRefine,
                supportRefine,
              } satisfies CrewSnapshot;
            })();

            return {
              docId: d.id,
              damage,
              crewDocId,
              crewId,
              crewJob,
              crewSnapshot,
              memo,
              createdAt: data.createdAt,
            } satisfies DamageRecord;
          })
          .filter((r) => r.damage > 0 && r.crewId.length > 0 && r.crewJob.length > 0);

        setRecords(parsed);
        setRecordsLoading(false);
      },
      (err) => {
        console.error(err);
        setRecordsError(err?.message ?? "데미지 기록을 불러오지 못했습니다.");
        setRecordsLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const selectedCrew = useMemo(() => {
    if (!selectedCrewDocId) return null;
    return crew.find((c) => c.docId === selectedCrewDocId) ?? null;
  }, [crew, selectedCrewDocId]);

  const onSave = async () => {
    if (!user) return;
    if (saving) return;

    setResult(null);

    const damage = parseEokInputToDamage(damageInput);
    if (!damage || !Number.isFinite(damage) || damage <= 0) {
      setResult("데미지를 억 단위로 입력해주세요. (예: 1 / 1.2 / 1.02 / 1.003 / 1.0000001)");
      return;
    }
    if (!selectedCrew) {
      setResult("캐릭터를 선택해주세요.");
      return;
    }

    setSaving(true);
    try {
      // Option A: snapshot current crew state into the record so history stays stable.
      let crewSnapshot: CrewSnapshot | null = null;
      try {
        const crewRef = doc(db, "users", user.uid, "crew", selectedCrew.docId);
        const crewSnap = await getDoc(crewRef);
        if (crewSnap.exists()) {
          const data = crewSnap.data() as Record<string, unknown>;
          const id = typeof data.id === "string" ? data.id.trim() : "";
          const job = typeof data.job === "string" ? data.job.trim() : "";
          if (id && job) {
            const equippedItems = Array.isArray(data.equippedItems)
              ? (data.equippedItems.filter((x) => typeof x === "string") as string[])
              : null;
            crewSnapshot = {
              id,
              job,
              equippedItems,
              skillRune: typeof (data as any).skillRune === "string" ? ((data as any).skillRune as string) : null,
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
            };
          }
        }
      } catch {
        crewSnapshot = null;
      }

      await addDoc(collection(db, "users", user.uid, "records"), {
        damage,
        crewDocId: selectedCrew.docId,
        crewId: selectedCrew.id,
        crewJob: selectedCrew.job,
        crewSnapshot,
        memo: (memoInput.trim().slice(0, MEMO_MAX_LEN) || null),
        createdAt: serverTimestamp(),
      });

      setDamageInput("");
      setMemoInput("");
      setResult("저장 완료!");
    } catch (e) {
      console.error(e);
      setResult("저장 실패: 콘솔을 확인해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteRecord = async (recordId: string) => {
    if (!user) return;
    if (!recordId) return;
    if (deletingRecordId) return;

    const ok = window.confirm("이 기록을 삭제할까요?\n삭제하면 복구할 수 없습니다.");
    if (!ok) return;

    setDeletingRecordId(recordId);
    try {
      await deleteDoc(doc(db, "users", user.uid, "records", recordId));
      setOpenRecordId((prev) => (prev === recordId ? null : prev));
    } catch (e) {
      console.error(e);
      window.alert("삭제 실패: 콘솔을 확인해주세요.");
    } finally {
      setDeletingRecordId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col px-3 py-6">
      <div className="mx-auto w-full max-w-4xl space-y-3">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">수련장 데미지 기록</h1>
            <p className="text-xs text-slate-400 sm:text-sm">누골 데미지와 캐릭터를 매칭해서 저장합니다.</p>
          </div>
        </header>

        {user ? (
          <>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-xs text-slate-400">캐릭터 선택</div>
                  <select
                    value={selectedCrewDocId}
                    onChange={(e) => setSelectedCrewDocId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100"
                    disabled={crewLoading || saving}
                  >
                    <option value="">캐릭터를 선택하세요</option>
                    {crew.map((c) => (
                      <option key={c.docId} value={c.docId}>
                        {c.id} / {c.job}
                      </option>
                    ))}
                  </select>
                  {crewLoading ? <div className="text-xs text-slate-400">캐릭터 불러오는 중...</div> : null}
                  {crewError ? <div className="text-xs text-red-300">{crewError}</div> : null}
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-slate-400">데미지 입력</div>
                  <input
                    value={damageInput}
                    onChange={(e) => setDamageInput(e.target.value)}
                    inputMode="decimal"
                    placeholder="예: 1 또는 1.2 또는 4123.321"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500"
                    disabled={saving}
                  />
                  <div className="text-[0.7rem] text-slate-500">억 단위로 입력하세요. 소숫점은 7자리까지 가능합니다. (예: 12.3 / 12.03 / 12.003 / 12.0000001)</div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <div className="text-xs text-slate-400">메모 (선택)</div>
                  <textarea
                    value={memoInput}
                    onChange={(e) => setMemoInput(e.target.value)}
                    rows={3}
                    maxLength={MEMO_MAX_LEN}
                    placeholder="예: 버프/세팅/조건 등을 메모해두세요"
                    className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500"
                    disabled={saving}
                  />
                  <div className="text-[0.7rem] text-slate-500">{memoInput.length}/{MEMO_MAX_LEN}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-200 hover:border-indigo-500/70 disabled:opacity-60"
              >
                {saving ? "저장 중..." : "저장"}
              </button>

              {result ? <div className="text-xs text-slate-300">{result}</div> : null}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">기록</div>
                <select
                  value={filterCrewDocId}
                  onChange={(e) => setFilterCrewDocId(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100"
                  disabled={recordsLoading}
                >
                  <option value="">전체</option>
                  {crew.map((c) => (
                    <option key={c.docId} value={c.docId}>
                      {c.id} / {c.job}
                    </option>
                  ))}
                </select>
              </div>
              {recordsLoading ? (
                <div className="text-xs text-slate-300">불러오는 중...</div>
              ) : recordsError ? (
                <div className="text-xs text-red-300">{recordsError}</div>
              ) : visibleRecords.length === 0 ? (
                <div className="text-xs text-slate-300">아직 저장된 기록이 없습니다.</div>
              ) : (
                <div className="space-y-2">
                  {visibleRecords.map((r) => (
                    <div
                      key={r.docId}
                      className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"
                      role="button"
                      tabIndex={0}
                      onClick={() => setOpenRecordId((prev) => (prev === r.docId ? null : r.docId))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setOpenRecordId((prev) => (prev === r.docId ? null : r.docId));
                        }
                      }}
                    >
                      <div className="flex items-stretch justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {getJobImageSrc(r.crewJob) ? (
                              <img
                                src={getJobImageSrc(r.crewJob)!}
                                alt={r.crewJob}
                                className="h-6 w-6 rounded-full border border-slate-800 bg-slate-950/40 object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="h-6 w-6 rounded-full border border-slate-800 bg-slate-950/40" />
                            )}
                            <div className="text-xs text-slate-400">{r.crewId} / {r.crewJob}</div>
                          </div>

                          {r.memo ? <div className="mt-1 text-xs text-slate-300">{r.memo}</div> : null}

                          {openRecordId === r.docId ? (
                            <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                              <div className="text-xs font-semibold text-slate-200">세팅</div>
                              {r.crewSnapshot ? (
                                <div className="mt-2 space-y-1 text-xs text-slate-300">
                                  <div>
                                    <span className="text-slate-400">캐릭터:</span> {r.crewSnapshot.id} / {r.crewSnapshot.job}
                                  </div>

                                  <div className="mt-1 flex flex-wrap items-center gap-1">
                                    {(() => {
                                      const equipped = Array.isArray(r.crewSnapshot.equippedItems) ? r.crewSnapshot.equippedItems : [];
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

                                      if (entries.length === 0) {
                                        return <div className="text-xs text-slate-500">장착 아이템 없음</div>;
                                      }

                                      return entries.map((entry, i) => {
                                        const key = `${r.docId}-snap-equip-${i}`;
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

                                  <div className="mt-2 flex flex-wrap items-center gap-1 text-[0.7rem] text-slate-400">
                                    <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">
                                      강화 {r.crewSnapshot.weaponEnhance}/{r.crewSnapshot.armorAccSpecialEnhance}
                                    </span>
                                    <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">
                                      연마 {r.crewSnapshot.weaponRefine}/{r.crewSnapshot.supportRefine}
                                    </span>
                                    <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">
                                      항마력 {typeof r.crewSnapshot.antimagicPower === "number" ? new Intl.NumberFormat("ko-KR").format(r.crewSnapshot.antimagicPower) : "-"}
                                    </span>
                                    <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">스킬룬 {r.crewSnapshot.skillRune ?? "-"}</span>
                                    <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">크리처 {r.crewSnapshot.creature ?? "-"}</span>
                                    <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">오라 {r.crewSnapshot.aura ?? "-"}</span>
                                    <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">아티팩트 {r.crewSnapshot.artifact ?? "-"}</span>
                                    <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">칭호 {r.crewSnapshot.title ?? "-"}</span>
                                    <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">아바타 {r.crewSnapshot.avatar ?? "-"}</span>
                                    <span className="rounded border border-slate-800 bg-slate-950/40 px-1.5 py-0.5">무기아바타 {r.crewSnapshot.weaponAvatar ?? "-"}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-2 text-xs text-slate-500">이 기록에는 세팅 스냅샷이 없습니다.</div>
                              )}
                            </div>
                          ) : null}

                          <div className="mt-2 flex items-end justify-between gap-2">
                            <div className="text-[0.7rem] text-slate-500">{formatCreatedAt(r.createdAt) ?? ""}</div>
                            {openRecordId === r.docId ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  void onDeleteRecord(r.docId);
                                }}
                                disabled={saving || deletingRecordId === r.docId}
                                className="rounded-lg border border-slate-800 bg-slate-950/40 px-2 py-1 text-xs text-slate-200 hover:border-red-400/70 disabled:opacity-60"
                                title="삭제"
                              >
                                {deletingRecordId === r.docId ? "삭제 중..." : "삭제"}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div
                          className={`flex flex-col items-end ${
                            openRecordId === r.docId ? "self-start" : "self-center"
                          }`}
                        >
                          <div className="text-sm text-slate-100">{formatDamageEok(r.damage)}</div>
                          <div className="text-[0.7rem] text-slate-500">{r.damage.toLocaleString("ko-KR")}</div>
                        </div>
                      </div>
                    </div>
                  ))}   
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-xs text-slate-300">로그인이 필요합니다.</div>
        )}
      </div>
    </div>
  );
}
