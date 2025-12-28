import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

type JobData = {
  job: string;
  image?: string;
  group?: string;
};

type PickerState = {
  returnTo?: string;
  applyTo?: "create" | "edit" | "simulator";
  docId?: string;
};

export default function JobPickerPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state as PickerState | null) ?? null;
  const returnTo = typeof state?.returnTo === "string" && state.returnTo.length > 0 ? state.returnTo : "/record";
  const applyTo = state?.applyTo ?? "create";
  const docId = typeof state?.docId === "string" && state.docId.length > 0 ? state.docId : null;

  const [jobs, setJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/data/character.json");
        if (!res.ok) throw new Error(`character.json 로딩 실패 (${res.status})`);
        const json = (await res.json()) as unknown;
        const list = Array.isArray(json) ? (json as JobData[]) : [];
        const normalized = list
          .filter((j) => typeof j?.job === "string" && j.job.length > 0)
          .map((j) => ({
            job: j.job,
            group: typeof j.group === "string" ? j.group : "기타",
            image: typeof j.image === "string" ? j.image : undefined,
          }));

        if (cancelled) return;
        setJobs(normalized);
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setError("직업 데이터를 불러오지 못했습니다. 콘솔을 확인해주세요.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, JobData[]>();
    for (const j of jobs) {
      const key = j.group ?? "기타";
      const arr = map.get(key) ?? [];
      arr.push(j);
      map.set(key, arr);
    }

    const groups = Array.from(map.entries())
      .map(([group, list]) => {
        list.sort((a, b) => a.job.localeCompare(b.job, "ko"));
        return { group, list };
      })
      .sort((a, b) => a.group.localeCompare(b.group, "ko"));

    return groups;
  }, [jobs]);

  const onPick = (job: JobData) => {
    navigate(returnTo, {
      state: {
        pickerResult: {
          kind: "job",
          job: job.job,
          applyTo,
          docId: applyTo === "edit" ? docId : null,
        },
      },
    });
  };

  const getImageSrc = (image?: string) => {
    if (!image) return null;
    return `/images/character/${image}.PNG`;
  };

  return (
    <div className="flex flex-1 flex-col px-3 py-6">
      <div className="mx-auto w-full max-w-4xl space-y-3">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">직업 선택</h1>
            <p className="text-xs text-slate-400 sm:text-sm">직업군별로 묶어서 보여줍니다.</p>
          </div>
          <Link
            to={returnTo}
            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-200 hover:border-indigo-500/70"
          >
            돌아가기
          </Link>
        </header>

        {loading ? <div className="text-xs text-slate-300">불러오는 중...</div> : null}
        {error ? <div className="text-xs text-red-300">{error}</div> : null}

        <div className="space-y-4">
          {grouped.map(({ group, list }) => (
            <section key={group} className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">{group}</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((j) => {
                  const src = getImageSrc(j.image);
                  return (
                    <button
                      key={j.job}
                      type="button"
                      onClick={() => onPick(j)}
                      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-left hover:border-indigo-500/70"
                    >
                      {src ? (
                        <img
                          src={src}
                          alt={j.job}
                          className="h-10 w-10 rounded-full border border-slate-800 bg-slate-950/40 object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full border border-slate-800 bg-slate-950/40" />
                      )}
                      <div className="flex flex-col">
                        <div className="text-sm font-semibold text-slate-100">{j.job}</div>
                        <div className="text-[0.7rem] text-slate-400">선택</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
