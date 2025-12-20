import { Link } from "react-router-dom";

export default function Home() {
    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <nav className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-indigo-600">Dunmoa</h1>
                        던파모바일 모아보기, 던모아
                        <br />
                        시즌3 ACT.1 죽은자의 성
                        <div className="space-x-4 flex items-center">
                            <Link to="/" className="text-gray-700 hover:text-indigo-600 font-medium">Dunmoa </Link>
                            <Link to="/about" className="text-gray-700 hover:text-indigo-600 font-medium">About </Link>
                            <Link to="/privacy" className="text-gray-700 hover:text-indigo-600 font-medium">Privacy </Link>
                            <Link to="/character" className="text-gray-700 hover:text-indigo-600 font-medium">고유 효과 </Link>
                            <Link to="/set" className="text-gray-700 hover:text-indigo-600 font-medium">아이템 세트 효과</Link>
                            <Link to="/weapon" className="text-gray-700 hover:text-indigo-600 font-medium">무기 </Link>
                            <Link to="/effect_simulator" className="text-gray-700 hover:text-indigo-600 font-medium">아이템 시뮬레이터 </Link>
                            <Link to="/damage_simulator" className="text-gray-700 hover:text-indigo-600 font-medium">데미지 시뮬레이터 </Link>
                        </div>
                    </div>
                </nav>
            </div>
        </>
    );
}