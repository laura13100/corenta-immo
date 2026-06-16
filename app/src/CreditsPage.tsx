import { useState, useEffect } from "react"
import { supabase } from "./supabase"

// ── Palette ────────────────────────────────────────────────
const C = {
  g:   "#2d5b3d", gl:  "#3d7a52", gp:  "#e6efe9",
  cr:  "#f7f4ee", cr2: "#eeebe3",
  tx:  "#1a2a1f", tm:  "#6b8c74",
  rd:  "#c0392b", rp:  "#fdecea",
  bl:  "#2471a3", bp:  "#eaf4fb",
  gd:  "#b7860b", dp:  "#fef9e7",
  or:  "#ca6f1e", op:  "#fdf2e9",
  pu:  "#7d3c98", pp:  "#f4ecf7",
  wh:  "#ffffff", br:  "#dde8e0",
}

const euro = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
const pct  = (n: number) => `${Number(n).toFixed(2)} %`
const formatDate = (d: string) => { const [y, m, j] = d.split("-"); return `${j}/${m}/${y}` }
const today = new Date().toISOString().slice(0, 10)

// ── Types ──────────────────────────────────────────────────

type TypeCredit = "amortissable" | "in_fine" | "ptz" | "relais"
type StatutCredit = "actif" | "solde" | "suspendu"

interface Credit {
  id:                        string
  user_id:                   string
  bien_id:                   string
  bien_nom:                  string
  lot_id:                    string | null
  lot_nom:                   string | null
  banque:                    string
  type_credit:               TypeCredit
  statut:                    StatutCredit
  notes:                     string
  montant_emprunte:          number
  capital_restant_du:        number
  taux:                      number
  duree_mois:                number
  date_debut:                string
  mensualite_hors_assurance: number
  assurance_mensuelle:       number
  capital_rembourse_mensuel: number
  interets_mensuels:         number
}

interface FormState {
  target:                    string
  banque:                    string
  type_credit:               TypeCredit
  statut:                    StatutCredit
  notes:                     string
  montant_emprunte:          string
  capital_restant_du:        string
  taux:                      string
  duree_mois:                string
  date_debut:                string
  mensualite_hors_assurance: string
  assurance_mensuelle:       string
  capital_rembourse_mensuel: string
  interets_mensuels:         string
}

interface BienOption {
  value:      string
  bien_id:    string
  lot_id:     string | null
  nom:        string
  isImmeuble: boolean
}

interface ImmeubleGroup {
  id:   string
  nom:  string
  lots: { value: string; nom: string }[]
}

const TYPE_LABELS: Record<TypeCredit, string> = {
  amortissable: "Amortissable",
  in_fine:      "In fine",
  ptz:          "PTZ",
  relais:       "Relais",
}

const STATUT_CONFIG: Record<StatutCredit, { label: string; bg: string; color: string }> = {
  actif:    { label: "Actif",    bg: C.gp, color: C.g  },
  solde:    { label: "Soldé",    bg: C.cr2, color: C.tm },
  suspendu: { label: "Suspendu", bg: C.dp,  color: C.gd },
}

// ── Primitives UI ──────────────────────────────────────────

function FieldInput({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>
        {label}
      </label>
      <input
        style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:14, fontFamily:"inherit", color:C.tx, background:C.cr, outline:"none", boxSizing:"border-box" }}
        {...props}
      />
    </div>
  )
}

function FieldSelect({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:14, fontFamily:"inherit", color:C.tx, background:C.cr, outline:"none", boxSizing:"border-box" }}
      >
        {children}
      </select>
    </div>
  )
}

function BienSelect({ value, onChange, bienOptions, immeubleGroups }: {
  value: string; onChange: (v: string) => void
  bienOptions: BienOption[]; immeubleGroups: ImmeubleGroup[]
}) {
  const immeubleIds = new Set(immeubleGroups.map(g => g.id))
  const simples = bienOptions.filter(o => !o.lot_id && !immeubleIds.has(o.bien_id))
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:14, fontFamily:"inherit", color:C.tx, background:C.cr, outline:"none", boxSizing:"border-box" }}
    >
      {simples.map(o => <option key={o.value} value={o.value}>{o.nom}</option>)}
      {immeubleGroups.map(g => (
        <optgroup key={g.id} label={`🏢 ${g.nom}`}>
          <option value={g.id}>{g.nom} (niveau immeuble)</option>
          {g.lots.map(l => <option key={l.value} value={l.value}>└ {l.nom}</option>)}
        </optgroup>
      ))}
    </select>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize:10, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".07em", marginBottom:8, marginTop:4 }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height:1, background:C.br, margin:"14px 0" }} />
}

// ── Modal crédit ───────────────────────────────────────────

function CreditModal({ onClose, onSave, initialValues, bienOptions, immeubleGroups }: {
  onClose: () => void
  onSave: (form: FormState) => void
  initialValues?: Credit
  bienOptions: BienOption[]
  immeubleGroups: ImmeubleGroup[]
}) {
  const isEdit = !!initialValues
  const defaultTarget = bienOptions[0]?.value ?? ""

  const [form, setForm] = useState<FormState>({
    target:                    initialValues
      ? (initialValues.lot_id ? `${initialValues.bien_id}|${initialValues.lot_id}` : initialValues.bien_id)
      : defaultTarget,
    banque:                    initialValues?.banque                    ?? "",
    type_credit:               initialValues?.type_credit               ?? "amortissable",
    statut:                    initialValues?.statut                    ?? "actif",
    notes:                     initialValues?.notes                     ?? "",
    montant_emprunte:          initialValues?.montant_emprunte?.toString()          ?? "",
    capital_restant_du:        initialValues?.capital_restant_du?.toString()        ?? "",
    taux:                      initialValues?.taux?.toString()                      ?? "",
    duree_mois:                initialValues?.duree_mois?.toString()                ?? "240",
    date_debut:                initialValues?.date_debut                            ?? today,
    mensualite_hors_assurance: initialValues?.mensualite_hors_assurance?.toString() ?? "",
    assurance_mensuelle:       initialValues?.assurance_mensuelle?.toString()       ?? "0",
    capital_rembourse_mensuel: initialValues?.capital_rembourse_mensuel?.toString() ?? "",
    interets_mensuels:         initialValues?.interets_mensuels?.toString()         ?? "",
  })

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  const mensualiteTotal = (parseFloat(form.mensualite_hors_assurance) || 0) + (parseFloat(form.assurance_mensuelle) || 0)

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background:C.wh, borderRadius:"18px 18px 0 0", padding:"22px 20px 32px", width:"100%", maxWidth:540, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div style={{ fontSize:17, fontWeight:800, color:C.tx }}>
            {isEdit ? "Modifier le crédit" : "Nouveau crédit"}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.tm }}>×</button>
        </div>

        {/* Bien / Lot */}
        <div style={{ marginBottom:12 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>
            Bien / Lot
          </label>
          <BienSelect value={form.target} onChange={v => set("target", v)} bienOptions={bienOptions} immeubleGroups={immeubleGroups} />
        </div>

        <Divider />
        <SectionTitle>Informations générales</SectionTitle>

        <FieldInput label="Banque" value={form.banque} onChange={e => set("banque", e.target.value)} placeholder="Ex : Crédit Agricole" />

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <FieldSelect label="Type" value={form.type_credit} onChange={v => set("type_credit", v as TypeCredit)}>
            <option value="amortissable">Amortissable</option>
            <option value="in_fine">In fine</option>
            <option value="ptz">PTZ</option>
            <option value="relais">Relais</option>
          </FieldSelect>
          <FieldSelect label="Statut" value={form.statut} onChange={v => set("statut", v as StatutCredit)}>
            <option value="actif">Actif</option>
            <option value="solde">Soldé</option>
            <option value="suspendu">Suspendu</option>
          </FieldSelect>
        </div>

        <Divider />
        <SectionTitle>Montants & conditions</SectionTitle>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <FieldInput label="Montant emprunté (€)" type="number" min="0" step="1000" value={form.montant_emprunte} onChange={e => set("montant_emprunte", e.target.value)} placeholder="200000" />
          <FieldInput label="Capital restant dû (€)" type="number" min="0" step="100" value={form.capital_restant_du} onChange={e => set("capital_restant_du", e.target.value)} placeholder="150000" />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <FieldInput label="Taux annuel (%)" type="number" min="0" step="0.01" value={form.taux} onChange={e => set("taux", e.target.value)} placeholder="3.25" />
          <FieldInput label="Durée (mois)" type="number" min="1" step="12" value={form.duree_mois} onChange={e => set("duree_mois", e.target.value)} placeholder="240" />
        </div>

        <FieldInput label="Date de début" type="date" value={form.date_debut} onChange={e => set("date_debut", e.target.value)} />

        <Divider />
        <SectionTitle>Mensualités décomposées</SectionTitle>

        <div style={{ fontSize:12, color:C.tm, marginBottom:12, padding:"8px 12px", background:C.bp, borderRadius:8 }}>
          💡 Saisir la décomposition mensuelle actuelle.
          Le capital remboursé mensuel sera automatiquement enregistré comme dépense.
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <FieldInput label="Mensualité (hors assurance) €" type="number" min="0" step="1" value={form.mensualite_hors_assurance} onChange={e => set("mensualite_hors_assurance", e.target.value)} placeholder="850" />
          <FieldInput label="Assurance mensuelle (€)" type="number" min="0" step="1" value={form.assurance_mensuelle} onChange={e => set("assurance_mensuelle", e.target.value)} placeholder="30" />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <FieldInput label="dont intérêts (€ / mois)" type="number" min="0" step="1" value={form.interets_mensuels} onChange={e => set("interets_mensuels", e.target.value)} placeholder="350" />
          <FieldInput label="dont capital (€ / mois)" type="number" min="0" step="1" value={form.capital_rembourse_mensuel} onChange={e => set("capital_rembourse_mensuel", e.target.value)} placeholder="500" />
        </div>

        {mensualiteTotal > 0 && (
          <div style={{ background:C.gp, borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:12, color:C.g }}>
            Mensualité totale (avec assurance) : <strong>{euro(mensualiteTotal)}</strong>
            {(parseFloat(form.interets_mensuels) || 0) + (parseFloat(form.capital_rembourse_mensuel) || 0) > 0 && (
              <span style={{ color:C.tm }}>
                {" "}= {euro(parseFloat(form.interets_mensuels) || 0)} intérêts + {euro(parseFloat(form.capital_rembourse_mensuel) || 0)} capital
              </span>
            )}
          </div>
        )}

        <Divider />
        <SectionTitle>Notes</SectionTitle>
        <div style={{ marginBottom:16 }}>
          <textarea
            value={form.notes}
            onChange={e => set("notes", e.target.value)}
            placeholder="Conditions particulières, date de révision, garanties…"
            rows={2}
            style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:13, fontFamily:"inherit", color:C.tx, background:C.cr, outline:"none", boxSizing:"border-box", resize:"vertical" }}
          />
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button
            onClick={() => onSave(form)}
            disabled={!form.target || !form.banque || !form.montant_emprunte}
            style={{ flex:1, padding:"12px", borderRadius:10, border:"none", background:C.g, color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"inherit", opacity: (!form.target || !form.banque || !form.montant_emprunte) ? 0.5 : 1 }}
          >
            {isEdit ? "Enregistrer" : "Ajouter le crédit"}
          </button>
          <button onClick={onClose} style={{ padding:"12px 18px", borderRadius:10, border:`1.5px solid ${C.br}`, background:"transparent", color:C.tm, fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Ligne de crédit ────────────────────────────────────────

function CreditLigne({ c, onEdit, onDelete }: { c: Credit; onEdit: () => void; onDelete: () => void }) {
  const lieu = c.lot_nom ? `${c.bien_nom} / ${c.lot_nom}` : c.bien_nom
  const statut = STATUT_CONFIG[c.statut]
  const mensualiteTotal = c.mensualite_hors_assurance + c.assurance_mensuelle
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ borderBottom:`1px solid ${C.br}`, paddingBottom:10, marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", marginBottom:3 }}>
            <span style={{ fontSize:13 }}>🏦</span>
            <span style={{ fontSize:14, fontWeight:700, color:C.tx }}>{c.banque || "—"}</span>
            <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20, background:statut.bg, color:statut.color }}>
              {statut.label}
            </span>
            <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20, background:C.bp, color:C.bl }}>
              {TYPE_LABELS[c.type_credit]}
            </span>
          </div>
          <div style={{ fontSize:11, color:C.tm, marginBottom:4 }}>
            📅 Depuis {formatDate(c.date_debut)} · {lieu}
          </div>
          <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:C.tm }}>
              Capital restant : <strong style={{ color:C.tx }}>{euro(c.capital_restant_du)}</strong>
            </span>
            <span style={{ fontSize:12, color:C.tm }}>
              Taux : <strong style={{ color:C.tx }}>{pct(c.taux)}</strong>
            </span>
          </div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontSize:10, color:C.tm, textTransform:"uppercase", marginBottom:2 }}>Mensualité totale</div>
          <div style={{ fontSize:18, fontWeight:900, color:C.bl }}>{euro(mensualiteTotal)}</div>
          {c.assurance_mensuelle > 0 && (
            <div style={{ fontSize:10, color:C.tm }}>dont {euro(c.assurance_mensuelle)} assurance</div>
          )}
          <div style={{ display:"flex", gap:4, justifyContent:"flex-end", marginTop:6 }}>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ background:"none", border:`1px solid ${C.br}`, borderRadius:7, padding:"3px 8px", fontSize:11, fontWeight:700, color:C.gl, cursor:"pointer", fontFamily:"inherit" }}
            >
              {expanded ? "▲" : "▼"}
            </button>
            <button
              onClick={onEdit}
              style={{ background:"none", border:`1px solid ${C.br}`, borderRadius:7, padding:"3px 8px", fontSize:11, fontWeight:700, color:C.gl, cursor:"pointer", fontFamily:"inherit" }}
            >
              ✏️
            </button>
            <button
              onClick={onDelete}
              style={{ background:"none", border:`1px solid ${C.br}`, borderRadius:7, padding:"3px 8px", fontSize:11, fontWeight:700, color:C.rd, cursor:"pointer", fontFamily:"inherit" }}
            >
              🗑
            </button>
          </div>
        </div>
      </div>

      {/* Détail déplié */}
      {expanded && (
        <div style={{ marginTop:10, padding:"10px 12px", background:C.bp, borderRadius:9 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:8 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:10, color:C.tm, textTransform:"uppercase", marginBottom:2 }}>Intérêts / mois</div>
              <div style={{ fontSize:14, fontWeight:800, color:C.rd }}>{euro(c.interets_mensuels)}</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:10, color:C.tm, textTransform:"uppercase", marginBottom:2 }}>Capital / mois</div>
              <div style={{ fontSize:14, fontWeight:800, color:C.bl }}>{euro(c.capital_rembourse_mensuel)}</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:10, color:C.tm, textTransform:"uppercase", marginBottom:2 }}>Montant initial</div>
              <div style={{ fontSize:14, fontWeight:800, color:C.tx }}>{euro(c.montant_emprunte)}</div>
            </div>
          </div>
          {c.duree_mois > 0 && (
            <div style={{ marginTop:6 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.tm, marginBottom:3 }}>
                <span>Remboursement</span>
                <span style={{ fontWeight:700 }}>
                  {Math.round((1 - c.capital_restant_du / c.montant_emprunte) * 100)} %
                </span>
              </div>
              <div style={{ height:4, background:"rgba(0,0,0,.1)", borderRadius:4, overflow:"hidden" }}>
                <div
                  style={{ width:`${Math.min(100, Math.round((1 - c.capital_restant_du / c.montant_emprunte) * 100))}%`, height:"100%", background:C.bl, borderRadius:4 }}
                />
              </div>
              <div style={{ fontSize:10, color:C.tm, marginTop:3 }}>
                {euro(c.montant_emprunte - c.capital_restant_du)} remboursé sur {euro(c.montant_emprunte)}
              </div>
            </div>
          )}
          {c.notes && (
            <div style={{ fontSize:11, color:C.tm, marginTop:8, fontStyle:"italic" }}>📝 {c.notes}</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page principale ────────────────────────────────────────

export default function CreditsPage() {
  const [credits,        setCredits]        = useState<Credit[]>([])
  const [bienOptions,    setBienOptions]    = useState<BienOption[]>([])
  const [immeubleGroups, setImmeubleGroups] = useState<ImmeubleGroup[]>([])
  const [loading,        setLoading]        = useState(true)
  const [modal,          setModal]          = useState<null | "add" | "edit">(null)
  const [editTarget,     setEditTarget]     = useState<Credit | null>(null)
  const [filterStatut,   setFilterStatut]   = useState<string>("actif")
  const [toast,          setToast]          = useState<{ msg: string; t: "ok" | "err" } | null>(null)

  useEffect(() => { loadAll() }, [])

  function showToast(msg: string, t: "ok" | "err" = "ok") {
    setToast({ msg, t })
    setTimeout(() => setToast(null), 3000)
  }

  async function loadAll() {
    setLoading(true)
    const [bienRes, lotRes, creditRes] = await Promise.all([
      supabase.from("biens").select("id, nom, type").order("nom"),
      supabase.from("lots").select("id, bien_id, nom"),
      supabase.from("credits").select("*").order("date_debut", { ascending: false }),
    ])

    // Construction du sélecteur bien/lot
    const rawBiens = (bienRes.data ?? []) as { id: string; nom: string; type: string }[]
    const rawLots  = (lotRes.data  ?? []) as { id: string; bien_id: string; nom: string }[]

    const lotsByBien = new Map<string, { id: string; bien_id: string; nom: string }[]>()
    for (const l of rawLots) {
      if (!lotsByBien.has(l.bien_id)) lotsByBien.set(l.bien_id, [])
      lotsByBien.get(l.bien_id)!.push(l)
    }

    const immGroups: ImmeubleGroup[] = []
    const opts: BienOption[] = []

    for (const b of rawBiens) {
      const lots = lotsByBien.get(b.id) ?? []
      if (lots.length > 0) {
        immGroups.push({
          id:   b.id,
          nom:  b.nom,
          lots: lots.map(l => ({ value: `${b.id}|${l.id}`, nom: l.nom })),
        })
        opts.push({ value: b.id, bien_id: b.id, lot_id: null, nom: b.nom, isImmeuble: true })
        for (const l of lots) {
          opts.push({ value: `${b.id}|${l.id}`, bien_id: b.id, lot_id: l.id, nom: `${b.nom} / ${l.nom}`, isImmeuble: false })
        }
      } else {
        opts.push({ value: b.id, bien_id: b.id, lot_id: null, nom: b.nom, isImmeuble: false })
      }
    }

    setBienOptions(opts)
    setImmeubleGroups(immGroups)

    // Construction des crédits avec nom des biens/lots
    const bienMap = new Map(rawBiens.map(b => [b.id, b.nom]))
    const lotMap  = new Map(rawLots.map(l => [l.id, l.nom]))

    const rawCredits = (creditRes.data ?? []) as Omit<Credit, "bien_nom" | "lot_nom">[]
    setCredits(rawCredits.map(c => ({
      ...c,
      bien_nom: bienMap.get(c.bien_id) ?? "—",
      lot_nom:  c.lot_id ? (lotMap.get(c.lot_id) ?? "—") : null,
    })))

    setLoading(false)
  }

  function resolveTarget(target: string) {
    const parts = target.split("|")
    return { bien_id: parts[0], lot_id: parts[1] ?? null }
  }

  async function handleSaveAdd(form: FormState) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { bien_id, lot_id } = resolveTarget(form.target)
    const { error } = await supabase.from("credits").insert({
      user_id:                   user.id,
      bien_id,
      lot_id,
      banque:                    form.banque,
      type_credit:               form.type_credit,
      statut:                    form.statut,
      notes:                     form.notes,
      montant_emprunte:          parseFloat(form.montant_emprunte)          || 0,
      capital_restant_du:        parseFloat(form.capital_restant_du)        || 0,
      taux:                      parseFloat(form.taux)                      || 0,
      duree_mois:                parseInt(form.duree_mois)                  || 240,
      date_debut:                form.date_debut,
      mensualite_hors_assurance: parseFloat(form.mensualite_hors_assurance) || 0,
      assurance_mensuelle:       parseFloat(form.assurance_mensuelle)       || 0,
      capital_rembourse_mensuel: parseFloat(form.capital_rembourse_mensuel) || 0,
      interets_mensuels:         parseFloat(form.interets_mensuels)         || 0,
    })
    if (error) { showToast("Erreur : " + error.message, "err"); return }
    showToast("Crédit ajouté")
    setModal(null)
    loadAll()
  }

  async function handleSaveEdit(form: FormState) {
    if (!editTarget) return
    const { bien_id, lot_id } = resolveTarget(form.target)
    const { error } = await supabase.from("credits").update({
      bien_id,
      lot_id,
      banque:                    form.banque,
      type_credit:               form.type_credit,
      statut:                    form.statut,
      notes:                     form.notes,
      montant_emprunte:          parseFloat(form.montant_emprunte)          || 0,
      capital_restant_du:        parseFloat(form.capital_restant_du)        || 0,
      taux:                      parseFloat(form.taux)                      || 0,
      duree_mois:                parseInt(form.duree_mois)                  || 240,
      date_debut:                form.date_debut,
      mensualite_hors_assurance: parseFloat(form.mensualite_hors_assurance) || 0,
      assurance_mensuelle:       parseFloat(form.assurance_mensuelle)       || 0,
      capital_rembourse_mensuel: parseFloat(form.capital_rembourse_mensuel) || 0,
      interets_mensuels:         parseFloat(form.interets_mensuels)         || 0,
      updated_at:                new Date().toISOString(),
    }).eq("id", editTarget.id)
    if (error) { showToast("Erreur : " + error.message, "err"); return }
    showToast("Crédit mis à jour")
    setModal(null)
    setEditTarget(null)
    loadAll()
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce crédit ?")) return
    const { error } = await supabase.from("credits").delete().eq("id", id)
    if (error) { showToast("Erreur : " + error.message, "err"); return }
    showToast("Crédit supprimé", "err")
    loadAll()
  }

  // ── Calculs agrégés ──────────────────────────────────────
  const actifs = credits.filter(c => c.statut === "actif")
  const totalMensualite    = actifs.reduce((s, c) => s + c.mensualite_hors_assurance + c.assurance_mensuelle, 0)
  const totalDette         = actifs.reduce((s, c) => s + c.capital_restant_du, 0)
  const totalInterets      = actifs.reduce((s, c) => s + c.interets_mensuels, 0)
  const totalCapital       = actifs.reduce((s, c) => s + c.capital_rembourse_mensuel, 0)
  const totalAssurance     = actifs.reduce((s, c) => s + c.assurance_mensuelle, 0)

  const filtered = filterStatut === "tous"
    ? credits
    : credits.filter(c => c.statut === filterStatut)

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, color:C.tm, fontSize:14 }}>
        Chargement…
      </div>
    )
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", background: toast.t === "ok" ? C.g : C.rd, color:"#fff", padding:"10px 20px", borderRadius:10, fontSize:13, fontWeight:700, zIndex:2000, whiteSpace:"nowrap" }}>
          {toast.msg}
        </div>
      )}

      {/* En-tête */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:C.tx, margin:0, lineHeight:1.2 }}>Crédits immobiliers</h1>
          <div style={{ fontSize:13, color:C.tm, marginTop:3 }}>
            {actifs.length} crédit{actifs.length !== 1 ? "s" : ""} actif{actifs.length !== 1 ? "s" : ""}
          </div>
        </div>
        <button
          onClick={() => setModal("add")}
          disabled={bienOptions.length === 0}
          style={{ background:C.g, color:"#fff", border:"none", borderRadius:10, padding:"10px 18px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit", opacity: bienOptions.length === 0 ? 0.5 : 1 }}
        >
          + Nouveau crédit
        </button>
      </div>

      {bienOptions.length === 0 && (
        <div style={{ background:C.wh, borderRadius:14, padding:"40px 20px", textAlign:"center", border:`1px solid ${C.br}`, marginBottom:16 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏦</div>
          <div style={{ fontWeight:700, fontSize:16, color:C.tx, marginBottom:6 }}>Aucun bien enregistré</div>
          <div style={{ color:C.tm, fontSize:13 }}>Ajoutez vos biens avant de saisir vos crédits.</div>
        </div>
      )}

      {/* Synthèse crédits actifs */}
      {actifs.length > 0 && (
        <div style={{ background:`linear-gradient(135deg,${C.bl},#1a5276)`, borderRadius:16, padding:"20px 18px", marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.6)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:12 }}>
            Synthèse crédits actifs
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
            {[
              { label:"Mensualité totale",   value: euro(totalMensualite),  color:"#f5a89a" },
              { label:"Dette restante",      value: euro(totalDette),       color:"#a8d8f5" },
              { label:"Intérêts / mois",     value: euro(totalInterets),    color:"#f5a89a" },
              { label:"Capital / mois",      value: euro(totalCapital),     color:"#a8d8f5" },
            ].map(s => (
              <div key={s.label} style={{ textAlign:"center", padding:"10px 4px", background:"rgba(0,0,0,.15)", borderRadius:10 }}>
                <div style={{ fontSize:16, fontWeight:900, color:s.color, lineHeight:1.1 }}>{s.value}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.5)", marginTop:3, textTransform:"uppercase", letterSpacing:".04em", lineHeight:1.3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {totalAssurance > 0 && (
            <div style={{ marginTop:10, fontSize:11, color:"rgba(255,255,255,.6)", textAlign:"center" }}>
              dont {euro(totalAssurance)} / mois d'assurance emprunteur
            </div>
          )}
        </div>
      )}

      {/* Filtre statut */}
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        {[["actif","Actifs"],["solde","Soldés"],["suspendu","Suspendus"],["tous","Tous"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilterStatut(v)}
            style={{ padding:"5px 14px", borderRadius:20, border:`1.5px solid ${filterStatut === v ? C.g : C.br}`, background: filterStatut === v ? C.gp : C.wh, color: filterStatut === v ? C.g : C.tm, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Liste crédits */}
      {filtered.length === 0 ? (
        <div style={{ background:C.wh, borderRadius:14, padding:"40px 20px", textAlign:"center", border:`1px solid ${C.br}` }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏦</div>
          <div style={{ fontWeight:700, fontSize:16, color:C.tx, marginBottom:6 }}>Aucun crédit trouvé</div>
          <div style={{ color:C.tm, fontSize:13 }}>
            {filterStatut === "actif" ? "Aucun crédit actif." : "Aucun crédit dans cette catégorie."}
          </div>
        </div>
      ) : (
        <div style={{ background:C.wh, borderRadius:14, padding:"16px 18px", border:`1px solid ${C.br}` }}>
          {filtered.map(c => (
            <CreditLigne
              key={c.id}
              c={c}
              onEdit={() => { setEditTarget(c); setModal("edit") }}
              onDelete={() => handleDelete(c.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {modal === "add" && (
        <CreditModal
          onClose={() => setModal(null)}
          onSave={handleSaveAdd}
          bienOptions={bienOptions}
          immeubleGroups={immeubleGroups}
        />
      )}
      {modal === "edit" && editTarget && (
        <CreditModal
          onClose={() => { setModal(null); setEditTarget(null) }}
          onSave={handleSaveEdit}
          initialValues={editTarget}
          bienOptions={bienOptions}
          immeubleGroups={immeubleGroups}
        />
      )}
    </>
  )
}
