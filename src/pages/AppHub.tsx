import { Link } from "react-router-dom";

export default function AppHub() {
  return (
    <div className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dunmoa APP</h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              던모아에서 제공하는 기능들을 한곳에 모았습니다.
            </p>
          </div>
          <Link
            to="/"
            className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-[0.7rem] text-slate-300 hover:border-indigo-400 hover:text-indigo-200"
          >
            홈으로
          </Link>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/character"
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-indigo-500/70 hover:bg-slate-900"
          >
            <h2 className="text-sm font-semibold">캐릭터 고유 효과</h2>
            <p className="mt-1 text-xs text-slate-400">
              직업별 고유 효과와 수치를 확인합니다.
            </p>
          </Link>
          <Link
            to="/set"
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-indigo-500/70 hover:bg-slate-900"
          >
            <h2 className="text-sm font-semibold">아이템 세트 효과</h2>
            <p className="mt-1 text-xs text-slate-400">
              세트 장비의 효과와 조합을 비교합니다.
            </p>
          </Link>
          <Link
            to="/weapon"
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-indigo-500/70 hover:bg-slate-900"
          >
            <h2 className="text-sm font-semibold">무기 정보</h2>
            <p className="mt-1 text-xs text-slate-400">
              직업별 추천 무기와 옵션을 살펴봅니다.
            </p>
          </Link>
          <Link
            to="/effect_simulator"
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-indigo-500/70 hover:bg-slate-900"
          >
            <h2 className="text-sm font-semibold">아이템 시뮬레이터</h2>
            <p className="mt-1 text-xs text-slate-400">
              장비 세팅을 구성하고 옵션을 미리 계산해 봅니다.
            </p>
          </Link>
          <Link
            to="/damage_simulator"
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-indigo-500/70 hover:bg-slate-900"
          >
            <h2 className="text-sm font-semibold">데미지 시뮬레이터</h2>
            <p className="mt-1 text-xs text-slate-400">
              스킬과 장비 조합에 따른 예상 데미지를 확인합니다.
            </p>
          </Link>
          <Link
            to="/about"
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-indigo-500/70 hover:bg-slate-900"
          >
            <h2 className="text-sm font-semibold">About / 기타</h2>
            <p className="mt-1 text-xs text-slate-400">
              서비스 소개와 기타 정보를 확인합니다.
            </p>
          </Link>
        </section>
      </div>
    </div>
  );
}
