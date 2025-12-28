import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.tsx";
import About from "./pages/About.tsx";
import Character from './pages/Character.tsx';
import Item from './pages/Item.tsx';
import Weapon from './pages/Weapon.tsx';
import SetEffect from './pages/SetEffect.tsx';
import SetEffectSimulator from './pages/SetEffectSimulator.tsx';
import DamageSimulator from './pages/DamageSimulator.tsx';
import AppHub from './pages/AppHub.tsx';
import Guide from './pages/Guide.tsx';
import Privacy from './pages/Privacy.tsx';
import RecordPage from './pages/Record.tsx';
import RefineSimulator from './pages/RefineSimulator.tsx';
import RootLayout from "./components/RootLayout";
import Login from './pages/Login.tsx';
import { Link } from "react-router-dom";
import CreateCharacterPage from "./pages/CreateCharacter";
import JobPickerPage from "./pages/JobPicker";
import TrainingDamagePage from "./pages/TrainingDamage";
import LogoutPage from "./pages/Logout.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/character" element={<Character />} />
          <Route path="/item" element={<Item />} />
          <Route path="/weapon" element={<Weapon />} />
          <Route path='/set' element={<SetEffect />} />
          <Route path='/effect_simulator' element={<SetEffectSimulator />} />
          <Route path='/damage_simulator' element={<DamageSimulator />} />
          <Route path='/app' element={<AppHub />} />
          <Route path='/record' element={<RecordPage />} />
          <Route path='/record/create' element={<CreateCharacterPage />} />
          <Route path='/record/damage' element={<TrainingDamagePage />} />
          <Route path='/pick/job' element={<JobPickerPage />} />
          <Route path='/refine_simulator' element={<RefineSimulator />} />
          <Route path='/guide' element={<Guide />} />
          <Route path='/privacy' element={<Privacy />} />
          <Route path='/login' element={<Login />} />
          <Route path='/logout' element={<LogoutPage />} />
          <Route
            path="*"
            element={
              <div className="flex flex-1 flex-col px-3 py-8">
                <div className="mx-auto w-full max-w-4xl space-y-3">
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    페이지를 찾을 수 없습니다
                  </h1>
                  <p className="text-xs text-slate-400 sm:text-sm">
                    주소가 올바른지 확인해주세요.
                  </p>
                  <Link
                    to="/"
                    className="inline-flex rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-200 hover:border-indigo-500/70"
                  >
                    홈으로 이동
                  </Link>
                </div>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
