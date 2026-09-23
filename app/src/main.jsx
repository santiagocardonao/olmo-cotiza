import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Layout.jsx";
import { useSession } from "./lib/useSession.js";
import { Dashboard } from "./pages/Dashboard.jsx";
import { Home } from "./pages/Home.jsx";
import { NewQuote } from "./pages/NewQuote.jsx";
import { PublicQuote } from "./pages/PublicQuote.jsx";
import { QuoteDetail } from "./pages/QuoteDetail.jsx";
import "./styles.css";

function App() {
  const { loading, session, isMember } = useSession();
  if (loading) return null;

  const olmo = (el) => (session && isMember ? <Shell mode="olmo" session={session}>{el}</Shell> : <Navigate to="/" replace />);
  const demo = (el) => <Shell mode="demo">{el}</Shell>;

  return (
    <Routes>
      <Route path="/" element={<Home session={session} isMember={isMember} />} />
      <Route path="/app" element={olmo(<Dashboard mode="olmo" />)} />
      <Route path="/app/nueva" element={olmo(<NewQuote mode="olmo" />)} />
      <Route path="/app/c/:slug" element={olmo(<QuoteDetail mode="olmo" />)} />
      <Route path="/demo" element={demo(<Dashboard mode="demo" />)} />
      <Route path="/demo/nueva" element={demo(<NewQuote mode="demo" />)} />
      <Route path="/demo/c/:slug" element={demo(<QuoteDetail mode="demo" />)} />
      <Route path="/p/:slug" element={<PublicQuote />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
