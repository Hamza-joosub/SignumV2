import { BrowserRouter, Routes, Route } from "react-router-dom"
import Landing from "./pages/Landing.jsx"
import Markets from "./pages/Markets"
import Category from "./pages/Category"
import Instrument from "./pages/Instrument"
import Models from "./pages/Models"
import COTOverview from "./pages/COTOverview";
import COTCommodityOverview from "./pages/COTCommodityOverview";



// Inside your routes:


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/markets" element={<Markets />} />
        <Route path="/markets/:category" element={<Category />} />
        <Route path="/markets/instrument/:ticker" element={<Instrument />} />
        <Route path="/models" element={<Models />} />
        <Route path="/models/cot" element={<COTOverview />} />
        <Route path="/models/cot-commodity" element={<COTCommodityOverview />} />
      </Routes>
    </BrowserRouter>
  )
}


