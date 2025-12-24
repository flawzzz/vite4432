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
          <Route path='/refine_simulator' element={<RefineSimulator />} />
          <Route path='/guide' element={<Guide />} />
          <Route path='/privacy' element={<Privacy />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
