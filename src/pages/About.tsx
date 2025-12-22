export default function About() {
    return (
        <div className="flex flex-1 flex-col px-4 py-10">
            <main className="mx-auto flex w-full max-w-3xl flex-col items-center space-y-4 text-center">
                <div className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-300 ring-1 ring-slate-700">
                    About Dunmoa
                </div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    던파모바일 정보를
                    <span className="block text-base font-normal text-slate-300 sm:text-lg">
                        한 곳에 모아보고, 비교하고, 실험하는 공간
                    </span>
                </h1>
                <p className="max-w-xl text-xs text-slate-400 sm:text-sm">
                    Dunmoa는 던파모바일 플레이어들이 세트 아이템, 무기, 고유 효과 정보를
                    더 빠르고 가볍게 확인할 수 있도록 만든 팬메이드 도구입니다.
                    통합 검색과 시뮬레이터를 통해 세팅 고민을 줄이고 플레이에 집중할 수 있도록 돕습니다.
                </p>
            </main>
        </div>
    );
}
