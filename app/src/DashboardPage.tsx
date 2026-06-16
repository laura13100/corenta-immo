import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import { MODE_DETENTION_LABELS, REGIME_FISCAL_LABELS } from "./AddBienModal"

// ── Palette ────────────────────────────────────────────────
const C = {
  g:"#2d5b3d", gl:"#3d7a52", gp:"#e6efe9",
  cr:"#f7f4ee", cr2:"#eeebe3",
  tx:"#1a2a1f", tm:"#6b8c74",
  rd:"#c0392b", rp:"#fdecea",
  bl:"#2471a3", bp:"#eaf4fb",
  gd:"#b7860b", dp:"#fef9e7",
  or:"#ca6f1e",
  wh:"#ffffff", br:"#dde8e0",
}

const euro = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
const fPct = (n: number) => `${n.toFixed(1)} %`

// ── Types ──────────────────────────────────────────────────

interface RawBien {
  id: string; nom: string; adresse: string | null; type: string; notes: string | null
}
interface RawLot {
  id: string; bien_id: string; nom: string
}
interface RawRecette {
  id: string; bien_id: string; lot_id: string | null
  type: string; montant: number; date_encaissement: string
}
interface RawDepense {
  id: string; bien_id: string; lot_id: string | null
  categorie: string; montant: number; date_depense: string; deductible: boolean
}
interface RawLocataire {
  id: string; bien_id: string; lot_id: string | null
  statut: string; date_sortie: string | null
}
interface RawCredit {
  id: string; bien_id: string; lot_id: string | null
  banque: string; statut: string
  mensualite_hors_assurance: number; assurance_mensuelle: number
  capital_rembourse_mensuel: number; interets_mensuels: number
  capital_restant_du: number
}

interface Alert { label: string; days: number; urgent: boolean }

interface BienStat {
  id: string; nom: string; adresse: string | null; type: string
  modeDetention: string; regimeFiscal: string; modeExploitation: string
  valeurAchat: number; nbLots: number
  // ── Flux financiers annuels ──
  revAnnuel: number      // recettes hors dépôt de garantie
  depAnnuel: number      // toutes dépenses (opex + intérêts + capital)
  depDeductibles: number // dépenses marquées déductibles
  // ── Séparation crédit ──
  interets: number       // catégorie "interets_emprunt" → charge réelle
  capitalRembourse: number // catégorie "capital_rembourse" → enrichissement patrimonial
  // ── KPI dérivés ──
  // cash-flow = revAnnuel - depAnnuel
  // enrichissement = cashflow + capitalRembourse
  //   (le capital est sorti du cashflow puis rendu car c'est du patrimoine)
  cashflow: number
  cashflowMensuel: number
  enrichissement: number
  // ── Rentabilité ──
  rentaBrute: number  // loyers annualisés / valeurAchat × 100
  rentaNette: number  // (loyers - depDeductibles) annualisés / valeurAchat × 100
  // ── Crédits ──
  mensualiteCredit: number   // mensualité totale (hors + assurance) des crédits actifs
  detteRestante:   number    // capital_restant_du total des crédits actifs
  // ── Occupation ──
  lotsActifs: number; lotsTotal: number; tauxOccupation: number
  alerts: Alert[]
}

// GlobalStat stocke explicitement locsActifs et lotsTotal
// pour l'affichage de la barre d'occupation globale
interface GlobalStat {
  nbBiens: number
  revAnnuel: number; depAnnuel: number
  cashflow: number; cashflowMensuel: number
  capitalRembourse: number; enrichissement: number
  rentaBrute: number
  locsActifs: number; lotsTotal: number; tauxOccupation: number
  mensualiteCredit: number
  detteRestante:   number
  biens: BienStat[]
}

// ── Helpers ────────────────────────────────────────────────

function parseMeta(notes: string | null): Record<string, string> {
  try { return JSON.parse(notes ?? "{}") } catch { return {} }
}

// Retourne le nombre de mois écoulés dans l'année (1-12)
// Pour une année passée : 12 mois complets
function moisEcoules(year: number): number {
  const now = new Date()
  return year === now.getFullYear() ? Math.max(1, now.getMonth() + 1) : 12
}

function daysUntil(dateStr: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const d   = new Date(dateStr); d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000)
}

// ── Sous-composants ────────────────────────────────────────

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: C.cr, borderRadius: 9, padding: "9px 10px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.tm, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 3, lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 900, color: color ?? C.tx, lineHeight: 1 }}>{value}</div>
    </div>
  )
}

function OccupationBar({ actifs, total, label }: { actifs: number; total: number; label?: string }) {
  if (total === 0) return null
  const p = Math.round(actifs / total * 100)
  const color = p >= 80 ? C.g : p >= 50 ? C.gd : C.rd
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.tm, marginBottom: 3 }}>
        <span>{label ?? "Taux d'occupation"}</span>
        <span style={{ fontWeight: 700, color }}>{p} %</span>
      </div>
      <div style={{ height: 5, background: C.cr2, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${p}%`, height: "100%", background: color, borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 10, color: C.tm, marginTop: 3 }}>{actifs} / {total} lot{total > 1 ? "s" : ""} occupé{actifs > 1 ? "s" : ""}</div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────

export default function DashboardPage({ an, onGoBiens }: { an: number; onGoBiens: () => void }) {
  const [stats,   setStats]   = useState<GlobalStat | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [an])

  async function load() {
    setLoading(true)
    const [bienRes, lotRes, recRes, depRes, locRes, creditRes] = await Promise.all([
      supabase.from("biens").select("id, nom, adresse, type, notes").order("nom"),
      supabase.from("lots").select("id, bien_id, nom"),
      supabase.from("recettes")
        .select("id, bien_id, lot_id, type, montant, date_encaissement")
        .gte("date_encaissement", `${an}-01-01`)
        .lte("date_encaissement", `${an}-12-31`),
      supabase.from("depenses")
        .select("id, bien_id, lot_id, categorie, montant, date_depense, deductible")
        .gte("date_depense", `${an}-01-01`)
        .lte("date_depense", `${an}-12-31`),
      supabase.from("locataires").select("id, bien_id, lot_id, statut, date_sortie"),
      supabase.from("credits")
        .select("id, bien_id, lot_id, banque, statut, mensualite_hors_assurance, assurance_mensuelle, capital_rembourse_mensuel, interets_mensuels, capital_restant_du")
        .eq("statut", "actif"),
    ])

    const rawBiens   = (bienRes.data   ?? []) as RawBien[]
    const rawLots    = (lotRes.data    ?? []) as RawLot[]
    const rawRec     = (recRes.data    ?? []) as RawRecette[]
    const rawDep     = (depRes.data    ?? []) as RawDepense[]
    const rawLoc     = (locRes.data    ?? []) as RawLocataire[]
    const rawCredits = (creditRes.data ?? []) as RawCredit[]

    const me = moisEcoules(an)

    // Index lots par bien_id
    const lotsByBien = new Map<string, RawLot[]>()
    for (const l of rawLots) {
      if (!lotsByBien.has(l.bien_id)) lotsByBien.set(l.bien_id, [])
      lotsByBien.get(l.bien_id)!.push(l)
    }

    // Alertes bail : date_sortie dans les 90 prochains jours
    const alertsByBien = new Map<string, Alert[]>()
    for (const loc of rawLoc) {
      if (!loc.date_sortie || loc.statut === "parti") continue
      const days = daysUntil(loc.date_sortie)
      if (days >= 0 && days <= 90) {
        if (!alertsByBien.has(loc.bien_id)) alertsByBien.set(loc.bien_id, [])
        alertsByBien.get(loc.bien_id)!.push({ label: "Fin de bail", days, urgent: days <= 30 })
      }
    }

    // ── Calcul par bien ──────────────────────────────────────────────────
    // Remarque : toutes les recettes et dépenses d'un lot ont bien_id = immeuble parent.
    // Filtrer par bien_id agrège donc automatiquement tous les lots d'un immeuble.
    const bienStats: BienStat[] = rawBiens.map(b => {
      const meta        = parseMeta(b.notes)
      const valeurAchat = parseFloat(meta.valeurAchat ?? "0") || 0

      const lots   = lotsByBien.get(b.id) ?? []
      const nbLots = lots.length

      const bRec     = rawRec.filter(r => r.bien_id === b.id)
      const bDep     = rawDep.filter(d => d.bien_id === b.id)
      const bLoc     = rawLoc.filter(l => l.bien_id === b.id)
      const bCredits = rawCredits.filter(c => c.bien_id === b.id)

      // Revenus : tout sauf dépôt de garantie (liability, pas un revenu)
      const revAnnuel = bRec
        .filter(r => r.type !== "depot_garantie")
        .reduce((s, r) => s + Number(r.montant), 0)

      // Dépenses totales cash (opex + intérêts + capital remboursé)
      const depAnnuel = bDep.reduce((s, d) => s + Number(d.montant), 0)

      // Dépenses déductibles (pour rentabilité nette et bilan fiscal)
      const depDeductibles = bDep
        .filter(d => d.deductible)
        .reduce((s, d) => s + Number(d.montant), 0)

      // Intérêts d'emprunt (charge réelle, déductible selon régime)
      const interets = bDep
        .filter(d => d.categorie === "interets_emprunt")
        .reduce((s, d) => s + Number(d.montant), 0)

      // Capital remboursé (catégorie "capital_rembourse") :
      // cash sorti → réduit le cash-flow
      // mais enrichit le patrimoine → on le rajoute dans l'enrichissement
      // ≠ amortissement_comptable (non-cash, LMNP/IS) — prévu phase 2
      const capitalRembourse = bDep
        .filter(d => d.categorie === "capital_rembourse")
        .reduce((s, d) => s + Number(d.montant), 0)

      // cash-flow = revenus - toutes dépenses cash (mensualités incluses)
      const cashflow        = revAnnuel - depAnnuel
      const cashflowMensuel = cashflow / me  // me >= 1 garanti par moisEcoules()

      // enrichissement = cash-flow + capital remboursé
      // = revAnnuel - depAnnuel + capitalRembourse
      // = revAnnuel - (intérêts + opex)   ← le capital sort puis revient
      const enrichissement = cashflow + capitalRembourse

      // Rentabilité : on annualise pour comparer équitablement années partielles
      const revAnnualise = revAnnuel / me * 12
      const rentaBrute   = valeurAchat > 0 ? revAnnualise / valeurAchat * 100 : 0
      const rentaNette   = valeurAchat > 0 ? (revAnnualise - depDeductibles / me * 12) / valeurAchat * 100 : 0

      // ── Taux d'occupation ──────────────────────────────────────────────
      // Immeuble : lots avec locataire actif (statut ≠ "parti")
      // Bien simple : 1 unité, occupée si un locataire actif lié au bien (lot_id null)
      let lotsTotal  = nbLots > 0 ? nbLots : 1
      let lotsActifs = 0
      if (nbLots > 0) {
        const lotsIds   = new Set(lots.map(l => l.id))
        const actifs    = bLoc.filter(l => l.lot_id && lotsIds.has(l.lot_id) && l.statut !== "parti")
        lotsActifs = new Set(actifs.map(l => l.lot_id)).size
      } else {
        lotsTotal  = 1
        lotsActifs = bLoc.some(l => !l.lot_id && l.statut !== "parti") ? 1 : 0
      }
      const tauxOccupation = lotsActifs / lotsTotal * 100

      // ── Crédits actifs liés à ce bien ─────────────────────────────────
      const mensualiteCredit = bCredits.reduce((s, c) => s + Number(c.mensualite_hors_assurance) + Number(c.assurance_mensuelle), 0)
      const detteRestante    = bCredits.reduce((s, c) => s + Number(c.capital_restant_du), 0)

      return {
        id: b.id, nom: b.nom, adresse: b.adresse, type: b.type,
        modeDetention:   meta.mode_detention   ?? "",
        regimeFiscal:    meta.regime_fiscal    ?? "",
        modeExploitation: meta.mode_exploitation ?? "",
        valeurAchat, nbLots,
        revAnnuel, depAnnuel, depDeductibles,
        interets, capitalRembourse,
        cashflow, cashflowMensuel, enrichissement,
        rentaBrute, rentaNette,
        lotsActifs, lotsTotal, tauxOccupation,
        mensualiteCredit, detteRestante,
        alerts: alertsByBien.get(b.id) ?? [],
      }
    })

    // ── Agrégats globaux ────────────────────────────────────────────────
    const revAnnuelG       = bienStats.reduce((s, b) => s + b.revAnnuel, 0)
    const depAnnuelG       = bienStats.reduce((s, b) => s + b.depAnnuel, 0)
    const cashflowG        = revAnnuelG - depAnnuelG
    const capitalG         = bienStats.reduce((s, b) => s + b.capitalRembourse, 0)
    const enrichissementG  = cashflowG + capitalG
    const valTotale        = bienStats.reduce((s, b) => s + b.valeurAchat, 0)
    const rentaBruteG      = valTotale > 0 ? (revAnnuelG / me * 12) / valTotale * 100 : 0
    const locsActifsG      = bienStats.reduce((s, b) => s + b.lotsActifs, 0)
    const lotsTotalG       = bienStats.reduce((s, b) => s + b.lotsTotal, 0)
    const tauxOccG         = lotsTotalG > 0 ? locsActifsG / lotsTotalG * 100 : 0
    const mensualiteCreditG = bienStats.reduce((s, b) => s + b.mensualiteCredit, 0)
    const detteRestanteG    = bienStats.reduce((s, b) => s + b.detteRestante, 0)

    setStats({
      nbBiens:          rawBiens.length,
      revAnnuel:        revAnnuelG,
      depAnnuel:        depAnnuelG,
      cashflow:         cashflowG,
      cashflowMensuel:  cashflowG / me,
      capitalRembourse: capitalG,
      enrichissement:   enrichissementG,
      rentaBrute:       rentaBruteG,
      locsActifs:       locsActifsG,
      lotsTotal:        lotsTotalG,
      tauxOccupation:   tauxOccG,
      mensualiteCredit: mensualiteCreditG,
      detteRestante:    detteRestanteG,
      biens: bienStats,
    })
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, color:C.tm, fontSize:14 }}>
        Chargement…
      </div>
    )
  }

  if (!stats) return null

  const { biens } = stats
  const me = moisEcoules(an)

  return (
    <>
      {/* ── En-tête ───────────────────────────────────────── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:C.tx, margin:0, lineHeight:1.2 }}>Tableau de bord</h1>
          <div style={{ fontSize:13, color:C.tm, marginTop:3 }}>
            {stats.nbBiens} bien{stats.nbBiens !== 1 ? "s" : ""} · {an}
            {me < 12 && <span style={{ color:C.gd }}> · {me} mois de données</span>}
          </div>
        </div>
      </div>

      {/* ── Synthèse globale ──────────────────────────────── */}
      <div style={{ background:`linear-gradient(135deg,${C.g},${C.gl})`, borderRadius:16, padding:"20px 18px", marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.6)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:12 }}>
          Portefeuille — {an}
        </div>

        {/* Ligne 1 : métriques principales — 2×2 pour mobile */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:8 }}>
          {[
            { label:"Biens",     value: stats.nbBiens.toString(),  color:"#fff"     },
            { label:"Revenus",   value: euro(stats.revAnnuel),     color:"#a8d5b5"  },
            { label:"Charges",   value: euro(stats.depAnnuel),     color:"#f5a89a"  },
            { label:"Cash-flow", value: (stats.cashflow >= 0 ? "+" : "") + euro(stats.cashflow), color: stats.cashflow >= 0 ? "#a8d5b5" : "#f5a89a" },
          ].map(s => (
            <div key={s.label} style={{ textAlign:"center", padding:"10px 4px" }}>
              <div style={{ fontSize:17, fontWeight:900, color:s.color, lineHeight:1.1 }}>{s.value}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.55)", marginTop:3, textTransform:"uppercase", letterSpacing:".05em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Ligne 2 : métriques secondaires — 2×2 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
          {[
            { label:"Cash-flow / mois", value: (stats.cashflowMensuel >= 0 ? "+" : "") + euro(stats.cashflowMensuel), color: stats.cashflowMensuel >= 0 ? "#a8d5b5" : "#f5a89a" },
            { label:"Capital remb. / an", value: euro(stats.capitalRembourse), color:"#a8d8f5" },
            { label:"Enrichissement / an", value: (stats.enrichissement >= 0 ? "+" : "") + euro(stats.enrichissement), color: stats.enrichissement >= 0 ? "#a8d5b5" : "#f5a89a" },
            { label:"Rent. brute port.", value: stats.rentaBrute > 0 ? fPct(stats.rentaBrute) : "—", color:"#f5d98a" },
          ].map(s => (
            <div key={s.label} style={{ textAlign:"center", padding:"8px 4px", background:"rgba(0,0,0,.12)", borderRadius:10 }}>
              <div style={{ fontSize:14, fontWeight:900, color:s.color, lineHeight:1.1 }}>{s.value}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,.5)", marginTop:3, textTransform:"uppercase", letterSpacing:".04em", lineHeight:1.3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Taux d'occupation global (si plusieurs unités) ── */}
      {stats.lotsTotal > 1 && (
        <div style={{ background:C.wh, borderRadius:12, padding:"14px 16px", border:`1px solid ${C.br}`, marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:13, fontWeight:700, color:C.tx }}>Taux d'occupation global</span>
            <span style={{ fontSize:16, fontWeight:900, color: stats.tauxOccupation >= 80 ? C.g : stats.tauxOccupation >= 50 ? C.gd : C.rd }}>
              {Math.round(stats.tauxOccupation)} %
            </span>
          </div>
          <div style={{ height:7, background:C.cr2, borderRadius:4, overflow:"hidden" }}>
            <div style={{ width:`${Math.min(100, Math.round(stats.tauxOccupation))}%`, height:"100%", background: stats.tauxOccupation >= 80 ? C.g : stats.tauxOccupation >= 50 ? C.gd : C.rd, borderRadius:4, transition:"width .5s" }} />
          </div>
          <div style={{ fontSize:11, color:C.tm, marginTop:5 }}>
            {stats.locsActifs} / {stats.lotsTotal} unité{stats.lotsTotal > 1 ? "s" : ""} occupée{stats.locsActifs > 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* ── Synthèse crédits (si au moins un crédit actif) ── */}
      {stats.mensualiteCredit > 0 && (
        <div style={{ background:C.bp, borderRadius:12, padding:"14px 16px", border:`1px solid ${C.br}`, marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.bl, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>
            🏦 Crédits actifs — portefeuille
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div>
              <div style={{ fontSize:10, color:C.tm, textTransform:"uppercase" }}>Mensualité totale</div>
              <div style={{ fontSize:16, fontWeight:900, color:C.bl }}>{euro(stats.mensualiteCredit)}</div>
              <div style={{ fontSize:10, color:C.tm }}>/ mois</div>
            </div>
            <div>
              <div style={{ fontSize:10, color:C.tm, textTransform:"uppercase" }}>Dette restante</div>
              <div style={{ fontSize:16, fontWeight:900, color:C.bl }}>{euro(stats.detteRestante)}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── État vide ─────────────────────────────────────── */}
      {biens.length === 0 && (
        <div style={{ background:C.wh, borderRadius:14, padding:"56px 20px", textAlign:"center", border:`1px solid ${C.br}` }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🏡</div>
          <div style={{ fontWeight:700, fontSize:17, color:C.tx, marginBottom:6 }}>Aucun bien enregistré</div>
          <div style={{ color:C.tm, fontSize:13, marginBottom:20 }}>
            Ajoutez vos biens depuis la section <strong>Mes biens</strong>.
          </div>
          <button
            onClick={onGoBiens}
            style={{ background:C.g, color:"#fff", border:"none", borderRadius:10, padding:"11px 22px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}
          >
            → Aller à Mes biens
          </button>
        </div>
      )}

      {/* ── Carte par bien ────────────────────────────────── */}
      {biens.map(b => {
        const isImm    = b.nbLots > 0
        const isAirbnb = b.modeExploitation === "airbnb"
        const cfColor  = b.cashflowMensuel >= 0 ? C.g : C.rd

        return (
          <div
            key={b.id}
            style={{ background:C.wh, borderRadius:14, padding:"18px 20px", marginBottom:14, border:`1.5px solid ${C.br}`, boxShadow:"0 1px 10px rgba(45,91,61,.07)" }}
          >
            {/* En-tête bien */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:14 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontSize:20 }}>{isImm ? "🏢" : isAirbnb ? "🏖️" : "🏠"}</span>
                  <span style={{ fontWeight:800, fontSize:16, color:C.tx, wordBreak:"break-word" }}>{b.nom}</span>
                </div>
                {b.adresse && <div style={{ fontSize:12, color:C.tm, marginBottom:6 }}>📍 {b.adresse}</div>}
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  <span style={{ background:C.gp, color:C.g, fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20 }}>{b.type}</span>
                  {b.modeDetention && (
                    <span style={{ background:"#f0edf8", color:"#6c3fc7", fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20 }}>
                      {MODE_DETENTION_LABELS[b.modeDetention] ?? b.modeDetention}
                    </span>
                  )}
                  {b.regimeFiscal && (
                    <span style={{ background:C.bp, color:C.bl, fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20 }}>
                      {REGIME_FISCAL_LABELS[b.regimeFiscal] ?? b.regimeFiscal}
                    </span>
                  )}
                  {isImm && (
                    <span style={{ background:C.bp, color:C.bl, fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20 }}>
                      {b.nbLots} lot{b.nbLots > 1 ? "s" : ""}
                    </span>
                  )}
                  {isAirbnb && (
                    <span style={{ background:"#fdf2e9", color:"#ca6f1e", fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20 }}>
                      Courte durée
                    </span>
                  )}
                </div>
              </div>

              {/* Cash-flow mensuel moyen */}
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:10, color:C.tm, textTransform:"uppercase", letterSpacing:".06em", marginBottom:2 }}>Cash-flow / mois</div>
                <div style={{ fontSize:26, fontWeight:900, color:cfColor, lineHeight:1.1 }}>
                  {b.cashflowMensuel >= 0 ? "+" : ""}{euro(b.cashflowMensuel)}
                </div>
                <div style={{ fontSize:11, color:C.tm, marginTop:2 }}>moy. sur {me} mois</div>
              </div>
            </div>

            {/* Grille KPI annuels */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:10 }}>
              <MiniStat label="Revenus (an)"         value={euro(b.revAnnuel)}                                                    color={C.g}  />
              <MiniStat label="Dépenses (an)"        value={euro(b.depAnnuel)}                                                    color={C.rd} />
              <MiniStat label="Capital remboursé"    value={euro(b.capitalRembourse)}                                             color={C.bl} />
              <MiniStat label="Enrichissement (an)"  value={(b.enrichissement >= 0 ? "+" : "") + euro(b.enrichissement)}          color={b.enrichissement >= 0 ? C.g : C.rd} />
            </div>

            {/* Détail crédit (via dépenses saisies OU crédit actif) */}
            {(b.interets > 0 || b.capitalRembourse > 0 || b.mensualiteCredit > 0) && (
              <div style={{ background:C.bp, borderRadius:8, padding:"8px 12px", marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.bl, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>🏦 Crédit</div>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                  {b.mensualiteCredit > 0 && (
                    <div style={{ fontSize:11, color:C.bl }}>
                      <span style={{ color:C.tm }}>Mensualité : </span>
                      <strong>{euro(b.mensualiteCredit)}</strong>
                      <span style={{ color:C.tm }}> /mois</span>
                    </div>
                  )}
                  {b.interets > 0 && (
                    <div style={{ fontSize:11, color:C.bl }}>
                      <span style={{ color:C.tm }}>Intérêts : </span>
                      <strong>{euro(b.interets)}</strong>
                      <span style={{ color:C.tm }}> (charge)</span>
                    </div>
                  )}
                  {b.capitalRembourse > 0 && (
                    <div style={{ fontSize:11, color:C.bl }}>
                      <span style={{ color:C.tm }}>Capital : </span>
                      <strong>{euro(b.capitalRembourse)}</strong>
                      <span style={{ color:C.tm }}> (patrimoine)</span>
                    </div>
                  )}
                  {b.detteRestante > 0 && (
                    <div style={{ fontSize:11, color:C.bl }}>
                      <span style={{ color:C.tm }}>Dette restante : </span>
                      <strong>{euro(b.detteRestante)}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rentabilité (si valeur d'achat renseignée) */}
            {b.valeurAchat > 0 && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:10 }}>
                <div style={{ background:C.dp, borderRadius:9, padding:"9px 10px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.gd, textTransform:"uppercase", letterSpacing:".05em", marginBottom:3 }}>Rent. brute</div>
                  <div style={{ fontSize:16, fontWeight:900, color:C.gd }}>{fPct(b.rentaBrute)}</div>
                  <div style={{ fontSize:10, color:C.tm }}>sur {euro(b.valeurAchat)}</div>
                </div>
                <div style={{ background:C.gp, borderRadius:9, padding:"9px 10px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:3 }}>Rent. nette</div>
                  <div style={{ fontSize:16, fontWeight:900, color:b.rentaNette >= 0 ? C.g : C.rd }}>{fPct(b.rentaNette)}</div>
                  <div style={{ fontSize:10, color:C.tm }}>charges déductibles incluses</div>
                </div>
              </div>
            )}

            {/* Taux d'occupation (immeuble ou bien simple non-Airbnb) */}
            {isImm && <OccupationBar actifs={b.lotsActifs} total={b.lotsTotal} />}
            {!isImm && !isAirbnb && (
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background: b.lotsActifs > 0 ? C.g : C.cr2, border:`2px solid ${b.lotsActifs > 0 ? C.g : C.br}` }} />
                <span style={{ fontSize:11, color:C.tm }}>
                  {b.lotsActifs > 0 ? "Locataire en place" : "Vacant"}
                </span>
              </div>
            )}
            {/* Airbnb : pas d'indicateur d'occupation au sens classique */}
            {!isImm && isAirbnb && (
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:C.or, border:`2px solid ${C.or}` }} />
                <span style={{ fontSize:11, color:C.tm }}>Location courte durée — voir recettes Airbnb</span>
              </div>
            )}

            {/* Alertes bail */}
            {b.alerts.length > 0 && (
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:10, paddingTop:10, borderTop:`1px solid ${C.br}` }}>
                {b.alerts.map((a, i) => (
                  <span
                    key={i}
                    style={{ fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:10, background: a.urgent ? C.rp : C.dp, color: a.urgent ? C.rd : C.gd }}
                  >
                    ⚠️ {a.label} · J−{a.days}
                  </span>
                ))}
              </div>
            )}

            {/* Bien sans données pour l'année */}
            {b.revAnnuel === 0 && b.depAnnuel === 0 && (
              <div style={{ marginTop:10, padding:"8px 12px", background:C.cr2, borderRadius:8, fontSize:12, color:C.tm, textAlign:"center" }}>
                Aucune recette ni dépense enregistrée pour {an}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
