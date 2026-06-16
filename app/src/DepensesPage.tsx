import { useState, useMemo, useEffect } from "react"
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
const formatDate = (d: string) => { const [y, m, j] = d.split("-"); return `${j}/${m}/${y}` }
const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]

// ── Catégories détaillées ──────────────────────────────────

type CategorieDep =
  | "gestion" | "copropriete"
  | "assurance_habitation" | "assurance_loyers" | "assurance_pno" | "assurance_emprunteur"
  | "entretien" | "location_frais" | "plateforme" | "comptabilite"
  | "abonnement_elec" | "abonnement_internet" | "abonnement_eau" | "abonnement_gaz"
  | "taxe_fonciere" | "taxe_habitation" | "taxe_sejour" | "cfe" | "charges_sociales"
  | "divers" | "petits_travaux" | "petit_mobilier"
  | "interets_emprunt" | "capital_rembourse"
  | "autre"

interface CatInfo { label: string; emoji: string; bg: string; color: string; ded: boolean }

const CAT_CONFIG: Record<CategorieDep, CatInfo> = {
  gestion:              { label:"Frais de gestion",          emoji:"📋", bg:C.gp,  color:C.g,  ded:true  },
  copropriete:          { label:"Charges de copropriété",    emoji:"🏢", bg:C.bp,  color:C.bl, ded:true  },
  assurance_habitation: { label:"Assurance habitation",      emoji:"🏠", bg:C.pp,  color:C.pu, ded:true  },
  assurance_loyers:     { label:"Assurance loyers impayés",  emoji:"🛡️", bg:C.pp,  color:C.pu, ded:true  },
  assurance_pno:        { label:"Assurance PNO",             emoji:"🛡️", bg:C.pp,  color:C.pu, ded:true  },
  assurance_emprunteur: { label:"Assurance emprunteur",      emoji:"🔒", bg:C.pp,  color:C.pu, ded:false },
  entretien:            { label:"Ménage & entretien",        emoji:"🧹", bg:C.gp,  color:C.g,  ded:true  },
  location_frais:       { label:"Frais de location",         emoji:"📝", bg:C.gp,  color:C.g,  ded:true  },
  plateforme:           { label:"Frais de plateformes",      emoji:"📱", bg:C.op,  color:C.or, ded:true  },
  comptabilite:         { label:"Frais de comptabilité",     emoji:"📊", bg:C.gp,  color:C.g,  ded:true  },
  abonnement_elec:      { label:"Électricité",               emoji:"⚡", bg:C.dp,  color:C.gd, ded:true  },
  abonnement_internet:  { label:"Internet / Téléphone",      emoji:"📡", bg:C.dp,  color:C.gd, ded:true  },
  abonnement_eau:       { label:"Eau",                       emoji:"💧", bg:C.bp,  color:C.bl, ded:true  },
  abonnement_gaz:       { label:"Gaz",                       emoji:"🔥", bg:C.op,  color:C.or, ded:true  },
  taxe_fonciere:        { label:"Taxe foncière",             emoji:"🏛️", bg:C.dp,  color:C.gd, ded:true  },
  taxe_habitation:      { label:"Taxe d'habitation",         emoji:"🏛️", bg:C.dp,  color:C.gd, ded:false },
  taxe_sejour:          { label:"Taxe de séjour",            emoji:"🏖️", bg:C.dp,  color:C.gd, ded:false },
  cfe:                  { label:"CFE",                       emoji:"📜", bg:C.dp,  color:C.gd, ded:true  },
  charges_sociales:     { label:"Charges sociales SSI",      emoji:"👥", bg:C.cr2, color:C.tm, ded:true  },
  divers:               { label:"Dépenses diverses",         emoji:"📌", bg:C.cr2, color:C.tm, ded:true  },
  petits_travaux:       { label:"Petits travaux < 600 €",    emoji:"🔧", bg:C.op,  color:C.or, ded:true  },
  petit_mobilier:       { label:"Petit mobilier < 600 €",    emoji:"🪑", bg:C.op,  color:C.or, ded:true  },
  interets_emprunt:     { label:"Intérêts d'emprunt",        emoji:"🏦", bg:C.cr2, color:C.tm, ded:true  },
  capital_rembourse:    { label:"Capital remboursé",         emoji:"🔄", bg:C.bp,  color:C.bl, ded:false },
  autre:                { label:"Autre",                     emoji:"📄", bg:C.cr2, color:C.tm, ded:true  },
}

interface CatGroup { id: string; label: string; emoji: string; color: string; bg: string; cats: CategorieDep[] }

const CAT_GROUPS: CatGroup[] = [
  { id:"gestion",    label:"Frais de gestion & admin.",  emoji:"📋", color:C.g,  bg:C.gp,  cats:["gestion","copropriete","entretien","location_frais","plateforme","comptabilite"] },
  { id:"assurance",  label:"Assurances",                 emoji:"🛡️", color:C.pu, bg:C.pp,  cats:["assurance_habitation","assurance_loyers","assurance_pno","assurance_emprunteur"] },
  { id:"abonnement", label:"Abonnements",                emoji:"⚡", color:C.gd, bg:C.dp,  cats:["abonnement_elec","abonnement_internet","abonnement_eau","abonnement_gaz"] },
  { id:"taxes",      label:"Taxes & prélèvements",       emoji:"🏛️", color:C.gd, bg:C.dp,  cats:["taxe_fonciere","taxe_habitation","taxe_sejour","cfe","charges_sociales"] },
  { id:"travaux",    label:"Travaux & mobilier",         emoji:"🔧", color:C.or, bg:C.op,  cats:["petits_travaux","petit_mobilier"] },
  { id:"emprunt",    label:"Emprunt & financement",      emoji:"🏦", color:C.bl, bg:C.bp,  cats:["interets_emprunt","capital_rembourse"] },
  { id:"autre",      label:"Autres dépenses",            emoji:"📌", color:C.tm, bg:C.cr2, cats:["divers","autre"] },
]

const DEFAULT_CAT: CategorieDep = "gestion"

// ── Types Supabase ─────────────────────────────────────────

interface BienOption {
  value:      string       // "bien_id" ou "bien_id|lot_id"
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

interface Depense {
  id:          string
  user_id:     string
  bien_id:     string
  bien_nom:    string
  lot_id:      string | null
  lot_nom:     string | null
  categorie:   CategorieDep
  montant:     number
  date:        string
  description?: string
  deductible:  boolean
  recuperable: boolean
  payee:       boolean
}

interface FormState {
  target:      string
  categorie:   CategorieDep
  montant:     string
  date:        string
  description: string
  deductible:  boolean
  recuperable: boolean
  payee:       boolean
}

const today = new Date().toISOString().slice(0, 10)

function resolveTarget(target: string, opts: BienOption[]) {
  const opt = opts.find(o => o.value === target)
  return { bien_id: opt?.bien_id ?? "", lot_id: opt?.lot_id ?? null }
}

// ── Primitives UI ──────────────────────────────────────────

function Badge({ label, bg = C.gp, color = C.g }: { label: string; bg?: string; color?: string }) {
  return (
    <span style={{ display:"inline-block", padding:"2px 9px", borderRadius:20, background:bg, color, fontSize:11, fontWeight:700 }}>
      {label}
    </span>
  )
}

function FieldSelect({
  label, value, onChange, children,
}: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display:"block", fontSize:10, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:3 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width:"100%", padding:"8px 10px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:13, fontFamily:"inherit", color:C.tx, background:C.cr, outline:"none", boxSizing:"border-box" }}
      >
        {children}
      </select>
    </div>
  )
}

function FieldInput({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div style={{ marginBottom:12 }}>
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

// ── Sélecteur bien/lot avec optgroups ──────────────────────

function BienSelect({ value, onChange, bienOptions, immeubleGroups, style }: {
  value: string
  onChange: (v: string) => void
  bienOptions: BienOption[]
  immeubleGroups: ImmeubleGroup[]
  style?: React.CSSProperties
}) {
  const immeubleIds = new Set(immeubleGroups.map(g => g.id))
  const simples = bienOptions.filter(o => !o.lot_id && !immeubleIds.has(o.bien_id))
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:14, fontFamily:"inherit", color:C.tx, background:C.cr, outline:"none", boxSizing:"border-box", ...style }}
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

// ── Ligne de dépense ───────────────────────────────────────

function DepenseLigne({ d, onEdit, onDelete }: { d: Depense; onEdit: () => void; onDelete: () => void }) {
  const cfg = CAT_CONFIG[d.categorie]
  const lieu = d.lot_nom ? `${d.bien_nom} / ${d.lot_nom}` : d.bien_nom
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"10px 0", borderBottom:`1px solid ${C.br}`, gap:12 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", marginBottom:3 }}>
          <span style={{ fontSize:13 }}>{cfg.emoji}</span>
          <span style={{ fontSize:13, fontWeight:600, color:C.tx }}>{d.description || cfg.label}</span>
          {!d.deductible  && <Badge label="Non déductible" bg={C.rp} color={C.rd} />}
          {d.recuperable  && <Badge label="Récupérable" bg={C.gp} color={C.g} />}
          {!d.payee       && <Badge label="Non payée" bg={C.dp} color={C.gd} />}
        </div>
        <div style={{ fontSize:11, color:C.tm }}>📅 {formatDate(d.date)} · {lieu}</div>
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ fontWeight:800, fontSize:15, color:d.deductible ? C.rd : C.tm, whiteSpace:"nowrap", marginBottom:6 }}>
          −{euro(d.montant)}
        </div>
        <div style={{ display:"flex", gap:4, justifyContent:"flex-end" }}>
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
  )
}

// ── Toggle booléen ─────────────────────────────────────────

function Toggle({ value, onChange, labelOn, labelOff, descOn, descOff, colorOn = C.g, bgOn = C.gp, colorOff = C.tm, bgOff = C.cr2 }: {
  value: boolean; onChange: (v: boolean) => void
  labelOn: string; labelOff: string; descOn?: string; descOff?: string
  colorOn?: string; bgOn?: string; colorOff?: string; bgOff?: string
}) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:10, background: value ? bgOn : bgOff, cursor:"pointer", marginBottom:12 }}
    >
      <div style={{ width:20, height:20, borderRadius:6, background: value ? colorOn : colorOff, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {value && <span style={{ color:"#fff", fontSize:13, fontWeight:900 }}>✓</span>}
      </div>
      <div>
        <div style={{ fontSize:13, fontWeight:700, color: value ? colorOn : colorOff }}>
          {value ? labelOn : labelOff}
        </div>
        {(value ? descOn : descOff) && (
          <div style={{ fontSize:11, color:C.tm }}>{value ? descOn : descOff}</div>
        )}
      </div>
    </div>
  )
}

// ── Modal dépense ──────────────────────────────────────────

function DepenseModal({ onClose, onSave, initialValues, bienOptions, immeubleGroups }: {
  onClose: () => void
  onSave: (form: FormState) => void
  initialValues?: Depense
  bienOptions: BienOption[]
  immeubleGroups: ImmeubleGroup[]
}) {
  const isEdit = !!initialValues
  const defaultTarget = bienOptions[0]?.value ?? ""
  const [form, setForm] = useState<FormState>({
    target:      initialValues
      ? (initialValues.lot_id ? `${initialValues.bien_id}|${initialValues.lot_id}` : initialValues.bien_id)
      : defaultTarget,
    categorie:   initialValues?.categorie  ?? DEFAULT_CAT,
    montant:     initialValues?.montant.toString() ?? "",
    date:        initialValues?.date       ?? today,
    description: initialValues?.description ?? "",
    deductible:  initialValues?.deductible ?? true,
    recuperable: initialValues?.recuperable ?? false,
    payee:       initialValues?.payee      ?? true,
  })

  const set = (key: keyof FormState) => (v: string | boolean) =>
    setForm(f => ({ ...f, [key]: v }))

  const handleCatChange = (cat: CategorieDep) =>
    setForm(f => ({ ...f, categorie: cat, deductible: CAT_CONFIG[cat].ded }))

  const canSave = !!form.montant && parseFloat(form.montant) > 0 && !!form.date && !!form.target

  const cfg = CAT_CONFIG[form.categorie]

  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:900, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:C.wh, borderRadius:"18px 18px 0 0", padding:"24px 20px 36px", width:"100%", maxWidth:540, maxHeight:"92vh", overflowY:"auto" }}
      >
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:17, color:C.rd }}>
            {isEdit ? "Modifier la dépense" : "Nouvelle dépense"}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.tm }}>✕</button>
        </div>

        {/* Catégorie */}
        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:6 }}>
            Catégorie
          </label>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:9, background:cfg.bg, marginBottom:8 }}>
            <span style={{ fontSize:18 }}>{cfg.emoji}</span>
            <span style={{ fontSize:13, fontWeight:700, color:cfg.color }}>{cfg.label}</span>
          </div>
          <select
            value={form.categorie}
            onChange={e => handleCatChange(e.target.value as CategorieDep)}
            style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:13, fontFamily:"inherit", color:C.tx, background:C.cr, outline:"none", boxSizing:"border-box" }}
          >
            {CAT_GROUPS.map(g => (
              <optgroup key={g.id} label={`${g.emoji} ${g.label}`}>
                {g.cats.map(cat => (
                  <option key={cat} value={cat}>{CAT_CONFIG[cat].emoji} {CAT_CONFIG[cat].label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Bien / lot */}
        <div style={{ marginBottom:12 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>
            Bien concerné
          </label>
          {bienOptions.length === 0 ? (
            <div style={{ padding:"9px 11px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:13, color:C.tm, background:C.cr }}>
              Aucun bien — ajoutez d'abord un bien dans la page Biens.
            </div>
          ) : (
            <BienSelect
              value={form.target}
              onChange={v => set("target")(v)}
              bienOptions={bienOptions}
              immeubleGroups={immeubleGroups}
            />
          )}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FieldInput
            label="Montant (€) *"
            type="number" min="0" step="0.01" placeholder="0.00"
            value={form.montant}
            onChange={e => set("montant")(e.target.value)}
          />
          <FieldInput
            label="Date *"
            type="date"
            value={form.date}
            onChange={e => set("date")(e.target.value)}
          />
        </div>

        <FieldInput
          label="Description"
          placeholder="Ex. Charges copro T2 2026"
          value={form.description}
          onChange={e => set("description")(e.target.value)}
        />

        <Toggle
          value={form.deductible}
          onChange={v => set("deductible")(v)}
          labelOn="Déductible fiscalement"
          labelOff="Non déductible"
          descOn="Comptabilisée dans le bilan fiscal"
          descOff="Ex. remboursement capital emprunt"
          colorOn={C.g} bgOn={C.gp} colorOff={C.rd} bgOff={C.rp}
        />

        <Toggle
          value={form.recuperable}
          onChange={v => set("recuperable")(v)}
          labelOn="Récupérable sur le locataire"
          labelOff="Non récupérable"
          descOn="Ex. charges de copropriété refacturables"
          colorOn={C.bl} bgOn={C.bp}
        />

        <Toggle
          value={form.payee}
          onChange={v => set("payee")(v)}
          labelOn="Payée"
          labelOff="Non encore payée"
          descOn="La dépense a été réglée"
          descOff="En attente de paiement"
          colorOn={C.g} bgOn={C.gp} colorOff={C.gd} bgOff={C.dp}
        />

        <button
          onClick={() => { if (canSave) onSave(form) }}
          disabled={!canSave}
          style={{ width:"100%", padding:"13px 0", borderRadius:10, background: canSave ? C.rd : C.cr2, color: canSave ? "#fff" : C.tm, border:"none", fontWeight:800, fontSize:15, cursor: canSave ? "pointer" : "not-allowed", fontFamily:"inherit" }}
        >
          {isEdit ? "Enregistrer les modifications" : "Enregistrer la dépense"}
        </button>
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────

export default function DepensesPage() {
  const [depenses,       setDepenses]       = useState<Depense[]>([])
  const [bienOptions,    setBienOptions]    = useState<BienOption[]>([])
  const [immeubleGroups, setImmeubleGroups] = useState<ImmeubleGroup[]>([])
  const [loading,        setLoading]        = useState(true)
  const [filterTarget,   setFilterTarget]   = useState("")
  const [filterAnnee,    setFilterAnnee]    = useState(new Date().getFullYear())
  const [filterMois,     setFilterMois]     = useState(0)
  const [filterGroupe,   setFilterGroupe]   = useState("")
  const [showAdd,        setShowAdd]        = useState(false)
  const [editItem,       setEditItem]       = useState<Depense | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [bienRes, lotRes, depRes] = await Promise.all([
      supabase.from("biens").select("id, nom").order("nom"),
      supabase.from("lots").select("id, bien_id, nom"),
      supabase.from("depenses").select("*").order("date_depense", { ascending: false }),
    ])

    const rawBiens = (bienRes.data ?? []) as { id: string; nom: string }[]
    const rawLots  = (lotRes.data  ?? []) as { id: string; bien_id: string; nom: string }[]
    const rawDeps  = (depRes.data  ?? []) as Record<string, unknown>[]

    const bienMap = new Map(rawBiens.map(b => [b.id, b.nom]))
    const lotMap  = new Map(rawLots.map(l => [l.id, { nom: l.nom, bien_id: l.bien_id }]))

    const lotsByBien = new Map<string, typeof rawLots>()
    for (const l of rawLots) {
      if (!lotsByBien.has(l.bien_id)) lotsByBien.set(l.bien_id, [])
      lotsByBien.get(l.bien_id)!.push(l)
    }

    const immeubleIds = new Set(rawLots.map(l => l.bien_id))
    const newOptions: BienOption[] = []
    const newGroups: ImmeubleGroup[] = []

    for (const b of rawBiens) {
      if (immeubleIds.has(b.id)) {
        const groupLots = (lotsByBien.get(b.id) ?? []).map(l => ({
          value: `${b.id}|${l.id}`,
          nom:   l.nom,
        }))
        newGroups.push({ id: b.id, nom: b.nom, lots: groupLots })
        newOptions.push({ value: b.id, bien_id: b.id, lot_id: null, nom: b.nom, isImmeuble: true })
        for (const l of rawLots.filter(l => l.bien_id === b.id)) {
          newOptions.push({ value: `${b.id}|${l.id}`, bien_id: b.id, lot_id: l.id, nom: l.nom, isImmeuble: false })
        }
      } else {
        newOptions.push({ value: b.id, bien_id: b.id, lot_id: null, nom: b.nom, isImmeuble: false })
      }
    }

    const deps: Depense[] = rawDeps.map(r => ({
      id:          r.id as string,
      user_id:     r.user_id as string,
      bien_id:     r.bien_id as string,
      bien_nom:    bienMap.get(r.bien_id as string) ?? "",
      lot_id:      (r.lot_id as string | null) ?? null,
      lot_nom:     r.lot_id ? (lotMap.get(r.lot_id as string)?.nom ?? null) : null,
      categorie:   r.categorie as CategorieDep,
      montant:     Number(r.montant),
      date:        r.date_depense as string,
      description: (r.description as string | null) ?? undefined,
      deductible:  r.deductible as boolean,
      recuperable: r.recuperable as boolean,
      payee:       r.payee as boolean,
    }))

    setBienOptions(newOptions)
    setImmeubleGroups(newGroups)
    setDepenses(deps)
    setLoading(false)
  }

  // Années disponibles depuis les données réelles
  const anneesDispos = useMemo(() => {
    const years = new Set(depenses.map(d => parseInt(d.date.slice(0, 4))))
    const cur = new Date().getFullYear()
    years.add(cur)
    years.add(cur - 1)
    return Array.from(years).sort((a, b) => b - a)
  }, [depenses])

  const filtered = useMemo(() => {
    return depenses.filter(d => {
      const [y, m] = d.date.split("-")
      if (parseInt(y) !== filterAnnee)              return false
      if (filterMois && parseInt(m) !== filterMois) return false
      if (filterTarget) {
        if (filterTarget.includes("|")) {
          const [, lotId] = filterTarget.split("|")
          if (d.lot_id !== lotId) return false
        } else {
          if (d.bien_id !== filterTarget) return false
        }
      }
      if (filterGroupe) {
        const g = CAT_GROUPS.find(g => g.id === filterGroupe)
        if (g && !(g.cats as string[]).includes(d.categorie)) return false
      }
      return true
    })
  }, [depenses, filterTarget, filterAnnee, filterMois, filterGroupe])

  const totalPeriode    = filtered.reduce((s, d) => s + d.montant, 0)
  const totalDeductible = filtered.filter(d => d.deductible).reduce((s, d) => s + d.montant, 0)
  const nbMoisActifs    = useMemo(() => new Set(filtered.map(d => d.date.slice(0, 7))).size, [filtered])
  const moyMensuelle    = nbMoisActifs > 0 ? totalPeriode / nbMoisActifs : 0

  const groupedByCat = useMemo(() => {
    return CAT_GROUPS
      .filter(g => !filterGroupe || g.id === filterGroupe)
      .map(g => {
        const items = filtered
          .filter(d => (g.cats as string[]).includes(d.categorie))
          .sort((a, b) => b.date.localeCompare(a.date))
        const total    = items.reduce((s, d) => s + d.montant, 0)
        const totalDed = items.filter(d => d.deductible).reduce((s, d) => s + d.montant, 0)
        const byCat: Partial<Record<CategorieDep, Depense[]>> = {}
        for (const d of items) {
          if (!byCat[d.categorie]) byCat[d.categorie] = []
          byCat[d.categorie]!.push(d)
        }
        return { g, items, total, totalDed, byCat }
      })
  }, [filtered, filterGroupe])

  async function handleDelete(id: string) {
    if (!window.confirm("Supprimer cette dépense ?")) return
    await supabase.from("depenses").delete().eq("id", id)
    setDepenses(prev => prev.filter(d => d.id !== id))
  }

  async function handleSaveAdd(form: FormState) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { bien_id, lot_id } = resolveTarget(form.target, bienOptions)
    await supabase.from("depenses").insert({
      user_id:      user.id,
      bien_id,
      lot_id,
      categorie:    form.categorie,
      montant:      parseFloat(form.montant),
      date_depense: form.date,
      description:  form.description || null,
      deductible:   form.deductible,
      recuperable:  form.recuperable,
      payee:        form.payee,
    })
    setShowAdd(false)
    await load()
  }

  async function handleSaveEdit(form: FormState) {
    if (!editItem) return
    const { bien_id, lot_id } = resolveTarget(form.target, bienOptions)
    await supabase.from("depenses").update({
      bien_id,
      lot_id,
      categorie:    form.categorie,
      montant:      parseFloat(form.montant),
      date_depense: form.date,
      description:  form.description || null,
      deductible:   form.deductible,
      recuperable:  form.recuperable,
      payee:        form.payee,
    }).eq("id", editItem.id)
    setEditItem(null)
    await load()
  }

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, color:C.tm, fontSize:14 }}>
        Chargement…
      </div>
    )
  }

  return (
    <>
      {/* ── En-tête ──────────────────────────────────────── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:C.tx, margin:0, lineHeight:1.2 }}>Dépenses</h1>
          <div style={{ fontSize:13, color:C.tm, marginTop:3 }}>
            {filtered.length} dépense{filtered.length !== 1 ? "s" : ""} · {filterAnnee}
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ background:C.g, color:"#fff", border:"none", borderRadius:10, padding:"10px 18px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}
        >
          + Ajouter
        </button>
      </div>

      {/* ── Filtres ───────────────────────────────────────── */}
      <div style={{ background:C.wh, borderRadius:12, padding:"14px 16px", border:`1px solid ${C.br}`, marginBottom:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div>
          <label style={{ display:"block", fontSize:10, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:3 }}>Bien</label>
          <select
            value={filterTarget}
            onChange={e => setFilterTarget(e.target.value)}
            style={{ width:"100%", padding:"8px 10px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:13, fontFamily:"inherit", color:C.tx, background:C.cr, outline:"none", boxSizing:"border-box" }}
          >
            <option value="">Tous les biens</option>
            {bienOptions.filter(o => !o.lot_id && !immeubleGroups.some(g => g.id === o.bien_id)).map(o => (
              <option key={o.value} value={o.value}>{o.nom}</option>
            ))}
            {immeubleGroups.map(g => (
              <optgroup key={g.id} label={`🏢 ${g.nom}`}>
                <option value={g.id}>{g.nom} (tous les lots)</option>
                {g.lots.map(l => <option key={l.value} value={l.value}>└ {l.nom}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <FieldSelect label="Groupe de dépenses" value={filterGroupe} onChange={setFilterGroupe}>
          <option value="">Tous les groupes</option>
          {CAT_GROUPS.map(g => <option key={g.id} value={g.id}>{g.emoji} {g.label}</option>)}
        </FieldSelect>
        <FieldSelect label="Année" value={filterAnnee.toString()} onChange={v => setFilterAnnee(parseInt(v))}>
          {anneesDispos.map(a => <option key={a} value={a}>{a}</option>)}
        </FieldSelect>
        <FieldSelect label="Mois" value={filterMois.toString()} onChange={v => setFilterMois(parseInt(v))}>
          <option value="0">Tous les mois</option>
          {MOIS_FR.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </FieldSelect>
      </div>

      {/* ── Stats globales ────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
        {[
          { label: filterMois ? "Total du mois" : "Total période", value: euro(totalPeriode),    color: C.rd },
          { label: "Dont déductibles",  value: euro(totalDeductible),       color: C.g  },
          { label: "Nb dépenses",       value: filtered.length.toString(),  color: C.tx },
          { label: "Moy. mensuelle",    value: euro(moyMensuelle),          color: C.gd },
        ].map(s => (
          <div key={s.label} style={{ background:C.wh, borderRadius:12, padding:"14px 12px", border:`1px solid ${C.br}`, textAlign:"center" }}>
            <div style={{ fontSize:15, fontWeight:900, color:s.color, lineHeight:1.2 }}>{s.value}</div>
            <div style={{ fontSize:10, color:C.tm, marginTop:3, textTransform:"uppercase", letterSpacing:".05em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Synthèse par groupe ───────────────────────────── */}
      <div style={{ background:C.wh, borderRadius:12, padding:"14px 16px", border:`1px solid ${C.br}`, marginBottom:18 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:12 }}>
          Synthèse par catégorie
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
          {CAT_GROUPS.map((g, i) => {
            const montant = filtered
              .filter(d => (g.cats as string[]).includes(d.categorie))
              .reduce((s, d) => s + d.montant, 0)
            const pct = totalPeriode > 0 ? Math.round(montant / totalPeriode * 100) : 0
            const isLast = i === CAT_GROUPS.length - 1
            return (
              <div
                key={g.id}
                onClick={() => setFilterGroupe(filterGroupe === g.id ? "" : g.id)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 6px", borderBottom: isLast ? "none" : `1px solid ${C.br}`, cursor:"pointer", borderRadius: filterGroupe === g.id ? 8 : 0, background: filterGroupe === g.id ? g.bg : "transparent" }}
              >
                <span style={{ fontSize:15, width:24, textAlign:"center", flexShrink:0 }}>{g.emoji}</span>
                <span style={{ flex:1, fontSize:13, color:C.tx, fontWeight:filterGroupe === g.id ? 700 : 400 }}>{g.label}</span>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                  {pct > 0 && (
                    <span style={{ fontSize:10, color:g.color, background:g.bg, padding:"1px 7px", borderRadius:8, fontWeight:700 }}>{pct}%</span>
                  )}
                  <span style={{ fontSize:13, fontWeight:800, color: montant > 0 ? C.rd : C.tm, minWidth:80, textAlign:"right" }}>
                    {montant > 0 ? `−${euro(montant)}` : "—"}
                  </span>
                </div>
              </div>
            )
          })}
          <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 6px", borderTop:`2px solid ${C.br}`, marginTop:4 }}>
            <span style={{ fontSize:13, fontWeight:800, color:C.tx }}>Total</span>
            <span style={{ fontSize:14, fontWeight:900, color:C.rd }}>−{euro(totalPeriode)}</span>
          </div>
        </div>
      </div>

      {/* ── Liste groupée par catégorie ───────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ background:C.wh, borderRadius:14, padding:"56px 20px", textAlign:"center", border:`1px solid ${C.br}` }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📉</div>
          <div style={{ fontWeight:700, fontSize:15, color:C.tx, marginBottom:6 }}>Aucune dépense</div>
          <div style={{ color:C.tm, fontSize:13, marginBottom:20 }}>Modifiez les filtres ou ajoutez une dépense.</div>
          <button onClick={() => setShowAdd(true)} style={{ background:C.g, color:"#fff", border:"none", borderRadius:10, padding:"11px 22px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
            + Ajouter une dépense
          </button>
        </div>
      ) : (
        groupedByCat
          .filter(({ items }) => items.length > 0)
          .map(({ g, items, total, totalDed, byCat }) => (
            <div key={g.id} style={{ marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:`linear-gradient(90deg,${g.bg},${g.bg}88)`, borderRadius:"10px 10px 0 0", borderLeft:`4px solid ${g.color}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:16 }}>{g.emoji}</span>
                  <span style={{ fontWeight:800, fontSize:14, color:g.color }}>{g.label}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:g.color, background:`${g.color}22`, padding:"1px 7px", borderRadius:8 }}>
                    {items.length}
                  </span>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontWeight:900, fontSize:15, color:C.rd }}>−{euro(total)}</div>
                  {totalDed < total && (
                    <div style={{ fontSize:10, color:C.tm }}>dont {euro(totalDed)} déductible</div>
                  )}
                </div>
              </div>

              <div style={{ background:C.wh, border:`1px solid ${C.br}`, borderTop:"none", borderRadius:"0 0 10px 10px", overflow:"hidden" }}>
                {g.cats
                  .filter(cat => (byCat[cat]?.length ?? 0) > 0)
                  .map((cat, ci, arr) => {
                    const cfg = CAT_CONFIG[cat]
                    const catItems = byCat[cat]!
                    const catTotal = catItems.reduce((s, d) => s + d.montant, 0)
                    const isLastCat = ci === arr.length - 1
                    return (
                      <div key={cat} style={{ borderBottom: isLastCat ? "none" : `1px solid ${C.br}` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 16px", background:C.cr }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ fontSize:13 }}>{cfg.emoji}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:cfg.color, textTransform:"uppercase", letterSpacing:".05em" }}>{cfg.label}</span>
                          </div>
                          <span style={{ fontSize:12, fontWeight:800, color:C.rd }}>−{euro(catTotal)}</span>
                        </div>
                        <div style={{ padding:"0 16px" }}>
                          {catItems.map(d => (
                            <DepenseLigne key={d.id} d={d} onEdit={() => setEditItem(d)} onDelete={() => handleDelete(d.id)} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))
      )}

      {/* ── Modals ────────────────────────────────────────── */}
      {showAdd && (
        <DepenseModal
          bienOptions={bienOptions}
          immeubleGroups={immeubleGroups}
          onClose={() => setShowAdd(false)}
          onSave={handleSaveAdd}
        />
      )}
      {editItem && (
        <DepenseModal
          initialValues={editItem}
          bienOptions={bienOptions}
          immeubleGroups={immeubleGroups}
          onClose={() => setEditItem(null)}
          onSave={handleSaveEdit}
        />
      )}
    </>
  )
}
