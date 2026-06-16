import { useState } from "react"
import { supabase } from "./supabase"

const C = {
  g:  "#2d5b3d",
  gl: "#3d7a52",
  gp: "#e6efe9",
  cr: "#f7f4ee",
  tx: "#1a2a1f",
  tm: "#6b8c74",
  rd: "#c0392b",
  rp: "#fdecea",
  br: "#dde8e0",
  wh: "#ffffff",
}

export default function AuthPage() {
  const [mode, setMode]             = useState<"login" | "signup">("login")
  const [email, setEmail]           = useState("")
  const [password, setPassword]     = useState("")
  const [error, setError]           = useState("")
  const [loading, setLoading]       = useState(false)
  const [signupDone, setSignupDone] = useState(false)

  const submit = async () => {
    if (!email || !password) { setError("Email et mot de passe requis."); return }
    setError("")
    setLoading(true)
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(
        error.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : error.message
      )
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSignupDone(true)
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    border: `1.5px solid ${C.br}`,
    borderRadius: 10,
    fontSize: 15,
    fontFamily: "inherit",
    color: C.tx,
    background: C.wh,
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 12,
  }

  if (signupDone) return (
    <div style={{ minHeight:"100vh", background:C.cr, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'Figtree',sans-serif" }}>
      <div style={{ background:C.wh, borderRadius:20, padding:"36px 28px", maxWidth:400, width:"100%", textAlign:"center", boxShadow:"0 4px 32px rgba(45,91,61,.12)" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>📬</div>
        <div style={{ fontWeight:800, fontSize:20, color:C.g, marginBottom:8 }}>Vérifiez votre email</div>
        <div style={{ color:C.tm, fontSize:14, lineHeight:1.6 }}>
          Un lien de confirmation a été envoyé à <strong>{email}</strong>.<br />
          Cliquez dessus pour activer votre compte.
        </div>
        <button
          onClick={() => { setSignupDone(false); setMode("login") }}
          style={{ marginTop:24, padding:"10px 24px", borderRadius:10, background:C.g, color:"#fff", border:"none", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}
        >
          Retour à la connexion
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:"100vh", background:C.cr, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'Figtree',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0 }
        input:focus { border-color:${C.g}!important; box-shadow:0 0 0 3px ${C.gp} }
      `}</style>

      <div style={{ background:C.wh, borderRadius:20, padding:"36px 28px", maxWidth:420, width:"100%", boxShadow:"0 4px 32px rgba(45,91,61,.12)" }}>

        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:34, fontWeight:900, color:C.g, letterSpacing:"-0.5px" }}>
            <span style={{ fontWeight:300 }}>Co</span>renta
          </div>
          <div style={{ fontSize:13, color:C.tm, marginTop:4 }}>Gestion immobilière personnelle</div>
        </div>

        <div style={{ display:"flex", background:C.cr, borderRadius:10, padding:4, marginBottom:24, gap:4 }}>
          {(["login", "signup"] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError("") }}
              style={{
                flex:1, padding:"9px 0", borderRadius:8, border:"none",
                fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit",
                background: mode === m ? C.g : "transparent",
                color: mode === m ? "#fff" : C.tm,
                transition: "all .15s",
              }}
            >
              {m === "login" ? "Se connecter" : "Créer un compte"}
            </button>
          ))}
        </div>

        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Mot de passe (6 caractères min.)"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          style={inputStyle}
        />

        {error && (
          <div style={{ background:C.rp, color:C.rd, borderRadius:8, padding:"10px 14px", fontSize:13, marginBottom:14, fontWeight:600 }}>
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          style={{
            width:"100%", padding:"13px 0", borderRadius:10,
            background:C.g, color:"#fff", border:"none",
            fontWeight:800, fontSize:15,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily:"inherit",
            opacity: loading ? .7 : 1,
            transition:"opacity .15s",
          }}
        >
          {loading ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>

        <div style={{ textAlign:"center", marginTop:16, fontSize:12, color:C.tm }}>
          {mode === "login"
            ? "Pas encore de compte ? Cliquez sur « Créer un compte »."
            : "Déjà inscrit ? Cliquez sur « Se connecter »."}
        </div>
      </div>
    </div>
  )
}
