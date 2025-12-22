import { useState } from "react";

export default function Home() {
    const [query, setQuery] = useState("");

    const handleSubmit = (e : React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        // 실제 검색은 향후 구현
        console.log("search:", query.trim());
    };

    return (
        <div className="flex flex-1 items-center justify-center px-4">
            <div className="w-full max-w-xl space-y-6 text-center">
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                        던모아 - 던파모바일 모아보기
                    </h1>
                    <p className="text-xs text-slate-400 sm:text-sm">
                        캐릭터, 세트 아이템, 무기, 옵션을 한 번에 찾아보세요.
                        </p>
                </div>
                        <div className="flex flex-1 flex-col">
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="relative">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 pr-12 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                            placeholder="예) 어느 말괄량이, 인챈트리스, 버블 반바지..."
                        />
                    </div>
                </form>
            </div>
        </div>
    );
}