import { useState, useMemo, useRef } from "react"

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

const formatDate = (d: string) => {
  const [y, m, j] = d.split("-")
  return `${j}/${m}/${y}`
}

const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)

function joursRestants(dateStr: string): number {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - TODAY.getTime()) / 86400000)
}

type AlertLevel = "urgent" | "warning" | "ok" | "past"

function getAlertLevel(days: number): AlertLevel {
  if (days < 0)   return "past"
  if (days <= 30) return "urgent"
  if (days <= 90) return "warning"
  return "ok"
}

const ALERT_STYLE: Record<AlertLevel, { bg: string; color: string; label: string }> = {
  urgent:  { bg: C.rp,  color: C.rd,  label: "Urgent"  },
  warning: { bg: C.dp,  color: C.gd,  label: "À venir" },
  ok:      { bg: C.gp,  color: C.g,   label: "OK"      },
  past:    { bg: C.cr2, color: C.tm,  label: "Passé"   },
}

const MOTIF_REPRISE: Record<string, string> = {
  "vente":              "Vente du bien",
  "reprise-personnelle":"Reprise personnelle",
  "autre":              "Autre",
}

// ── Types ──────────────────────────────────────────────────
type CategorieDoc = "bail" | "diagnostic" | "facture" | "assurance" | "impot" | "autre"

interface Document {
  id: string
  bien_id: string
  bien_nom: string
  categorie: CategorieDoc
  nom: string
  date: string        // YYYY-MM-DD
  description?: string
  taille?: string
  type_fichier: string
  simule?: boolean    // fichier ajouté manuellement (pas de vrai fichier)
  // Champs spécifiques aux baux
  bail_date_debut?: string
  bail_date_fin?: string
  bail_date_revision?: string
  bail_indice_revision?: string
  bail_date_preavis?: string
  bail_motif_reprise?: "vente" | "reprise-personnelle" | "autre"
  bail_rappel_email?: boolean
  bail_rappel_delai?: "1m" | "3m" | "6m"
}

const CAT_CONFIG: Record<CategorieDoc, { label: string; emoji: string; bg: string; color: string }> = {
  bail:        { label: "Bail",        emoji: "📜", bg: C.gp,  color: C.g  },
  diagnostic:  { label: "Diagnostic",  emoji: "🔍", bg: C.bp,  color: C.bl },
  facture:     { label: "Facture",     emoji: "🧾", bg: C.op,  color: C.or },
  assurance:   { label: "Assurance",   emoji: "🛡️", bg: C.pp,  color: C.pu },
  impot:       { label: "Impôt",       emoji: "🏛️", bg: C.dp,  color: C.gd },
  autre:       { label: "Autre",       emoji: "📄", bg: C.cr2, color: C.tm },
}

// ── Biens de référence ─────────────────────────────────────
const BIENS_REF = [
  { id: "b1", nom: "Appartement Gambetta" },
  { id: "b2", nom: "Studio Confluence"    },
  { id: "b3", nom: "Garage Bellecour"     },
  { id: "b4", nom: "T2 Croix-Rousse"     },
]

// ── Données fictives ───────────────────────────────────────
const MOCK_DOCUMENTS: Document[] = [
  // Appartement Gambetta
  { id:"dc01", bien_id:"b1", bien_nom:"Appartement Gambetta", categorie:"bail",       nom:"Bail meublé — Sophie Martin",       date:"2024-09-01", description:"Bail de location meublée 1 an renouvelable",    taille:"245 Ko",  type_fichier:"PDF",
    bail_date_debut:"2024-09-01", bail_date_fin:"2026-07-01", bail_date_revision:"2026-07-01", bail_indice_revision:"143.34",
    bail_date_preavis:"2026-06-01", bail_motif_reprise:"vente", bail_rappel_email:true, bail_rappel_delai:"3m" },
  { id:"dc02", bien_id:"b1", bien_nom:"Appartement Gambetta", categorie:"diagnostic", nom:"DPE 2024 — Gambetta",               date:"2024-08-15", description:"Diagnostic performance énergétique · Classe C", taille:"1,2 Mo",  type_fichier:"PDF" },
  { id:"dc03", bien_id:"b1", bien_nom:"Appartement Gambetta", categorie:"assurance",  nom:"Attestation PNO 2026",              date:"2026-01-01", description:"Assurance propriétaire non occupant 2026",       taille:"312 Ko",  type_fichier:"PDF" },
  { id:"dc04", bien_id:"b1", bien_nom:"Appartement Gambetta", categorie:"impot",      nom:"Taxe foncière 2025",                date:"2025-09-20", description:"Avis de taxe foncière 2025 — 1 240 €",          taille:"189 Ko",  type_fichier:"PDF" },
  { id:"dc05", bien_id:"b1", bien_nom:"Appartement Gambetta", categorie:"facture",    nom:"Facture plombier mars 2026",        date:"2026-03-12", description:"Remplacement robinetterie salle de bain — 320 €", taille:"87 Ko", type_fichier:"PDF" },

  // Studio Confluence
  { id:"dc06", bien_id:"b2", bien_nom:"Studio Confluence",    categorie:"bail",       nom:"Bail meublé — Thomas Durand",       date:"2025-05-01", description:"Bail de location meublée signé le 01/05/2025",  taille:"231 Ko",  type_fichier:"PDF",
    bail_date_debut:"2025-05-01", bail_date_fin:"2026-05-01", bail_date_revision:"2026-10-01", bail_indice_revision:"145.12",
    bail_date_preavis:"2026-02-01", bail_rappel_email:false },
  { id:"dc07", bien_id:"b2", bien_nom:"Studio Confluence",    categorie:"diagnostic", nom:"DPE 2023 — Confluence",             date:"2023-04-20", description:"Diagnostic performance énergétique · Classe D", taille:"980 Ko",  type_fichier:"PDF" },
  { id:"dc08", bien_id:"b2", bien_nom:"Studio Confluence",    categorie:"assurance",  nom:"Attestation PNO 2026",              date:"2026-01-01", description:"Assurance propriétaire non occupant 2026",       taille:"298 Ko",  type_fichier:"PDF" },
  { id:"dc09", bien_id:"b2", bien_nom:"Studio Confluence",    categorie:"facture",    nom:"Facture peinture fév. 2026",        date:"2026-02-22", description:"Réfection peinture complète — 1 200 €",         taille:"156 Ko",  type_fichier:"PDF" },
  { id:"dc10", bien_id:"b2", bien_nom:"Studio Confluence",    categorie:"impot",      nom:"Taxe foncière 2025",                date:"2025-09-20", description:"Avis de taxe foncière 2025 — 680 €",            taille:"175 Ko",  type_fichier:"PDF" },

  // Garage Bellecour
  { id:"dc11", bien_id:"b3", bien_nom:"Garage Bellecour",     categorie:"bail",       nom:"Bail parking — Marie Blanc",        date:"2023-06-01", description:"Bail location parking, reconduit tacitement",   taille:"98 Ko",   type_fichier:"PDF",
    bail_date_debut:"2023-06-01", bail_date_fin:"2026-06-01", bail_date_revision:"2026-06-01", bail_indice_revision:"143.34",
    bail_date_preavis:"2026-04-01", bail_motif_reprise:"reprise-personnelle", bail_rappel_email:true, bail_rappel_delai:"1m" },
  { id:"dc12", bien_id:"b3", bien_nom:"Garage Bellecour",     categorie:"assurance",  nom:"Attestation assurance garage 2026", date:"2026-01-01", description:"Assurance garage 2026",                         taille:"142 Ko",  type_fichier:"PDF" },
  { id:"dc13", bien_id:"b3", bien_nom:"Garage Bellecour",     categorie:"impot",      nom:"Taxe foncière 2025",                date:"2025-09-20", description:"Avis de taxe foncière 2025 — 210 €",            taille:"168 Ko",  type_fichier:"PDF" },

  // T2 Croix-Rousse
  { id:"dc14", bien_id:"b4", bien_nom:"T2 Croix-Rousse",     categorie:"diagnostic", nom:"DPE 2024 — Croix-Rousse",          date:"2024-11-05", description:"Diagnostic performance énergétique · Classe E", taille:"1,1 Mo",  type_fichier:"PDF" },
  { id:"dc15", bien_id:"b4", bien_nom:"T2 Croix-Rousse",     categorie:"facture",    nom:"Facture chauffe-eau fév. 2026",     date:"2026-02-18", description:"Remplacement chauffe-eau — 1 200 €",            taille:"203 Ko",  type_fichier:"PDF" },
  { id:"dc16", bien_id:"b4", bien_nom:"T2 Croix-Rousse",     categorie:"facture",    nom:"Facture peinture mars 2026",        date:"2026-03-10", description:"Réfection peinture salon et chambre — 450 €",   taille:"178 Ko",  type_fichier:"PDF" },
  { id:"dc17", bien_id:"b4", bien_nom:"T2 Croix-Rousse",     categorie:"assurance",  nom:"Attestation PNO 2026",              date:"2026-01-01", description:"Assurance propriétaire non occupant 2026",       taille:"287 Ko",  type_fichier:"PDF" },
  { id:"dc18", bien_id:"b4", bien_nom:"T2 Croix-Rousse",     categorie:"autre",      nom:"Rapport diagnostics complet",       date:"2026-05-20", description:"Dossier diagnostics complet pour mise en location", taille:"2,3 Mo", type_fichier:"PDF" },
]

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

// ── Zone d'upload visuelle ─────────────────────────────────

function UploadZone({ onFileSelect }: { onFileSelect: (nom: string) => void }) {
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setFileName(file.name)
    onFileSelect(file.name)
    setTimeout(() => setFileName(null), 3000)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
      style={{
        border: `2px dashed ${dragging ? C.g : C.br}`,
        borderRadius: 14,
        padding: "28px 20px",
        textAlign: "center",
        cursor: "pointer",
        background: dragging ? C.gp : C.wh,
        transition: "all .2s",
        marginBottom: 16,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display:"none" }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ""
        }}
      />

      {fileName ? (
        <>
          <div style={{ fontSize:36, marginBottom:8 }}>✅</div>
          <div style={{ fontWeight:700, fontSize:14, color:C.g, marginBottom:4 }}>Fichier sélectionné</div>
          <div style={{ fontSize:13, color:C.tm, fontWeight:500 }}>{fileName}</div>
          <div style={{ fontSize:11, color:C.tm, marginTop:4 }}>
            Remplissez le formulaire pour finaliser l'ajout
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize:36, marginBottom:8 }}>☁️</div>
          <div style={{ fontWeight:700, fontSize:15, color:C.g, marginBottom:4 }}>
            Glisser un fichier ici
          </div>
          <div style={{ fontSize:13, color:C.tm, marginBottom:8 }}>
            ou cliquer pour parcourir vos fichiers
          </div>
          <div
            style={{
              display:"inline-block", padding:"4px 12px", borderRadius:20,
              background:C.cr2, fontSize:11, color:C.tm, fontWeight:600,
            }}
          >
            PDF · JPG · PNG — max 10 Mo
          </div>
        </>
      )}
    </div>
  )
}

// ── Carte document ─────────────────────────────────────────

function DocumentCard({ doc, onEdit, onDelete }: {
  doc: Document; onEdit: () => void; onDelete: () => void
}) {
  const cfg = CAT_CONFIG[doc.categorie]
  return (
    <div
      style={{
        background: C.wh,
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 10,
        border: `1.5px solid ${C.br}`,
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
      }}
    >
      {/* Icône catégorie */}
      <div
        style={{
          width: 44, height: 44, borderRadius: 10,
          background: cfg.bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0,
        }}
      >
        {cfg.emoji}
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.tx, marginBottom: 4, lineHeight: 1.3 }}>
          {doc.nom}
          {doc.simule && (
            <span style={{ marginLeft: 6, fontSize: 10, background: C.dp, color: C.gd, padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>
              simulé
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: doc.description ? 4 : 0 }}>
          <Badge label={`${cfg.emoji} ${cfg.label}`} bg={cfg.bg} color={cfg.color} />
          <span style={{ fontSize: 11, color: C.tm }}>{doc.bien_nom}</span>
          <span style={{ fontSize: 11, color: C.tm }}>· 📅 {formatDate(doc.date)}</span>
        </div>
        {doc.description && (
          <div style={{ fontSize: 12, color: C.tm, marginTop: 2 }}>{doc.description}</div>
        )}
        <div style={{ fontSize: 11, color: C.cr2.replace(C.cr2, C.tm), marginTop: 4, display: "flex", gap: 8 }}>
          <span style={{ background: C.cr2, padding: "2px 7px", borderRadius: 8, fontSize: 10, color: C.tm, fontWeight: 600 }}>
            {doc.type_fichier}
          </span>
          {doc.taille && (
            <span style={{ fontSize: 11, color: C.tm, paddingTop: 2 }}>{doc.taille}</span>
          )}
        </div>
        {/* Échéances bail */}
        {doc.categorie === "bail" && (doc.bail_date_fin || doc.bail_date_revision || doc.bail_date_preavis) && (() => {
          const echeances: { label: string; date: string }[] = [
            doc.bail_date_fin      ? { label: "Fin du bail",     date: doc.bail_date_fin      } : null,
            doc.bail_date_revision ? { label: "Révision loyer",  date: doc.bail_date_revision } : null,
            doc.bail_date_preavis  ? { label: "Limite préavis",  date: doc.bail_date_preavis  } : null,
          ].filter(Boolean) as { label: string; date: string }[]
          return (
            <div style={{ marginTop:10, paddingTop:10, borderTop:`1px dashed ${C.br}` }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".06em", marginBottom:7 }}>
                Échéances
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {echeances.map(({ label, date }) => {
                  const days  = joursRestants(date)
                  const level = getAlertLevel(days)
                  const s     = ALERT_STYLE[level]
                  const tag   = days < 0 ? "Passé" : days === 0 ? "Aujourd'hui" : `J−${days}`
                  return (
                    <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:12, color:C.tm }}>{label}</span>
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <span style={{ fontSize:12, color:C.tx, fontWeight:600 }}>{formatDate(date)}</span>
                        <span style={{ fontSize:10, fontWeight:700, padding:"1px 8px", borderRadius:10, background:s.bg, color:s.color, whiteSpace:"nowrap" }}>{tag}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              {doc.bail_motif_reprise && (
                <div style={{ marginTop:6, fontSize:11, color:C.tm }}>
                  Motif prévu : <strong>{MOTIF_REPRISE[doc.bail_motif_reprise]}</strong>
                </div>
              )}
              {doc.bail_rappel_email && (
                <div style={{ marginTop:5, fontSize:11, color:C.tm }}>
                  📧 Rappel {doc.bail_rappel_delai === "1m" ? "1 mois" : doc.bail_rappel_delai === "3m" ? "3 mois" : "6 mois"} avant
                </div>
              )}
            </div>
          )
        })()}

        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button
            onClick={onEdit}
            style={{ padding: "4px 10px", borderRadius: 7, background: C.gp, color: C.g, border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
          >
            ✏️ Modifier
          </button>
          <button
            onClick={onDelete}
            style={{ padding: "4px 10px", borderRadius: 7, background: C.rp, color: C.rd, border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
          >
            🗑 Supprimer
          </button>
        </div>
      </div>

      {/* Bouton voir */}
      <button
        onClick={e => { e.stopPropagation(); alert("Ouverture du fichier non disponible en mode démo.") }}
        style={{
          flexShrink: 0,
          padding: "6px 12px",
          borderRadius: 8,
          border: `1.5px solid ${C.br}`,
          background: C.wh,
          color: C.tm,
          fontWeight: 600,
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        👁 Voir
      </button>
    </div>
  )
}

// ── Modal ajout d'un document ──────────────────────────────

interface FormState {
  bien_id:            string
  categorie:          CategorieDoc
  nom:                string
  date:               string
  description:        string
  type_fichier:       string
  bail_date_debut:    string
  bail_date_fin:      string
  bail_date_revision: string
  bail_indice_revision: string
  bail_date_preavis:  string
  bail_motif_reprise: string
  bail_rappel_email:  boolean
  bail_rappel_delai:  string
}

const today = new Date().toISOString().slice(0, 10)

function DocumentModal({
  nomFichierPrefill = "",
  onClose,
  onSave,
  initialValues,
}: {
  nomFichierPrefill?: string
  onClose: () => void
  onSave: (d: Document) => void
  initialValues?: Document
}) {
  const isEdit = !!initialValues
  const [form, setForm] = useState<FormState>({
    bien_id:            initialValues?.bien_id            ?? BIENS_REF[0].id,
    categorie:          initialValues?.categorie          ?? "bail",
    nom:                initialValues?.nom                ?? (nomFichierPrefill.replace(/\.[^.]+$/, "") || ""),
    date:               initialValues?.date               ?? today,
    description:        initialValues?.description        ?? "",
    type_fichier:       initialValues?.type_fichier       ?? (nomFichierPrefill.split(".").pop()?.toUpperCase() || "PDF"),
    bail_date_debut:    initialValues?.bail_date_debut    ?? "",
    bail_date_fin:      initialValues?.bail_date_fin      ?? "",
    bail_date_revision: initialValues?.bail_date_revision ?? "",
    bail_indice_revision: initialValues?.bail_indice_revision ?? "",
    bail_date_preavis:  initialValues?.bail_date_preavis  ?? "",
    bail_motif_reprise: initialValues?.bail_motif_reprise ?? "",
    bail_rappel_email:  initialValues?.bail_rappel_email  ?? false,
    bail_rappel_delai:  initialValues?.bail_rappel_delai  ?? "3m",
  })

  const set = (key: keyof FormState) => (v: string) =>
    setForm(f => ({ ...f, [key]: v }))

  const bienNom = BIENS_REF.find(b => b.id === form.bien_id)?.nom ?? ""
  const canSave = !!form.nom.trim() && !!form.date

  const handleSave = () => {
    if (!canSave) return
    onSave({
      id:           isEdit ? initialValues!.id : Date.now().toString(),
      bien_id:      form.bien_id,
      bien_nom:     bienNom,
      categorie:    form.categorie,
      nom:          form.nom.trim(),
      date:         form.date,
      description:  form.description || undefined,
      taille:       isEdit ? initialValues!.taille : (nomFichierPrefill ? "— Ko" : undefined),
      type_fichier: form.type_fichier || "PDF",
      simule:       isEdit ? initialValues!.simule : true,
      ...(form.categorie === "bail" ? {
        bail_date_debut:      form.bail_date_debut    || undefined,
        bail_date_fin:        form.bail_date_fin      || undefined,
        bail_date_revision:   form.bail_date_revision || undefined,
        bail_indice_revision: form.bail_indice_revision || undefined,
        bail_date_preavis:    form.bail_date_preavis  || undefined,
        bail_motif_reprise:   (form.bail_motif_reprise as Document["bail_motif_reprise"]) || undefined,
        bail_rappel_email:    form.bail_rappel_email || undefined,
        bail_rappel_delai:    form.bail_rappel_email ? (form.bail_rappel_delai as Document["bail_rappel_delai"]) : undefined,
      } : {}),
    })
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:900, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:C.wh, borderRadius:"18px 18px 0 0", padding:"24px 20px 36px", width:"100%", maxWidth:540, maxHeight:"92vh", overflowY:"auto" }}
      >
        {/* En-tête */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:17, color:C.g }}>
            {isEdit ? "Modifier le document" : "Nouveau document"}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.tm }}>✕</button>
        </div>

        {/* Zone upload — uniquement à l'ajout */}
        {!isEdit && (
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:8 }}>
              Fichier
            </label>
            {nomFichierPrefill ? (
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:C.gp, borderRadius:10 }}>
                <span style={{ fontSize:20 }}>✅</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:C.g }}>Fichier sélectionné</div>
                  <div style={{ fontSize:12, color:C.tm }}>{nomFichierPrefill}</div>
                </div>
              </div>
            ) : (
              <div style={{ border:`2px dashed ${C.br}`, borderRadius:10, padding:"18px 16px", textAlign:"center", cursor:"default", background:C.cr }}>
                <div style={{ fontSize:24, marginBottom:4 }}>📄</div>
                <div style={{ fontSize:12, color:C.tm }}>Aucun fichier sélectionné</div>
                <div style={{ fontSize:11, color:C.tm, marginTop:2 }}>Fermez et utilisez la zone d'upload de la page principale</div>
              </div>
            )}
          </div>
        )}

        {/* Catégorie */}
        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:8 }}>
            Catégorie
          </label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
            {(Object.entries(CAT_CONFIG) as [CategorieDoc, typeof CAT_CONFIG[CategorieDoc]][]).map(([k, v]) => (
              <button
                key={k}
                onClick={() => set("categorie")(k)}
                style={{
                  padding:"8px 6px", borderRadius:9, textAlign:"center",
                  border:`2px solid ${form.categorie === k ? v.color : C.br}`,
                  background: form.categorie === k ? v.bg : C.wh,
                  cursor:"pointer", fontFamily:"inherit",
                }}
              >
                <div style={{ fontSize:18, marginBottom:2 }}>{v.emoji}</div>
                <div style={{ fontSize:11, fontWeight:700, color: form.categorie === k ? v.color : C.tm }}>
                  {v.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bien */}
        <div style={{ marginBottom:12 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>
            Bien concerné
          </label>
          <select
            value={form.bien_id}
            onChange={e => set("bien_id")(e.target.value)}
            style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:14, fontFamily:"inherit", color:C.tx, background:C.cr, outline:"none", boxSizing:"border-box" }}
          >
            {BIENS_REF.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </select>
        </div>

        <FieldInput
          label="Nom du document *"
          placeholder="Ex. Bail meublé 2026 — Sophie Martin"
          value={form.nom}
          onChange={e => set("nom")(e.target.value)}
        />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FieldInput
            label="Date du document *"
            type="date"
            value={form.date}
            onChange={e => set("date")(e.target.value)}
          />
          <FieldInput
            label="Format"
            placeholder="PDF"
            value={form.type_fichier}
            onChange={e => set("type_fichier")(e.target.value)}
          />
        </div>
        <FieldInput
          label="Description"
          placeholder="Ex. Bail 1 an renouvelable, signé le 01/09/2024"
          value={form.description}
          onChange={e => set("description")(e.target.value)}
        />

        {/* ── Section Bail ──────────────────────────── */}
        {form.categorie === "bail" && (
          <div style={{ borderTop:`1.5px solid ${C.br}`, marginTop:8, paddingTop:18, marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:800, color:C.g, textTransform:"uppercase", letterSpacing:".07em", marginBottom:14 }}>
              📋 Détails du bail
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <FieldInput label="Date de début" type="date" value={form.bail_date_debut} onChange={e => set("bail_date_debut")(e.target.value)} />
              <FieldInput label="Date de fin" type="date" value={form.bail_date_fin} onChange={e => set("bail_date_fin")(e.target.value)} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <FieldInput label="Prochaine révision loyer" type="date" value={form.bail_date_revision} onChange={e => set("bail_date_revision")(e.target.value)} />
              <FieldInput label="Indice IRL" placeholder="Ex. 143.34" value={form.bail_indice_revision} onChange={e => set("bail_indice_revision")(e.target.value)} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <FieldInput label="Date limite préavis" type="date" value={form.bail_date_preavis} onChange={e => set("bail_date_preavis")(e.target.value)} />
              <div style={{ marginBottom:12 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>Motif de reprise</label>
                <select
                  value={form.bail_motif_reprise}
                  onChange={e => set("bail_motif_reprise")(e.target.value)}
                  style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:14, fontFamily:"inherit", color:C.tx, background:C.cr, outline:"none", boxSizing:"border-box" }}
                >
                  <option value="">— Non défini</option>
                  <option value="vente">Vente du bien</option>
                  <option value="reprise-personnelle">Reprise personnelle</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>

            {/* Rappels email */}
            <div style={{ background:C.cr, borderRadius:10, padding:"14px 16px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: form.bail_rappel_email ? 14 : 0 }}>
                <input
                  type="checkbox" id="bail-rappel"
                  checked={form.bail_rappel_email}
                  onChange={e => setForm(f => ({ ...f, bail_rappel_email: e.target.checked }))}
                  style={{ width:16, height:16, accentColor:C.g, cursor:"pointer" }}
                />
                <label htmlFor="bail-rappel" style={{ fontSize:13, fontWeight:600, color:C.tx, cursor:"pointer" }}>
                  📧 Recevoir un rappel email
                </label>
              </div>
              {form.bail_rappel_email && (
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:C.gl, textTransform:"uppercase", letterSpacing:".05em", marginBottom:8 }}>
                    Délai avant l'échéance
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    {(["1m","3m","6m"] as const).map((v, _, arr) => {
                      const label = v === "1m" ? "1 mois" : v === "3m" ? "3 mois" : "6 mois"
                      const active = form.bail_rappel_delai === v
                      return (
                        <button key={v} type="button"
                          onClick={() => setForm(f => ({ ...f, bail_rappel_delai: v }))}
                          style={{ flex:1, padding:"9px 0", borderRadius:9, border:`2px solid ${active ? C.g : C.br}`, background:active ? C.gp : C.wh, color:active ? C.g : C.tm, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          style={{
            width:"100%", padding:"13px 0", borderRadius:10,
            background: canSave ? C.g : C.cr2,
            color: canSave ? "#fff" : C.tm,
            border:"none", fontWeight:800, fontSize:15,
            cursor: canSave ? "pointer" : "not-allowed",
            fontFamily:"inherit", transition:"background .15s",
          }}
        >
          {isEdit ? "Enregistrer les modifications" : "Enregistrer le document"}
        </button>
      </div>
    </div>
  )
}

// ── Rappels à venir ────────────────────────────────────────

function RappelsSection({ documents }: { documents: Document[] }) {
  const rappels = useMemo(() => {
    const result: { doc: Document; type: string; date: string; days: number }[] = []
    for (const doc of documents) {
      if (doc.categorie !== "bail") continue
      const checks: { label: string; date: string | undefined }[] = [
        { label: "Fin du bail",    date: doc.bail_date_fin      },
        { label: "Révision loyer", date: doc.bail_date_revision },
        { label: "Limite préavis", date: doc.bail_date_preavis  },
      ]
      for (const { label, date } of checks) {
        if (!date) continue
        const days = joursRestants(date)
        if (days >= 0 && days <= 180)
          result.push({ doc, type: label, date, days })
      }
    }
    return result.sort((a, b) => a.days - b.days)
  }, [documents])

  if (rappels.length === 0) return null

  const urgent = rappels.filter(r => getAlertLevel(r.days) === "urgent").length

  return (
    <div style={{ background:C.wh, borderRadius:14, border:`1.5px solid ${C.br}`, padding:"18px 20px", marginBottom:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <span style={{ fontWeight:800, fontSize:15, color:C.tx }}>🔔 Rappels à venir</span>
        <span style={{ fontSize:11, fontWeight:700, background:urgent > 0 ? C.rp : C.gp, color:urgent > 0 ? C.rd : C.g, padding:"2px 9px", borderRadius:10 }}>
          {rappels.length}
        </span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {rappels.map((r, i) => {
          const level = getAlertLevel(r.days)
          const s = ALERT_STYLE[level]
          return (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderRadius:10, background:s.bg, border:`1px solid ${s.color}33` }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:13, color:C.tx }}>{r.doc.nom}</div>
                <div style={{ fontSize:12, color:C.tm, marginTop:2 }}>{r.type} · {r.doc.bien_nom}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                <div style={{ fontSize:14, fontWeight:900, color:s.color }}>
                  {r.days === 0 ? "Aujourd'hui" : `J−${r.days}`}
                </div>
                <div style={{ fontSize:11, color:C.tm }}>{formatDate(r.date)}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize:11, color:C.tm, marginTop:12, paddingTop:10, borderTop:`1px solid ${C.br}` }}>
        Affiche les échéances dans les 6 prochains mois. Les rappels email seront activés quand la connexion sera configurée.
      </div>
    </div>
  )
}

// ── Ordre d'affichage des catégories ──────────────────────
const CAT_ORDER: CategorieDoc[] = ["bail", "facture", "assurance", "diagnostic", "impot", "autre"]

// ── Groupe par bien ────────────────────────────────────────

function BienGroup({ bien, docs, onEdit, onDelete }: {
  bien: { id: string; nom: string }
  docs: Document[]
  onEdit: (d: Document) => void
  onDelete: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)

  const byCat: Partial<Record<CategorieDoc, Document[]>> = {}
  for (const d of docs) {
    if (!byCat[d.categorie]) byCat[d.categorie] = []
    byCat[d.categorie]!.push(d)
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px", borderRadius: 10,
          background: `linear-gradient(135deg,${C.g},${C.gl})`,
          cursor: "pointer", marginBottom: collapsed ? 0 : 14,
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>{collapsed ? "▶" : "▼"}</span>
        <span style={{ fontWeight: 800, fontSize: 15, color: "#fff", flex: 1 }}>{bien.nom}</span>
        <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,.22)", color: "#fff", padding: "2px 9px", borderRadius: 10 }}>
          {docs.length} doc{docs.length !== 1 ? "s" : ""}
        </span>
      </div>
      {!collapsed && (
        <div>
          {CAT_ORDER.filter(cat => (byCat[cat]?.length ?? 0) > 0).map(cat => {
            const catDocs = byCat[cat]!
            const cfg = CAT_CONFIG[cat]
            return (
              <div key={cat} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, paddingLeft: 4 }}>
                  <span style={{ fontSize: 13 }}>{cfg.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: ".06em" }}>{cfg.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: "1px 6px", borderRadius: 8 }}>{catDocs.length}</span>
                </div>
                {catDocs.map(d => (
                  <DocumentCard key={d.id} doc={d} onEdit={() => onEdit(d)} onDelete={() => onDelete(d.id)} />
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Page principale ────────────────────────────────────────

export default function DocumentsPage() {
  const [documents, setDocuments]     = useState<Document[]>(MOCK_DOCUMENTS)
  const [filterBien, setFilterBien]   = useState("")
  const [filterCat,  setFilterCat]    = useState("")
  const [showAdd, setShowAdd]         = useState(false)
  const [prefillNom, setPrefillNom]   = useState("")
  const [editItem, setEditItem]       = useState<Document | null>(null)

  const openAddWithFile = (nom: string) => {
    setPrefillNom(nom)
    setShowAdd(true)
  }

  const handleDelete = (id: string) => {
    if (!window.confirm("Supprimer ce document ?")) return
    setDocuments(prev => prev.filter(d => d.id !== id))
  }

  const handleSaveAdd = (d: Document) => {
    setDocuments(prev => [d, ...prev])
    if (filterBien && filterBien !== d.bien_id) setFilterBien("")
    if (filterCat  && filterCat  !== d.categorie) setFilterCat("")
  }

  const handleSaveEdit = (updated: Document) => {
    setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d))
    setEditItem(null)
  }

  // ── Filtrage ───────────────────────────────────────────
  const filtered = useMemo(() => {
    return [...documents]
      .filter(d => {
        if (filterBien && d.bien_id !== filterBien) return false
        if (filterCat  && d.categorie !== filterCat) return false
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [documents, filterBien, filterCat])

  // ── Comptages par catégorie ────────────────────────────
  const comptages = useMemo(() => {
    const c: Partial<Record<CategorieDoc, number>> = {}
    filtered.forEach(d => { c[d.categorie] = (c[d.categorie] ?? 0) + 1 })
    return c
  }, [filtered])

  return (
    <>
      {/* ── En-tête ─────────────────────────────────────── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:C.tx, margin:0, lineHeight:1.2 }}>Documents</h1>
          <div style={{ fontSize:13, color:C.tm, marginTop:3 }}>
            {filtered.length} document{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
        <button
          onClick={() => { setPrefillNom(""); setShowAdd(true) }}
          style={{ background:C.g, color:"#fff", border:"none", borderRadius:10, padding:"10px 18px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}
        >
          + Ajouter
        </button>
      </div>

      {/* ── Rappels à venir ──────────────────────────────── */}
      <RappelsSection documents={documents} />

      {/* ── Zone d'upload ────────────────────────────────── */}
      <UploadZone onFileSelect={openAddWithFile} />

      {/* ── Filtres ──────────────────────────────────────── */}
      <div style={{ background:C.wh, borderRadius:12, padding:"14px 16px", border:`1px solid ${C.br}`, marginBottom:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <FieldSelect label="Bien" value={filterBien} onChange={setFilterBien}>
          <option value="">Tous les biens</option>
          {BIENS_REF.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
        </FieldSelect>
        <FieldSelect label="Catégorie" value={filterCat} onChange={setFilterCat}>
          <option value="">Toutes catégories</option>
          {(Object.entries(CAT_CONFIG) as [CategorieDoc, typeof CAT_CONFIG[CategorieDoc]][]).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.label}</option>
          ))}
        </FieldSelect>
      </div>

      {/* ── Pills catégories ──────────────────────────────── */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
        {(Object.entries(CAT_CONFIG) as [CategorieDoc, typeof CAT_CONFIG[CategorieDoc]][]).map(([k, v]) => {
          const n = comptages[k]
          if (!n) return null
          return (
            <button
              key={k}
              onClick={() => setFilterCat(filterCat === k ? "" : k)}
              style={{
                display:"flex", alignItems:"center", gap:5,
                padding:"5px 12px", borderRadius:20,
                border:`1.5px solid ${filterCat === k ? v.color : C.br}`,
                background: filterCat === k ? v.bg : C.wh,
                cursor:"pointer", fontFamily:"inherit",
              }}
            >
              <span style={{ fontSize:13 }}>{v.emoji}</span>
              <span style={{ fontSize:12, fontWeight:700, color: filterCat === k ? v.color : C.tm }}>{v.label}</span>
              <span style={{ fontSize:11, fontWeight:800, color: filterCat === k ? v.color : C.tm, background: filterCat === k ? v.color+"22" : C.cr2, padding:"1px 6px", borderRadius:10 }}>{n}</span>
            </button>
          )
        })}
      </div>

      {/* ── Liste groupée par bien ───────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ background:C.wh, borderRadius:14, padding:"56px 20px", textAlign:"center", border:`1px solid ${C.br}` }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📂</div>
          <div style={{ fontWeight:700, fontSize:15, color:C.tx, marginBottom:6 }}>Aucun document</div>
          <div style={{ color:C.tm, fontSize:13, marginBottom:20 }}>Modifiez les filtres ou ajoutez un document.</div>
          <button
            onClick={() => { setPrefillNom(""); setShowAdd(true) }}
            style={{ background:C.g, color:"#fff", border:"none", borderRadius:10, padding:"11px 22px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}
          >
            + Ajouter un document
          </button>
        </div>
      ) : (
        <>
          {BIENS_REF.map(bien => {
            const bienDocs = filtered.filter(d => d.bien_id === bien.id)
            if (bienDocs.length === 0) return null
            return (
              <BienGroup
                key={bien.id}
                bien={bien}
                docs={bienDocs}
                onEdit={setEditItem}
                onDelete={handleDelete}
              />
            )
          })}
          {/* Documents sans bien référencé */}
          {(() => {
            const knownIds = new Set(BIENS_REF.map(b => b.id))
            const orphans = filtered.filter(d => !knownIds.has(d.bien_id))
            if (orphans.length === 0) return null
            return (
              <BienGroup
                key="__orphan__"
                bien={{ id: "__orphan__", nom: "Autres" }}
                docs={orphans}
                onEdit={setEditItem}
                onDelete={handleDelete}
              />
            )
          })()}
        </>
      )}

      {/* ── Modals ───────────────────────────────────────── */}
      {showAdd && (
        <DocumentModal
          nomFichierPrefill={prefillNom}
          onClose={() => { setShowAdd(false); setPrefillNom("") }}
          onSave={handleSaveAdd}
        />
      )}
      {editItem && (
        <DocumentModal
          initialValues={editItem}
          onClose={() => setEditItem(null)}
          onSave={handleSaveEdit}
        />
      )}
    </>
  )
}
