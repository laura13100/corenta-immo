import { useState } from "react"

const C = {
  g:"#2d5b3d", gl:"#3d7a52", gp:"#e6efe9",
  cr:"#f7f4ee", cr2:"#eeebe3",
  tx:"#1a2a1f", tm:"#6b8c74",
  wh:"#ffffff", br:"#dde8e0",
}

export interface AddBienFormData {
  nom: string
  adresse: string
  type: string
  mode_exploitation: string
  mode_detention: string
  regime_fiscal: string
  valeurAchat: string
  surface: string
  anneeAcquisition: string
  notes: string
}

export const ADD_BIEN_DEFAULTS: AddBienFormData = {
  nom: "", adresse: "", type: "Appartement",
  mode_exploitation: "meuble",
  mode_detention: "nom-propre", regime_fiscal: "ir-foncier-reel",
  valeurAchat: "", surface: "", anneeAcquisition: "", notes: "",
}

export const MODE_DETENTION_LABELS: Record<string, string> = {
  "nom-propre":   "Nom propre",
  "indivision":   "Indivision",
  "sci":          "SCI",
  "sarl-famille": "SARL de famille",
  "sas":          "SAS",
  "holding":      "Holding",
  "autre":        "Autre",
}

export const REGIME_FISCAL_LABELS: Record<string, string> = {
  "ir-foncier-reel":  "IR — foncier réel",
  "ir-foncier-micro": "IR — micro-foncier",
  "ir-lmnp-reel":     "IR — LMNP réel",
  "ir-lmnp-micro":    "IR — micro-BIC",
  "ir-lmp":           "IR — LMP",
  "is":               "IS",
  "autre":            "Autre",
}

function Inp({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>{label}</label>
      <input style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:14, fontFamily:"inherit", color:C.tx, background:C.cr, outline:"none", boxSizing:"border-box" }} {...props} />
    </div>
  )
}

function Sel({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>{label}</label>
      <select style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:14, fontFamily:"inherit", color:C.tx, background:C.cr, outline:"none", boxSizing:"border-box" }} {...props}>{children}</select>
    </div>
  )
}

export function AddBienModal({
  title = "Nouveau bien",
  onClose,
  onSave,
  initialValues,
}: {
  title?: string
  onClose: () => void
  onSave: (data: AddBienFormData) => void
  initialValues?: Partial<AddBienFormData>
}) {
  const [f, setF] = useState<AddBienFormData>({ ...ADD_BIEN_DEFAULTS, ...initialValues })
  const set = (k: keyof AddBienFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF(p => ({ ...p, [k]: e.target.value }))

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:900, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.wh, borderRadius:"18px 18px 0 0", padding:"24px 20px 36px", width:"100%", maxWidth:540, maxHeight:"90vh", overflowY:"auto" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:17, color:C.g }}>{title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.tm }}>✕</button>
        </div>

        <Inp label="Nom *" placeholder="ex. Appartement Gambetta, Immeuble Confluence…" value={f.nom} onChange={set("nom")} />
        <Inp label="Adresse" placeholder="12 rue de la Paix, 69001 Lyon" value={f.adresse} onChange={set("adresse")} />

        <Sel label="Type de bien" value={f.type} onChange={set("type")}>
          <option value="Appartement">Appartement</option>
          <option value="Maison">Maison</option>
          <option value="Garage / Cave">Garage / Cave</option>
          <option value="Local commercial">Local commercial</option>
          <option value="Immeuble (multi-lots)">Immeuble (multi-lots)</option>
          <option value="Autre">Autre</option>
        </Sel>

        <Sel label="Mode d'exploitation" value={f.mode_exploitation} onChange={set("mode_exploitation")}>
          <option value="nu">Location nue longue durée</option>
          <option value="meuble">Location meublée longue durée</option>
          <option value="airbnb">Location courte durée / Airbnb</option>
          <option value="commercial">Local commercial</option>
          <option value="mixte">Usage mixte</option>
          <option value="vacant">Vacant</option>
          <option value="autre">Autre</option>
        </Sel>

        <Sel label="Structure de détention" value={f.mode_detention} onChange={set("mode_detention")}>
          <option value="nom-propre">Nom propre</option>
          <option value="indivision">Indivision</option>
          <option value="sci">SCI</option>
          <option value="sarl-famille">SARL de famille</option>
          <option value="sas">SAS</option>
          <option value="holding">Holding</option>
          <option value="autre">Autre</option>
        </Sel>

        <Sel label="Régime fiscal" value={f.regime_fiscal} onChange={set("regime_fiscal")}>
          <option value="ir-foncier-reel">IR — foncier réel</option>
          <option value="ir-foncier-micro">IR — micro-foncier</option>
          <option value="ir-lmnp-reel">IR — LMNP réel</option>
          <option value="ir-lmnp-micro">IR — micro-BIC</option>
          <option value="ir-lmp">IR — LMP</option>
          <option value="is">IS</option>
          <option value="autre">Autre</option>
        </Sel>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Inp label="Valeur d'achat (€)" type="number" placeholder="350 000" value={f.valeurAchat} onChange={set("valeurAchat")} />
          <Inp label="Surface totale (m²)" type="number" placeholder="75" value={f.surface} onChange={set("surface")} />
        </div>

        <Inp label="Année d'acquisition" type="number" placeholder="2022" value={f.anneeAcquisition} onChange={set("anneeAcquisition")} />
        <Inp label="Notes" placeholder="Remarques, situation, travaux…" value={f.notes} onChange={set("notes")} />

        <button
          onClick={() => { if (f.nom.trim()) onSave(f) }}
          disabled={!f.nom.trim()}
          style={{ width:"100%", padding:"13px 0", borderRadius:10, background:!f.nom.trim()?C.cr2:C.g, color:!f.nom.trim()?C.tm:"#fff", border:"none", fontWeight:800, fontSize:15, cursor:!f.nom.trim()?"not-allowed":"pointer", fontFamily:"inherit" }}
        >
          Enregistrer
        </button>
      </div>
    </div>
  )
}
