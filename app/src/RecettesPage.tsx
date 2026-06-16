import { useState, useEffect, useMemo } from "react"
import { supabase } from "./supabase"

const C = {
  g:   "#2d5b3d", gl:  "#3d7a52", gp:  "#e6efe9",
  cr:  "#f7f4ee", cr2: "#eeebe3",
  tx:  "#1a2a1f", tm:  "#6b8c74",
  rd:  "#c0392b", rp:  "#fdecea",
  bl:  "#2471a3", bp:  "#eaf4fb",
  gd:  "#b7860b", dp:  "#fef9e7",
  wh:  "#ffffff", br:  "#dde8e0",
}

const euro = (n: number) => n.toLocaleString("fr-FR", { style:"currency", currency:"EUR" })
const formatDate = (d: string) => { const [y,m,j] = d.split("-"); return `${j}/${m}/${y}` }
const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]

// ── Types ──────────────────────────────────────────────────
type TypeRecette = "loyer" | "charges" | "depot_garantie" | "airbnb" | "autre"

interface Recette {
  id: string
  bien_id: string
  lot_id: string | null
  bien_nom: string
  locataire_nom?: string
  type: TypeRecette
  montant: number
  date: string
  description?: string
}

const TYPE_CONFIG: Record<TypeRecette, { label: string; bg: string; color: string }> = {
  loyer:          { label: "Loyer HC",            bg: C.gp,       color: C.g        },
  charges:        { label: "Charges récupérées",  bg: C.bp,       color: C.bl       },
  depot_garantie: { label: "Dépôt garantie",      bg: C.dp,       color: C.gd       },
  airbnb:         { label: "Airbnb",              bg: "#fdf2e9",  color: "#ca6f1e"  },
  autre:          { label: "Autre revenu",         bg: C.cr2,      color: C.tm       },
}

// Encoded as "bien_id" for simples/immeubles, "bien_id|lot_id" for lots
interface BienOption {
  value: string
  label: string
  bien_id: string
  lot_id: string | null
  display_nom: string
}

interface ImmeubleGroup { id: string; nom: string; lots: BienOption[] }

interface FormState {
  target: string
  type: TypeRecette
  montant: string
  date: string
  locataire_nom: string
  description: string
}

const today = new Date().toISOString().slice(0, 10)

// ── Primitives UI ──────────────────────────────────────────

function Badge({ label, bg = C.gp, color = C.g }: { label: string; bg?: string; color?: string }) {
  return <span style={{ display:"inline-block", padding:"2px 9px", borderRadius:20, background:bg, color, fontSize:11, fontWeight:700 }}>{label}</span>
}

function FieldInput({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>{label}</label>
      <input style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:14, fontFamily:"inherit", color:C.tx, background:C.cr, outline:"none", boxSizing:"border-box" }} {...props} />
    </div>
  )
}

// ── BienSelect — réutilisé dans modal et filtre ────────────

function BienSelect({ value, onChange, bienOptions, immeubleGroups, allLabel = "Tous les biens" }: {
  value: string; onChange: (v: string) => void
  bienOptions: BienOption[]; immeubleGroups: ImmeubleGroup[]
  allLabel?: string
}) {
  const simples = bienOptions.filter(o => !o.lot_id && !immeubleGroups.some(g => g.id === o.bien_id))
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:14, fontFamily:"inherit", color:C.tx, background:C.cr, outline:"none", boxSizing:"border-box" }}
    >
      {allLabel && <option value="">{allLabel}</option>}
      {simples.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      {immeubleGroups.map(g => (
        <optgroup key={g.id} label={`🏢 ${g.nom}`}>
          <option value={g.id}>{g.nom} (niveau immeuble)</option>
          {g.lots.map(l => <option key={l.value} value={l.value}>└ {l.label.split(" · ")[0]}</option>)}
        </optgroup>
      ))}
    </select>
  )
}

// ── Ligne de recette ───────────────────────────────────────

function RecetteLigne({ r, onEdit, onDelete }: { r: Recette; onEdit: () => void; onDelete: () => void }) {
  const cfg = TYPE_CONFIG[r.type]
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"11px 0", borderBottom:`1px solid ${C.br}`, gap:12 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", marginBottom:4 }}>
          <Badge label={cfg.label} bg={cfg.bg} color={cfg.color} />
          <span style={{ fontSize:12, color:C.tm }}>{r.bien_nom}</span>
          {r.locataire_nom && <span style={{ fontSize:11, color:C.tm }}>· 👤 {r.locataire_nom}</span>}
        </div>
        {r.description && <div style={{ fontSize:13, color:C.tx, fontWeight:500 }}>{r.description}</div>}
        <div style={{ fontSize:11, color:C.tm, marginTop:2 }}>📅 {formatDate(r.date)}</div>
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ fontWeight:800, fontSize:15, color:C.g, whiteSpace:"nowrap", marginBottom:6 }}>+{euro(r.montant)}</div>
        <div style={{ display:"flex", gap:4, justifyContent:"flex-end" }}>
          <button onClick={onEdit} style={{ background:"none", border:`1px solid ${C.br}`, borderRadius:7, padding:"3px 8px", fontSize:11, fontWeight:700, color:C.gl, cursor:"pointer", fontFamily:"inherit" }}>Modifier</button>
          <button onClick={onDelete} style={{ background:"none", border:`1px solid ${C.br}`, borderRadius:7, padding:"3px 8px", fontSize:11, fontWeight:700, color:C.rd, cursor:"pointer", fontFamily:"inherit" }}>Supprimer</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal recette ──────────────────────────────────────────

function RecetteModal({ onClose, onSave, initialValues, bienOptions, immeubleGroups }: {
  onClose: () => void
  onSave: (f: FormState) => void
  initialValues?: Recette
  bienOptions: BienOption[]
  immeubleGroups: ImmeubleGroup[]
}) {
  const defaultTarget = bienOptions[0]?.value ?? ""
  const [form, setForm] = useState<FormState>({
    target:       initialValues
      ? (initialValues.lot_id ? `${initialValues.bien_id}|${initialValues.lot_id}` : initialValues.bien_id)
      : defaultTarget,
    type:         initialValues?.type            ?? "loyer",
    montant:      initialValues?.montant.toString() ?? "",
    date:         initialValues?.date            ?? today,
    locataire_nom: initialValues?.locataire_nom  ?? "",
    description:  initialValues?.description     ?? "",
  })
  const set = (k: keyof FormState) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const canSave = !!form.montant && !!form.date && !!form.target

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:900, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.wh, borderRadius:"18px 18px 0 0", padding:"24px 20px 36px", width:"100%", maxWidth:540, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:17, color:C.g }}>{initialValues ? "Modifier la recette" : "Nouvelle recette"}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.tm }}>✕</button>
        </div>

        {/* Type */}
        <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
          {(Object.entries(TYPE_CONFIG) as [TypeRecette, typeof TYPE_CONFIG[TypeRecette]][]).map(([k, v]) => (
            <button key={k} onClick={() => set("type")(k)} style={{
              flex:"1 1 auto", padding:"8px 6px", borderRadius:9,
              border:`2px solid ${form.type === k ? v.color : C.br}`,
              background: form.type === k ? v.bg : C.wh,
              color: form.type === k ? v.color : C.tm,
              fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:"inherit",
            }}>{v.label}</button>
          ))}
        </div>

        {/* Bien / Lot */}
        <div style={{ marginBottom:12 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>Bien / Lot *</label>
          <BienSelect value={form.target} onChange={v => set("target")(v)} bienOptions={bienOptions} immeubleGroups={immeubleGroups} allLabel="" />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FieldInput label="Montant (€) *" type="number" min="0" step="0.01" placeholder="0.00" value={form.montant} onChange={e => set("montant")(e.target.value)} />
          <FieldInput label="Date *" type="date" value={form.date} onChange={e => set("date")(e.target.value)} />
        </div>

        <FieldInput label="Locataire" placeholder="Nom du locataire (optionnel)" value={form.locataire_nom} onChange={e => set("locataire_nom")(e.target.value)} />
        <FieldInput label="Description" placeholder="Ex. Loyer mai 2026" value={form.description} onChange={e => set("description")(e.target.value)} />

        <button
          onClick={() => { if (canSave) onSave(form) }}
          disabled={!canSave}
          style={{ width:"100%", padding:"13px 0", borderRadius:10, background:canSave?C.g:C.cr2, color:canSave?"#fff":C.tm, border:"none", fontWeight:800, fontSize:15, cursor:canSave?"pointer":"not-allowed", fontFamily:"inherit" }}
        >
          {initialValues ? "Enregistrer les modifications" : "Enregistrer la recette"}
        </button>
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────

export default function RecettesPage() {
  const [recettes,       setRecettes]       = useState<Recette[]>([])
  const [bienOptions,    setBienOptions]    = useState<BienOption[]>([])
  const [immeubleGroups, setImmeubleGroups] = useState<ImmeubleGroup[]>([])
  const [loading,  setLoading]  = useState(true)
  const [dbError,  setDbError]  = useState("")
  const [userId,   setUserId]   = useState<string | null>(null)
  const [filterTarget, setFilterTarget] = useState("")
  const [filterAnnee,  setFilterAnnee]  = useState(new Date().getFullYear())
  const [filterMois,   setFilterMois]   = useState(0)
  const [showAdd,  setShowAdd]  = useState(false)
  const [editItem, setEditItem] = useState<Recette | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
    load()
  }, [])

  async function load() {
    setLoading(true); setDbError("")
    const [bienRes, lotRes, recRes] = await Promise.all([
      supabase.from("biens").select("id, nom, notes").order("nom"),
      supabase.from("lots").select("id, bien_id, nom"),
      supabase.from("recettes").select("*").order("date_encaissement", { ascending: false }),
    ])
    setLoading(false)
    if (bienRes.error) { setDbError(bienRes.error.message); return }
    if (lotRes.error)  { setDbError(lotRes.error.message);  return }
    if (recRes.error)  { setDbError(recRes.error.message);  return }

    const biens = bienRes.data ?? []
    const lots  = lotRes.data ?? []

    const options: BienOption[] = []
    const groups: ImmeubleGroup[] = []

    for (const b of biens) {
      let meta: Record<string, string> = {}
      try { meta = JSON.parse(b.notes || "{}") } catch {}

      if (meta.kind === "immeuble") {
        const bLots = lots.filter(l => l.bien_id === b.id)
        const lotOpts: BienOption[] = bLots.map(l => ({
          value: `${b.id}|${l.id}`,
          label: `${l.nom} · ${b.nom}`,
          bien_id: b.id,
          lot_id: l.id,
          display_nom: `${l.nom} (${b.nom})`,
        }))
        groups.push({ id: b.id, nom: b.nom, lots: lotOpts })
        options.push({ value: b.id, label: b.nom, bien_id: b.id, lot_id: null, display_nom: b.nom })
        options.push(...lotOpts)
      } else {
        options.push({ value: b.id, label: b.nom, bien_id: b.id, lot_id: null, display_nom: b.nom })
      }
    }

    setBienOptions(options)
    setImmeubleGroups(groups)

    const recs: Recette[] = (recRes.data ?? []).map(r => {
      const opt = options.find(o =>
        o.bien_id === r.bien_id && o.lot_id === (r.lot_id ?? null)
      ) ?? options.find(o => o.bien_id === r.bien_id)
      return {
        id: r.id,
        bien_id: r.bien_id,
        lot_id: r.lot_id ?? null,
        bien_nom: opt?.display_nom ?? "—",
        locataire_nom: r.locataire_nom ?? undefined,
        type: (r.type ?? "loyer") as TypeRecette,
        montant: Number(r.montant),
        date: r.date_encaissement,
        description: r.description ?? undefined,
      }
    })
    setRecettes(recs)
  }

  // ── Filtres ────────────────────────────────────────────────

  const filtered = useMemo(() => recettes.filter(r => {
    const [y, m] = r.date.split("-")
    if (parseInt(y) !== filterAnnee) return false
    if (filterMois && parseInt(m) !== filterMois) return false
    if (filterTarget) {
      if (filterTarget.includes("|")) {
        const [, lotId] = filterTarget.split("|")
        if (r.lot_id !== lotId) return false
      } else {
        if (r.bien_id !== filterTarget) return false
      }
    }
    return true
  }), [recettes, filterTarget, filterAnnee, filterMois])

  const totalPeriode = filtered.reduce((s, r) => s + r.montant, 0)
  const totalLoyers  = filtered.filter(r => r.type === "loyer").reduce((s, r) => s + r.montant, 0)
  const nbMoisActifs = useMemo(() => new Set(filtered.map(r => r.date.slice(0, 7))).size, [filtered])
  const moyMensuelle = nbMoisActifs > 0 ? totalPeriode / nbMoisActifs : 0

  const anneesDispos = useMemo(() => {
    const years = new Set(recettes.map(r => parseInt(r.date.slice(0, 4))))
    const cur = new Date().getFullYear()
    years.add(cur); years.add(cur - 1)
    return Array.from(years).sort((a, b) => b - a)
  }, [recettes])

  const grouped = useMemo(() => {
    const gs: Record<string, Recette[]> = {}
    filtered.forEach(r => {
      const k = r.date.slice(0, 7)
      if (!gs[k]) gs[k] = []
      gs[k].push(r)
    })
    return Object.entries(gs).sort(([a], [b]) => b.localeCompare(a)).map(([key, items]) => {
      const [y, m] = key.split("-")
      return { key, label: `${MOIS_FR[parseInt(m) - 1]} ${y}`, total: items.reduce((s, r) => s + r.montant, 0), items: [...items].sort((a, b) => b.date.localeCompare(a.date)) }
    })
  }, [filtered])

  // ── Handlers Supabase ──────────────────────────────────────

  async function handleDelete(id: string) {
    if (!window.confirm("Supprimer cette recette ?")) return
    const { error } = await supabase.from("recettes").delete().eq("id", id)
    if (error) { setDbError(error.message); return }
    setRecettes(prev => prev.filter(r => r.id !== id))
  }

  function resolveTarget(target: string) {
    const opt = bienOptions.find(o => o.value === target)
    return opt ?? null
  }

  async function handleSaveAdd(form: FormState) {
    if (!userId) { setDbError("Non connecté"); return }
    const opt = resolveTarget(form.target)
    if (!opt) return
    const { data, error } = await supabase.from("recettes").insert({
      user_id: userId,
      bien_id: opt.bien_id,
      lot_id:  opt.lot_id,
      locataire_nom: form.locataire_nom.trim() || null,
      type: form.type,
      montant: parseFloat(form.montant),
      date_encaissement: form.date,
      description: form.description.trim() || null,
    }).select().single()
    if (error) { setDbError(error.message); return }
    const newRec: Recette = {
      id: data.id, bien_id: opt.bien_id, lot_id: opt.lot_id,
      bien_nom: opt.display_nom,
      locataire_nom: form.locataire_nom.trim() || undefined,
      type: form.type, montant: parseFloat(form.montant),
      date: form.date, description: form.description.trim() || undefined,
    }
    setRecettes(prev => [newRec, ...prev])
    setShowAdd(false)
    const annee = parseInt(form.date.slice(0, 4))
    if (annee !== filterAnnee) setFilterAnnee(annee)
  }

  async function handleSaveEdit(form: FormState) {
    if (!editItem) return
    const opt = resolveTarget(form.target)
    if (!opt) return
    const { error } = await supabase.from("recettes").update({
      bien_id: opt.bien_id, lot_id: opt.lot_id,
      locataire_nom: form.locataire_nom.trim() || null,
      type: form.type, montant: parseFloat(form.montant),
      date_encaissement: form.date,
      description: form.description.trim() || null,
    }).eq("id", editItem.id)
    if (error) { setDbError(error.message); return }
    setRecettes(prev => prev.map(r => r.id === editItem.id ? {
      ...r, bien_id: opt.bien_id, lot_id: opt.lot_id, bien_nom: opt.display_nom,
      locataire_nom: form.locataire_nom.trim() || undefined,
      type: form.type, montant: parseFloat(form.montant),
      date: form.date, description: form.description.trim() || undefined,
    } : r))
    setEditItem(null)
  }

  // ── Rendu ──────────────────────────────────────────────────

  return (
    <>
      {/* En-tête */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:C.tx, margin:0, lineHeight:1.2 }}>Recettes</h1>
          <div style={{ fontSize:13, color:C.tm, marginTop:3 }}>
            {loading ? "Chargement…" : `${filtered.length} encaissement${filtered.length !== 1 ? "s" : ""} · ${filterAnnee}`}
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ background:C.g, color:"#fff", border:"none", borderRadius:10, padding:"10px 18px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
          + Ajouter
        </button>
      </div>

      {/* Erreur */}
      {dbError && (
        <div style={{ background:C.rp, border:`1px solid ${C.rd}`, borderRadius:12, padding:"12px 16px", color:C.rd, fontWeight:600, fontSize:13, marginBottom:16 }}>
          ⚠️ {dbError}
        </div>
      )}

      {/* Filtres */}
      <div style={{ background:C.wh, borderRadius:12, padding:"14px 16px", border:`1px solid ${C.br}`, marginBottom:16, display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:12 }}>
        <div>
          <label style={{ display:"block", fontSize:10, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:3 }}>Bien / Lot</label>
          <BienSelect value={filterTarget} onChange={setFilterTarget} bienOptions={bienOptions} immeubleGroups={immeubleGroups} allLabel="Tous les biens" />
        </div>
        <div>
          <label style={{ display:"block", fontSize:10, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:3 }}>Année</label>
          <select value={filterAnnee} onChange={e => setFilterAnnee(parseInt(e.target.value))} style={{ width:"100%", padding:"8px 10px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:13, fontFamily:"inherit", color:C.tx, background:C.cr, outline:"none", boxSizing:"border-box" }}>
            {anneesDispos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display:"block", fontSize:10, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:3 }}>Mois</label>
          <select value={filterMois} onChange={e => setFilterMois(parseInt(e.target.value))} style={{ width:"100%", padding:"8px 10px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:13, fontFamily:"inherit", color:C.tx, background:C.cr, outline:"none", boxSizing:"border-box" }}>
            <option value={0}>Tous les mois</option>
            {MOIS_FR.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Chargement */}
      {loading && (
        <div style={{ textAlign:"center", padding:"60px 20px", color:C.tm }}>
          <div style={{ fontSize:32, opacity:.4, marginBottom:10 }}>⏳</div>
          <div>Chargement…</div>
        </div>
      )}

      {/* Stats */}
      {!loading && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
          {[
            { label: filterMois ? "Total du mois" : "Total annuel", value: euro(totalPeriode), color: C.g  },
            { label: "Dont loyers",    value: euro(totalLoyers),          color: C.g  },
            { label: "Nb opérations",  value: filtered.length.toString(), color: C.tx },
            { label: "Moy. mensuelle", value: euro(moyMensuelle),         color: C.gd },
          ].map(s => (
            <div key={s.label} style={{ background:C.wh, borderRadius:12, padding:"14px 12px", border:`1px solid ${C.br}`, textAlign:"center" }}>
              <div style={{ fontSize:15, fontWeight:900, color:s.color, lineHeight:1.2 }}>{s.value}</div>
              <div style={{ fontSize:10, color:C.tm, marginTop:3, textTransform:"uppercase", letterSpacing:".05em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Répartition par type */}
      {!loading && filtered.length > 0 && (
        <div style={{ background:C.wh, borderRadius:12, padding:"14px 16px", border:`1px solid ${C.br}`, marginBottom:16, display:"flex", gap:8, flexWrap:"wrap" }}>
          {(Object.entries(TYPE_CONFIG) as [TypeRecette, typeof TYPE_CONFIG[TypeRecette]][]).map(([k, v]) => {
            const montant = filtered.filter(r => r.type === k).reduce((s, r) => s + r.montant, 0)
            if (!montant) return null
            return (
              <div key={k} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:v.bg, borderRadius:20 }}>
                <span style={{ fontSize:12, fontWeight:700, color:v.color }}>{v.label}</span>
                <span style={{ fontSize:12, fontWeight:900, color:v.color }}>{euro(montant)}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Liste groupée par mois */}
      {!loading && grouped.length === 0 && (
        <div style={{ background:C.wh, borderRadius:14, padding:"56px 20px", textAlign:"center", border:`1px solid ${C.br}` }}>
          <div style={{ fontSize:40, marginBottom:12 }}>💰</div>
          <div style={{ fontWeight:700, fontSize:15, color:C.tx, marginBottom:6 }}>Aucune recette</div>
          <div style={{ color:C.tm, fontSize:13, marginBottom:20 }}>Modifiez les filtres ou ajoutez une recette.</div>
          <button onClick={() => setShowAdd(true)} style={{ background:C.g, color:"#fff", border:"none", borderRadius:10, padding:"11px 22px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
            + Ajouter une recette
          </button>
        </div>
      )}

      {!loading && grouped.map(group => (
        <div key={group.key} style={{ marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`2px solid ${C.g}`, marginBottom:2 }}>
            <span style={{ fontWeight:800, fontSize:15, color:C.g }}>{group.label}</span>
            <span style={{ fontWeight:800, fontSize:15, color:C.g }}>+{euro(group.total)}</span>
          </div>
          <div style={{ background:C.wh, borderRadius:12, padding:"0 16px", border:`1px solid ${C.br}` }}>
            {group.items.map(r => (
              <RecetteLigne key={r.id} r={r} onEdit={() => setEditItem(r)} onDelete={() => handleDelete(r.id)} />
            ))}
          </div>
        </div>
      ))}

      {/* Modals */}
      {showAdd && (
        <RecetteModal onClose={() => setShowAdd(false)} onSave={handleSaveAdd} bienOptions={bienOptions} immeubleGroups={immeubleGroups} />
      )}
      {editItem && (
        <RecetteModal initialValues={editItem} onClose={() => setEditItem(null)} onSave={handleSaveEdit} bienOptions={bienOptions} immeubleGroups={immeubleGroups} />
      )}
    </>
  )
}
