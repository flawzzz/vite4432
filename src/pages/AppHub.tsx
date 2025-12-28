import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../lib/firebase";

export default function AppHub() {
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => setUser(nextUser));
    return () => unsub();
  }, []);

  return (
    <div className="flex flex-1 flex-col px-3 py-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dunmoa App</h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              던모아에서 제공하는 기능들을 한곳에 모았습니다.
            </p>
          </div>

        </header>

        <section className="space-y-3">
          <div className="px-1 text-xs font-semibold text-slate-300">모아보기</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/character"
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 hover:border-indigo-500/70 hover:bg-slate-900"
            >
              <h2 className="text-sm font-semibold">캐릭터 고유 효과</h2>
              <p className="mt-1 text-xs text-slate-400">
                직업별 고유 효과와 수치를 확인합니다.
              </p>
            </Link>
            <Link
              to="/set"
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 hover:border-indigo-500/70 hover:bg-slate-900"
            >
              <h2 className="text-sm font-semibold">아이템 세트 효과</h2>
              <p className="mt-1 text-xs text-slate-400">
                세트 장비의 효과와 조합을 비교합니다.
              </p>
            </Link>
            <Link
              to="/weapon"
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 hover:border-indigo-500/70 hover:bg-slate-900"
            >
              <h2 className="text-sm font-semibold">무기 정보</h2>
              <p className="mt-1 text-xs text-slate-400">
                직업별 추천 무기와 옵션을 살펴봅니다.
              </p>
            </Link>
            <Link
              to="/item"
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 hover:border-indigo-500/70 hover:bg-slate-900"
            >
              <h2 className="text-sm font-semibold">아이템 정보</h2>
              <p className="mt-1 text-xs text-slate-400">
                세트 효과 기준으로 아이템을 모아봅니다.
              </p>
            </Link>
          </div>
        </section>
        <section className="space-y-3">
          <div className="px-1 text-xs font-semibold text-slate-300">기록</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/record"
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 hover:border-indigo-500/70 hover:bg-slate-900"
            >
              <h2 className="text-sm font-semibold">모험단</h2>
              <p className="mt-1 text-xs text-slate-400">
                육성 중인 캐릭터의 기록을 관리합니다.
              </p>
            </Link>
            <Link
              to="/record/damage"
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 hover:border-indigo-500/70 hover:bg-slate-900"
            >
              <h2 className="text-sm font-semibold">수련장</h2>
              <p className="mt-1 text-xs text-slate-400">
                데미지와 캐릭터를 매칭해서 저장합니다.
              </p>
            </Link>
          </div>
        </section>
        <section className="space-y-3">
          <div className="px-1 text-xs font-semibold text-slate-300">시뮬레이터</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/effect_simulator"
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 hover:border-indigo-500/70 hover:bg-slate-900"
            >
              <h2 className="text-sm font-semibold">아이템 시뮬레이터</h2>
              <p className="mt-1 text-xs text-slate-400">
                장비 세팅을 구성하고 옵션을 미리 계산해 봅니다.
              </p>
            </Link>
            <Link
              to="/refine_simulator"
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 hover:border-indigo-500/70 hover:bg-slate-900"
            >
              <h2 className="text-sm font-semibold">연마 시뮬레이터</h2>
              <p className="mt-1 text-xs text-slate-400">
                가상 연마 시뮬레이션 기능을 추가할 예정입니다.
              </p>
            </Link>
            <Link
              to="/damage_simulator"  
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 hover:border-indigo-500/70 hover:bg-slate-900"
            >
              <h2 className="text-sm font-semibold">데미지 시뮬레이터(준비 중)</h2>
              <p className="mt-1 text-xs text-slate-400">
                스킬과 장비 조합에 따른 예상 데미지를 확인합니다.
              </p>
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <div className="px-1 text-xs font-semibold text-slate-300">기타</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/about"
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 hover:border-indigo-500/70 hover:bg-slate-900"
            >
              <h2 className="text-sm font-semibold">About / 기타</h2>
              <p className="mt-1 text-xs text-slate-400">
                서비스 소개와 기타 정보를 확인합니다.
              </p>
            </Link>

            <Link
              to={user ? "/logout" : "/login"}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 hover:border-indigo-500/70 hover:bg-slate-900"
            >
              <h2 className="text-sm font-semibold">{user ? "로그아웃" : "로그인"}</h2>
              <p className="mt-1 text-xs text-slate-400">{user ? "현재 계정에서 로그아웃합니다." : "로그인 페이지로 이동합니다."}</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
