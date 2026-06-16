import { useState } from "react"

// ── Palette ────────────────────────────────────────────────
const C = {
  g:   "#2d5b3d",
  gl:  "#3d7a52",
  gp:  "#e6efe9",
  cr:  "#f7f4ee",
  cr2: "#eeebe3",
  tx:  "#1a2a1f",
  tm:  "#6b8c74",
  rd:  "#c0392b",
  rp:  "#fdecea",
  bl:  "#2471a3",
  bp:  "#eaf4fb",
  gd:  "#b7860b",
  dp:  "#fef9e7",
  or:  "#ca6f1e",
  op:  "#fdf2e9",
  pu:  "#7d3c98",
  pp:  "#f4ecf7",
  wh:  "#ffffff",
  br:  "#dde8e0",
}

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })

const pct = (part: number, total: number) =>
  total > 0 ? Math.round(part / total * 100) : 0

// ── Types ──────────────────────────────────────────────────
interface BienBilan {
  id: string
  nom: string
  regime: string
  recettes: number
  deductibles: number
  resultat: number
}

interface AnnualData {
  mois: number                              // nombre de mois couverts
  recettes: number
  deductibles: number
  nonDeductibles: number
  resultat: number                          // recettes − déductibles
  recettesParType: Record<string, { label: string; montant: number }>
  depensesParCat:  Record<string, { label: string; emoji: string; montant: number }>
  biensDetail: BienBilan[]
}

// ── Groupes fiscaux de référence (toujours affichés) ──────
const BILAN_GROUPES = [
  { key:"gestion",    label:"Frais de gestion & admin.", emoji:"📋" },
  { key:"assurance",  label:"Assurances",                emoji:"🛡️" },
  { key:"abonnement", label:"Abonnements",               emoji:"⚡" },
  { key:"taxes",      label:"Taxes & prélèvements",      emoji:"🏛️" },
  { key:"travaux",    label:"Travaux & mobilier",        emoji:"🔧" },
  { key:"emprunt",    label:"Intérêts d'emprunt",        emoji:"🏦" },
  { key:"autre",      label:"Autres dépenses",           emoji:"📌" },
]

// ── Données calculées depuis les mocks RecettesPage/DepensesPage ───
const BILAN: Record<number, AnnualData> = {
  2026: {
    mois: 5,
    recettes:       9_370,
    deductibles:    5_241,
    nonDeductibles: 4_150,
    resultat:       4_129,
    recettesParType: {
      loyer:          { label:"Loyers",           montant:7_950 },
      charges:        { label:"Charges récup.",   montant:  650 },
      depot_garantie: { label:"Dépôt garantie",   montant:  620 },
      autre:          { label:"Autres revenus",   montant:  150 },
    },
    depensesParCat: {
      gestion:    { label:"Frais de gestion & admin.", emoji:"📋", montant:  645 },
      assurance:  { label:"Assurances",                emoji:"🛡️", montant:  296 },
      abonnement: { label:"Abonnements",               emoji:"⚡", montant:   90 },
      taxes:      { label:"Taxes & prélèvements",      emoji:"🏛️", montant:2_130 },
      travaux:    { label:"Travaux & mobilier",        emoji:"🔧", montant:1_650 },
      emprunt:    { label:"Intérêts d'emprunt",        emoji:"🏦", montant:  335 },
      autre:      { label:"Autres dépenses",           emoji:"📌", montant:   95 },
    },
    biensDetail: [
      { id:"b1", nom:"Appartement Gambetta", regime:"LMNP Micro-BIC", recettes:4_800, deductibles:2_109, resultat: 2_691 },
      { id:"b2", nom:"Studio Confluence",    regime:"Micro-foncier",  recettes:3_970, deductibles:  965, resultat: 3_005 },
      { id:"b3", nom:"Garage Bellecour",     regime:"Micro-foncier",  recettes:  600, deductibles:  270, resultat:   330 },
      { id:"b4", nom:"T2 Croix-Rousse",     regime:"Réel",           recettes:    0, deductibles:1_897, resultat:-1_897 },
    ],
  },
  2025: {
    mois: 12,
    recettes:       20_760,
    deductibles:    11_820,
    nonDeductibles: 12_960,
    resultat:        8_940,
    recettesParType: {
      loyer:   { label:"Loyers",          montant:18_720 },
      charges: { label:"Charges récup.",  montant: 1_560 },
      autre:   { label:"Autres revenus",  montant:   480 },
    },
    depensesParCat: {
      gestion:    { label:"Frais de gestion & admin.", emoji:"📋", montant:2_780 },
      assurance:  { label:"Assurances",                emoji:"🛡️", montant:  684 },
      abonnement: { label:"Abonnements",               emoji:"⚡", montant:  216 },
      taxes:      { label:"Taxes & prélèvements",      emoji:"🏛️", montant:2_130 },
      travaux:    { label:"Travaux & mobilier",        emoji:"🔧", montant:3_200 },
      emprunt:    { label:"Intérêts d'emprunt",        emoji:"🏦", montant:2_404 },
      autre:      { label:"Autres dépenses",           emoji:"📌", montant:  406 },
    },
    biensDetail: [
      { id:"b1", nom:"Appartement Gambetta", regime:"LMNP Micro-BIC", recettes:11_160, deductibles: 5_820, resultat:  5_340 },
      { id:"b2", nom:"Studio Confluence",    regime:"Micro-foncier",  recettes: 8_160, deductibles: 4_540, resultat:  3_620 },
      { id:"b3", nom:"Garage Bellecour",     regime:"Micro-foncier",  recettes: 1_440, deductibles: 1_060, resultat:    380 },
      { id:"b4", nom:"T2 Croix-Rousse",     regime:"Réel",           recettes:     0, deductibles:   400, resultat:   -400 },
    ],
  },
}

const ANNEES_DISPO = [2026, 2025]

// ── Primitives ─────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return (
    <div style={{ fontSize:11, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".07em", marginBottom:12 }}>
      {children}
    </div>
  )
}

function Row({
  label, value, bold = false, indent = false,
  color, sub,
}: {
  label: string; value: string; bold?: boolean; indent?: boolean
  color?: string; sub?: string
}) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"7px 0", borderBottom:`1px solid ${C.br}` }}>
      <div style={{ paddingLeft: indent ? 14 : 0 }}>
        <div style={{ fontSize:13, color: indent ? C.tm : C.tx, fontWeight: bold ? 700 : 400 }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:C.tm }}>{sub}</div>}
      </div>
      <span style={{ fontSize:13, fontWeight: bold ? 800 : 600, color: color ?? C.tx }}>{value}</span>
    </div>
  )
}

// ── Barre de progression ───────────────────────────────────
function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const w = total > 0 ? Math.min(100, Math.round(value / total * 100)) : 0
  return (
    <div style={{ height:6, background:C.cr2, borderRadius:4, overflow:"hidden", marginTop:4 }}>
      <div style={{ width:`${w}%`, height:"100%", background:color, borderRadius:4, transition:"width .4s" }} />
    </div>
  )
}

// ── Toast export ───────────────────────────────────────────
function ExportToast({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
        background:C.g, color:"#fff", padding:"14px 22px", borderRadius:14,
        fontWeight:700, fontSize:14, boxShadow:"0 4px 24px rgba(0,0,0,.18)",
        zIndex:999, display:"flex", alignItems:"center", gap:12, whiteSpace:"nowrap",
      }}
    >
      <span>📤 Export PDF disponible prochainement</span>
      <button
        onClick={onClose}
        style={{ background:"rgba(255,255,255,.2)", border:"none", color:"#fff", borderRadius:8, padding:"3px 9px", cursor:"pointer", fontFamily:"inherit", fontWeight:700 }}
      >
        OK
      </button>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────

export default function BilanPage() {
  const [annee, setAnnee]         = useState(2026)
  const [showExport, setShowExport] = useState(false)

  const data = BILAN[annee]

  return (
    <>
      {/* ── En-tête ─────────────────────────────────────── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:C.tx, margin:0, lineHeight:1.2 }}>Bilan fiscal</h1>
          <div style={{ fontSize:13, color:C.tm, marginTop:3 }}>
            Aide à la préparation — données non officielles
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <select
            value={annee}
            onChange={e => setAnnee(parseInt(e.target.value))}
            style={{ padding:"8px 12px", border:`1.5px solid ${C.br}`, borderRadius:9, fontSize:14, fontFamily:"inherit", color:C.tx, background:C.wh, outline:"none", fontWeight:700 }}
          >
            {ANNEES_DISPO.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button
            onClick={() => setShowExport(true)}
            style={{ background:C.bl, color:"#fff", border:"none", borderRadius:10, padding:"9px 16px", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}
          >
            📤 Exporter
          </button>
        </div>
      </div>

      {/* ── Bandeau avertissement ────────────────────────── */}
      <div style={{ background:C.dp, border:`1.5px solid ${C.gd}`, borderRadius:12, padding:"12px 16px", marginBottom:18, display:"flex", gap:10, alignItems:"flex-start" }}>
        <span style={{ fontSize:18 }}>⚠️</span>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:C.gd, marginBottom:2 }}>
            Aide à la préparation fiscale — non officielle
          </div>
          <div style={{ fontSize:12, color:C.gd, lineHeight:1.5 }}>
            Ce bilan est calculé à partir de vos données saisies. Il ne constitue pas une déclaration officielle et ne remplace pas l'avis d'un comptable ou de l'administration fiscale.
          </div>
        </div>
      </div>

      {!data ? (
        <div style={{ background:C.wh, borderRadius:14, padding:"60px 20px", textAlign:"center", border:`1px solid ${C.br}` }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
          <div style={{ fontWeight:700, fontSize:15, color:C.tm }}>Aucune donnée disponible pour {annee}</div>
        </div>
      ) : (
        <>
          {/* ── Synthèse globale ─────────────────────────── */}
          <div style={{ background:`linear-gradient(135deg, ${C.g}, ${C.gl})`, borderRadius:16, padding:"20px 22px", marginBottom:18 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.65)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:14 }}>
              Synthèse {annee}{data.mois < 12 ? ` · ${data.mois} mois` : " · Année complète"}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {[
                { label:"Recettes totales",    value:euro(data.recettes),    color:"#a8d5b5" },
                { label:"Charges déductibles", value:euro(data.deductibles), color:"#f5c6c0" },
                { label:"Résultat fiscal",     value:euro(data.resultat),    color: data.resultat >= 0 ? "#a8d5b5" : "#f5a89a" },
              ].map(s => (
                <div key={s.label} style={{ textAlign:"center", padding:"10px 4px" }}>
                  <div style={{ fontSize:20, fontWeight:900, color:s.color, lineHeight:1.1 }}>{s.value}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.6)", marginTop:4, textTransform:"uppercase", letterSpacing:".05em" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Interprétation */}
            <div style={{ marginTop:14, padding:"10px 14px", background:"rgba(0,0,0,.15)", borderRadius:10 }}>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.9)", lineHeight:1.5 }}>
                {data.resultat > 0
                  ? `✅ Bénéfice foncier estimé de ${euro(data.resultat)} — à déclarer selon votre régime fiscal.`
                  : `📉 Déficit foncier estimé de ${euro(Math.abs(data.resultat))} — potentiellement reportable sur les années suivantes.`}
              </div>
            </div>
          </div>

          {/* ── Récapitulatif comptable ───────────────────── */}
          <div style={{ background:C.wh, borderRadius:14, padding:"18px 20px", border:`1px solid ${C.br}`, marginBottom:14 }}>
            <SectionTitle>Récapitulatif comptable</SectionTitle>
            <Row label="(+) Recettes totales"               value={euro(data.recettes)}        bold />
            <Row label="(−) Charges déductibles"            value={euro(data.deductibles)}      bold indent />
            <Row label="(−) Dépenses non déductibles"       value={euro(data.nonDeductibles)}   indent color={C.tm}
                 sub="Remboursement capital emprunt" />
            <div style={{ height:1, background:C.g, margin:"10px 0" }} />
            <Row
              label="Résultat fiscal estimé"
              value={(data.resultat >= 0 ? "+" : "") + euro(data.resultat)}
              bold
              color={data.resultat >= 0 ? C.g : C.rd}
            />
          </div>

          {/* ── Détail par bien ──────────────────────────── */}
          <div style={{ background:C.wh, borderRadius:14, padding:"18px 20px", border:`1px solid ${C.br}`, marginBottom:14 }}>
            <SectionTitle>Détail par bien</SectionTitle>
            {data.biensDetail.map((b, i) => (
              <div
                key={b.id}
                style={{ paddingBottom:12, marginBottom:12, borderBottom: i < data.biensDetail.length - 1 ? `1px solid ${C.br}` : "none" }}
              >
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14, color:C.tx }}>{b.nom}</div>
                    <div style={{ fontSize:11, color:C.tm, marginTop:2 }}>
                      <span style={{ background:C.bp, color:C.bl, padding:"1px 8px", borderRadius:10, fontWeight:700 }}>{b.regime}</span>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:17, fontWeight:900, color: b.resultat >= 0 ? C.g : C.rd }}>
                      {b.resultat >= 0 ? "+" : ""}{euro(b.resultat)}
                    </div>
                    <div style={{ fontSize:10, color:C.tm, marginTop:2 }}>Résultat estimé</div>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  <div style={{ background:C.gp, borderRadius:8, padding:"8px 12px" }}>
                    <div style={{ fontSize:11, color:C.tm, marginBottom:2 }}>Recettes</div>
                    <div style={{ fontSize:14, fontWeight:800, color:C.g }}>{euro(b.recettes)}</div>
                  </div>
                  <div style={{ background:C.rp, borderRadius:8, padding:"8px 12px" }}>
                    <div style={{ fontSize:11, color:C.tm, marginBottom:2 }}>Charges déductibles</div>
                    <div style={{ fontSize:14, fontWeight:800, color:C.rd }}>{euro(b.deductibles)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Recettes par type ────────────────────────── */}
          <div style={{ background:C.wh, borderRadius:14, padding:"18px 20px", border:`1px solid ${C.br}`, marginBottom:14 }}>
            <SectionTitle>Recettes par type</SectionTitle>
            {Object.entries(data.recettesParType).map(([k, v]) => (
              <div key={k} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:13, color:C.tx }}>{v.label}</span>
                  <div style={{ textAlign:"right" }}>
                    <span style={{ fontSize:13, fontWeight:700, color:C.g }}>{euro(v.montant)}</span>
                    <span style={{ fontSize:11, color:C.tm, marginLeft:6 }}>{pct(v.montant, data.recettes)} %</span>
                  </div>
                </div>
                <ProgressBar value={v.montant} total={data.recettes} color={C.g} />
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10, borderTop:`1px solid ${C.br}`, marginTop:4 }}>
              <span style={{ fontSize:13, fontWeight:800 }}>Total</span>
              <span style={{ fontSize:13, fontWeight:900, color:C.g }}>{euro(data.recettes)}</span>
            </div>
          </div>

          {/* ── Dépenses déductibles par catégorie ─────────── */}
          <div style={{ background:C.wh, borderRadius:14, padding:"18px 20px", border:`1px solid ${C.br}`, marginBottom:14 }}>
            <SectionTitle>Charges déductibles par catégorie</SectionTitle>
            {BILAN_GROUPES.map(g => {
              const v = data.depensesParCat[g.key]
              const montant = v?.montant ?? 0
              return (
                <div key={g.key} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:13, color: montant > 0 ? C.tx : C.tm }}>{g.emoji} {g.label}</span>
                    <div style={{ textAlign:"right" }}>
                      <span style={{ fontSize:13, fontWeight:700, color: montant > 0 ? C.rd : C.tm }}>{euro(montant)}</span>
                      {montant > 0 && <span style={{ fontSize:11, color:C.tm, marginLeft:6 }}>{pct(montant, data.deductibles)} %</span>}
                    </div>
                  </div>
                  <ProgressBar value={montant} total={data.deductibles} color={C.rd} />
                </div>
              )
            })}
            <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10, borderTop:`1px solid ${C.br}`, marginTop:4 }}>
              <span style={{ fontSize:13, fontWeight:800 }}>Total déductible</span>
              <span style={{ fontSize:13, fontWeight:900, color:C.rd }}>{euro(data.deductibles)}</span>
            </div>
          </div>

          {/* ── Aide à la déclaration ────────────────────── */}
          <div style={{ background:C.bp, border:`1.5px solid ${C.bl}`, borderRadius:12, padding:"16px 18px", marginBottom:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.bl, marginBottom:10 }}>
              💡 Aide à la déclaration
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {data.biensDetail.map(b => (
                <div key={b.id} style={{ fontSize:12, color:C.bl, lineHeight:1.6 }}>
                  <strong>{b.nom}</strong> ({b.regime}) ·{" "}
                  {b.regime.includes("Micro") ? (
                    <>Case à renseigner : <strong>{euro(b.recettes)}</strong> bruts (abattement automatique)</>
                  ) : (
                    <>Recettes <strong>{euro(b.recettes)}</strong> — Charges <strong>{euro(b.deductibles)}</strong> — Résultat <strong style={{ color: b.resultat >= 0 ? C.g : C.rd }}>{euro(b.resultat)}</strong></>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Bouton export bas de page ────────────────── */}
          <button
            onClick={() => setShowExport(true)}
            style={{
              width:"100%", padding:"14px 0", borderRadius:12, border:`1.5px solid ${C.bl}`,
              background:C.wh, color:C.bl, fontWeight:800, fontSize:15,
              cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}
          >
            📤 Exporter le bilan {annee}
          </button>
        </>
      )}

      {/* ── Toast export ─────────────────────────────────── */}
      {showExport && <ExportToast onClose={() => setShowExport(false)} />}
    </>
  )
}
