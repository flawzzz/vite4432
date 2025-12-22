import { Link } from "react-router-dom";

export default function Guide() {
  return (
    <div className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Guide</h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              던파모바일과 던모아를 함께 이해할 수 있는 가이드입니다.
            </p>
          </div>
          <Link
            to="/"
            className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-[0.7rem] text-slate-300 hover:border-indigo-400 hover:text-indigo-200"
          >
            홈으로
          </Link>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 던파모바일 가이드 */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-sm font-semibold">던파모바일 가이드</h2>
            <p className="mt-2 text-xs text-slate-400">
              게임 내에서 유용한 기본 정보와 세팅 방향성을 정리한 영역입니다.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
              <li>- 직업별 기본 역할과 스탯 이해</li>
              <li>- 세트 장비 파밍 동선과 우선순위</li>
              <li>- 무기 선택 기준 (속성, 타입, 옵션)</li>
              <li>- 시즌3 ACT.1 기준 메타 개괄</li>
            </ul>
          </section>

          {/* 던모아 가이드 */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-sm font-semibold">던모아 가이드</h2>
            <p className="mt-2 text-xs text-slate-400">
              던모아에서 제공하는 페이지와 도구를 어떻게 활용하면 좋은지 정리한 영역입니다.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
              <li>- 통합 검색으로 원하는 정보 빠르게 찾기</li>
              <li>- 캐릭터 고유 효과 / 세트 효과 / 무기 페이지 활용법</li>
              <li>- 아이템 시뮬레이터로 세팅 초안 만들기</li>
              <li>- 데미지 시뮬레이터로 세팅 간 효율 비교하기</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
