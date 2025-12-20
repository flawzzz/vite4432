import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.tsx";
import About from "./pages/About.tsx";
import Character from './pages/Character.tsx';
import Weapon from './pages/Weapon.tsx';
import SetEffect from './pages/SetEffect.tsx';
import SetEffectSimulator from './pages/SetEffectSimulator.tsx';
import DamageSimulator from './pages/DamageSimulator.tsx';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/character" element={<Character />} />
          <Route path="/weapon" element={<Weapon />} />
          <Route path='/set' element={<SetEffect />} />
          <Route path='/effect_simulator' element={<SetEffectSimulator />} />
          <Route path='/damage_simulator' element={<DamageSimulator />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
