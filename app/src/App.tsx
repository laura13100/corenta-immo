import { useState, useEffect } from "react"
import { AddBienModal, AddBienFormData } from "./AddBienModal"
import BiensPage from "./BiensPage"
import RecettesPage from "./RecettesPage"
import DepensesPage from "./DepensesPage"
import DocumentsPage from "./DocumentsPage"
import BilanPage from "./BilanPage"
import DashboardPage from "./DashboardPage"
import CreditsPage from "./CreditsPage"
import AuthPage from "./AuthPage"
import { supabase } from "./supabase"

const ANNEES = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)
const CY = new Date().getFullYear()

const C = {
  g: "#2d5b3d", gl: "#3d7a52", gp: "#e6efe9",
  cr: "#f7f4ee", cr2: "#eeebe3",
  tx: "#1a2a1f", tm: "#6b8c74",
  rd: "#c0392b", rp: "#fdecea",
  bl: "#2471a3", bp: "#eaf4fb",
  wh: "#ffffff", br: "#dde8e0",
}

type Page = "dash" | "biens" | "recettes" | "depenses" | "credits" | "documents" | "bilan"

const NAV: [Page, string][] = [
  ["dash",      "🏘 Tableau de bord"],
  ["biens",     "🏠 Mes biens"],
  ["recettes",  "💰 Recettes"],
  ["depenses",  "📉 Dépenses"],
  ["credits",   "🏦 Crédits"],
  ["documents", "📂 Documents"],
  ["bilan",     "📊 Bilan fiscal"],
]

// ── Bouton d'installation PWA ──────────────────────────────

function InstallButton() {
  const [prompt, setPrompt] = useState<Event | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e) }
    window.addEventListener("beforeinstallprompt", handler)

    // Détection iOS : pas de beforeinstallprompt, mais on peut guider
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isInStandalone = (window.navigator as { standalone?: boolean }).standalone === true
    if (isIOS && !isInStandalone) setPrompt({ type: "ios" } as unknown as Event)

    window.addEventListener("appinstalled", () => setInstalled(true))
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  if (installed || !prompt) return null

  const isIOS = (prompt as { type?: string }).type === "ios"

  return (
    <button
      title={isIOS ? "Appuyer sur Partager → Sur l'écran d'accueil" : "Installer l'application"}
      onClick={async () => {
        if (isIOS) {
          alert("Sur iOS :\n1. Appuyez sur l'icône Partager (carré avec flèche)\n2. « Sur l'écran d'accueil »\n3. Appuyez sur « Ajouter »")
          return
        }
        const deferredPrompt = prompt as BeforeInstallPromptEvent
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === "accepted") setInstalled(true)
        setPrompt(null)
      }}
      style={{
        padding: "6px 12px", borderRadius: 8,
        border: "1px solid rgba(255,255,255,.3)",
        background: "rgba(255,255,255,.15)",
        color: "rgba(255,255,255,.85)",
        fontSize: 12, fontWeight: 600, fontFamily: "inherit",
        cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
      }}
    >
      📲 Installer
    </button>
  )
}

// Typage manquant dans lib.dom pour beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

// ── App ────────────────────────────────────────────────────

export default function App() {
  const [page,         setPage]         = useState<Page>("dash")
  const [an,           setAn]           = useState(CY)
  const [user,         setUser]         = useState<object | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [showAddBien,  setShowAddBien]  = useState(false)

  // ── Auth ─────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthChecking(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Service Worker (PWA) ──────────────────────────────────
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {/* silencieux en dev */})
    }
  }, [])

  async function handleAddBien(f: AddBienFormData) {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return
    const meta = JSON.stringify({
      mode_detention:    f.mode_detention,
      regime_fiscal:     f.regime_fiscal,
      mode_exploitation: f.mode_exploitation,
      valeurAchat:       f.valeurAchat || "",
      surface:           f.surface || "",
      anneeAcquisition:  f.anneeAcquisition || "",
    })
    await supabase.from("biens").insert({
      user_id: u.id,
      nom:     f.nom.trim(),
      adresse: f.adresse || null,
      type:    f.type,
      notes:   meta,
    })
    setShowAddBien(false)
    if (page !== "biens") setPage("biens")
  }

  // ── États d'attente / non-auth ────────────────────────────
  if (authChecking) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.cr, fontFamily: "'Figtree',sans-serif" }}>
      <div style={{ textAlign: "center", color: C.tm }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: .4 }}>⏳</div>
        <div style={{ fontSize: 14 }}>Chargement…</div>
      </div>
    </div>
  )

  if (!user) return <AuthPage />

  return (
    <div style={{ fontFamily: "'Figtree',sans-serif", background: C.cr, minHeight: "100vh", color: C.tx }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0}
        button:hover{opacity:.85}
        input:focus,select:focus,textarea:focus{border-color:${C.g}!important;box-shadow:0 0 0 3px ${C.gp}}
        .nav-scroll{scrollbar-width:none}.nav-scroll::-webkit-scrollbar{display:none}
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{ background: C.g, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 16px rgba(45,91,61,.22)", position: "sticky", top: 0, zIndex: 100 }}>
        <div onClick={() => setPage("dash")} style={{ cursor: "pointer" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
            <span style={{ fontWeight: 300 }}>Co</span>renta{" "}
            <span style={{ fontSize: 12, fontWeight: 400, opacity: .6 }}>Immobilier</span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", fontWeight: 500 }}>
            Gestion · Optimisation · Rentabilité
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <InstallButton />
          <select
            value={an}
            onChange={e => setAn(Number(e.target.value))}
            style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: "rgba(255,255,255,.15)", color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
          >
            {ANNEES.map(a => <option key={a} value={a} style={{ color: C.tx }}>{a}</option>)}
          </select>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.3)", background: "transparent", color: "rgba(255,255,255,.8)", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* ── NAV ────────────────────────────────────────────── */}
      <div className="nav-scroll" style={{ background: C.wh, borderBottom: `2px solid ${C.br}`, display: "flex", gap: 2, padding: "8px 14px 0", overflowX: "auto" }}>
        {NAV.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setPage(k)}
            style={{
              padding: "7px 14px", border: "none", borderRadius: "8px 8px 0 0",
              fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
              whiteSpace: "nowrap",
              background: page === k ? C.g : "transparent",
              color: page === k ? "#fff" : C.g,
            }}
          >
            {l}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowAddBien(true)}
          style={{ marginBottom: 4, padding: "5px 12px", borderRadius: 8, border: "none", background: C.gp, color: C.g, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
        >
          + Bien
        </button>
      </div>

      {/* ── CONTENU ────────────────────────────────────────── */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "18px 14px 80px" }}>
        {page === "dash"      && <DashboardPage an={an} onGoBiens={() => setPage("biens")} />}
        {page === "biens"     && <BiensPage />}
        {page === "recettes"  && <RecettesPage />}
        {page === "depenses"  && <DepensesPage />}
        {page === "credits"   && <CreditsPage />}
        {page === "documents" && <DocumentsPage />}
        {page === "bilan"     && <BilanPage />}
      </div>

      {/* ── Modal ajout bien ───────────────────────────────── */}
      {showAddBien && (
        <AddBienModal
          onClose={() => setShowAddBien(false)}
          onSave={handleAddBien}
        />
      )}
    </div>
  )
}
