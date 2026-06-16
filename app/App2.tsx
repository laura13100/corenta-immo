import { useState, useEffect, useMemo } from "react";

const TYPES_LOT = [
  { id:"airbnb",       label:"Airbnb / Saisonnier",           emoji:"🏖", revCat:"Loyer Airbnb / saisonnier" },
  { id:"meuble",       label:"Bail meublé (LMNP)",            emoji:"🛋", revCat:"Loyer meublé" },
  { id:"nu",           label:"Bail nu",                       emoji:"🏠", revCat:"Loyer nu" },
  { id:"professionnel",label:"Bail professionnel équipé",     emoji:"💼", revCat:"Loyer professionnel équipé" },
  { id:"commercial",   label:"Bail commercial",               emoji:"🏪", revCat:"Loyer commercial" },
  { id:"parking",      label:"Parking / Cave",                emoji:"🅿️", revCat:"Loyer parking" },
];
const LOT_MAP = Object.fromEntries(TYPES_LOT.map(t=>[t.id,t]));

const LOT_COL = {
  airbnb:       {bg:"#eaf4fb",text:"#2471a3"},
  meuble:       {bg:"#e6efe9",text:"#2d5b3d"},
  nu:           {bg:"#eeebe3",text:"#6b8c74"},
  professionnel:{bg:"#fef9e7",text:"#b7860b"},
  commercial:   {bg:"#fdf2e9",text:"#ca6f1e"},
  parking:      {bg:"#f4ecf7",text:"#7d3c98"},
};

const TYPES_BIEN = ["Résidentiel nu","Résidentiel meublé","Professionnel équipé","Commercial","Mixte","Parking / Cave","Immeuble (multi-lots)"];
const REGIMES    = ["Nu / Revenus fonciers (2044)","LMNP / BIC réel","LMP / BIC réel","Micro-foncier","Micro-BIC","IS – SARL de famille","IS – SARL / SAS classique"];

const CAT_REV = ["Loyer nu","Loyer meublé","Loyer Airbnb / saisonnier","Loyer professionnel équipé","Loyer commercial","Loyer parking","Charges récupérées","Dépôt de garantie encaissé","Remboursement sinistre","Subvention / aide","Autre revenu"];
const CAT_CHG = [
  "Frais de gestion / conciergerie",
  "Charges de copropriété",
  "Assurance habitation",
  "Assurance loyers impayés",
  "Assurance emprunteur",
  "Assurance PNO",
  "Frais de ménage et d'entretien",
  "Frais de location et plateformes (Airbnb, Booking…)",
  "Honoraires comptable",
  "Abonnement électricité",
  "Abonnement internet / téléphone",
  "Abonnement eau / gaz",
  "Taxe foncière",
  "Taxe d'habitation",
  "Taxe de séjour",
  "CFE",
  "Charges sociales SSI",
  "Petits travaux (moins de 600 €)",
  "Petit mobilier (moins de 600 €)",
  "Travaux supérieurs à 600 €",
  "Mobilier supérieur à 600 €",
  "Crédit immobilier – capital",
  "Crédit immobilier – intérêts",
  "Parties communes",
  "Dépenses diverses",
  "Autre charge",
];

const ANNEES = Array.from({length:6},(_,i)=>new Date().getFullYear()-i);
const KEY = "corenta-immo-v5";

const euro = n => Number(n||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR"});
const pct  = n => `${Number(n||0).toFixed(2)} %`;
const fd   = d => { if(!d) return "—"; const [y,m,j]=d.split("-"); return `${j}/${m}/${y}`; };
const now  = () => new Date().toISOString().slice(0,10);
const uid  = () => Date.now()+Math.random().toString(36).slice(2);
const CY   = new Date().getFullYear();

function load() { try { return JSON.parse(localStorage.getItem(KEY))||init(); } catch { return init(); } }
function init() { return {biens:[],transactions:[],locataires:[],lots:[],documents:[]}; }

const C = {
  g:"#2d5b3d",gl:"#3d7a52",gp:"#e6efe9",
  cr:"#f7f4ee",cr2:"#eeebe3",
  tx:"#1a2a1f",tm:"#6b8c74",
  rd:"#c0392b",rp:"#fdecea",
  bl:"#2471a3",bp:"#eaf4fb",
  gd:"#b7860b",dp:"#fef9e7",
  wh:"#ffffff",br:"#dde8e0",
};

// ── primitives ──
const Inp=({label,...p})=>(
  <div style={{marginBottom:12}}>
    {label&&<label style={{display:"block",fontSize:11,fontWeight:700,color:C.gl,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>{label}</label>}
    <input style={{width:"100%",padding:"9px 11px",border:`1.5px solid ${C.br}`,borderRadius:8,fontSize:14,fontFamily:"inherit",color:C.tx,background:C.cr,outline:"none",boxSizing:"border-box"}} {...p}/>
  </div>
);
const Slc=({label,children,...p})=>(
  <div style={{marginBottom:12}}>
    {label&&<label style={{display:"block",fontSize:11,fontWeight:700,color:C.gl,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>{label}</label>}
    <select style={{width:"100%",padding:"9px 11px",border:`1.5px solid ${C.br}`,borderRadius:8,fontSize:14,fontFamily:"inherit",color:C.tx,background:C.cr,outline:"none",boxSizing:"border-box"}} {...p}>{children}</select>
  </div>
);
const Btn=({v="pri",children,sx,...p})=>{
  const S={pri:{background:C.g,color:"#fff",border:"none"},sec:{background:"transparent",color:C.g,border:`1.5px solid ${C.g}`},dan:{background:"transparent",color:C.rd,border:`1.5px solid ${C.rd}`},gho:{background:C.gp,color:C.g,border:"none"}};
  return <button style={{padding:"9px 18px",borderRadius:9,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",...S[v],...sx}} {...p}>{children}</button>;
};
const Card=({children,sx})=><div style={{background:C.wh,borderRadius:14,padding:"18px 20px",marginBottom:14,boxShadow:"0 1px 10px rgba(45,91,61,.07)",border:`1px solid ${C.br}`,...sx}}>{children}</div>;
const Bdg=({bg=C.gp,tx=C.g,children})=><span style={{display:"inline-block",padding:"2px 9px",borderRadius:20,background:bg,color:tx,fontSize:11,fontWeight:700}}>{children}</span>;
const SB=({label,value,color})=><div style={{textAlign:"center",padding:"8px 4px"}}><div style={{fontSize:20,fontWeight:800,color:color||C.g,lineHeight:1.1}}>{value}</div><div style={{fontSize:10,color:"rgba(255,255,255,.6)",marginTop:3,textTransform:"uppercase",letterSpacing:".06em"}}>{label}</div></div>;
const Div=()=><div style={{height:1,background:C.br,margin:"12px 0"}}/>;
const ST=({children})=><div style={{fontSize:11,fontWeight:700,color:C.gl,textTransform:"uppercase",letterSpacing:".07em",marginBottom:10}}>{children}</div>;
const KV=({k,v})=><div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.br}`,fontSize:13}}><span style={{color:C.tm}}>{k}</span><span style={{fontWeight:700}}>{v}</span></div>;

// ── stats ──
function stats(txs){
  const rev=txs.filter(t=>t.sens==="revenu");
  const chg=txs.filter(t=>t.sens==="charge");
  const R=rev.reduce((s,t)=>s+t.montant,0);
  const CH=chg.reduce((s,t)=>s+t.montant,0);
  const loyers=rev.filter(t=>t.categorie?.toLowerCase().includes("loyer")).reduce((s,t)=>s+t.montant,0);
  const ded=chg.filter(t=>t.categorie!=="Crédit immobilier – capital").reduce((s,t)=>s+t.montant,0);
  const cap=chg.filter(t=>t.categorie==="Crédit immobilier – capital").reduce((s,t)=>s+t.montant,0);
  const int=chg.filter(t=>t.categorie==="Crédit immobilier – intérêts").reduce((s,t)=>s+t.montant,0);
  return {rev,chg,R,CH,loyers,ded,cap,int,cf:R-CH,res:loyers-ded};
}

export default function App(){
  const [data,setData]=useState(load);
  const [page,setPage]=useState("dash");
  const [bienId,setBienId]=useState(null);
  const [lotId,setLotId]=useState(null);
  const [sub,setSub]=useState("apercu");
  const [an,setAn]=useState(CY);
  const [toast,setToast]=useState(null);
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});

  useEffect(()=>{ try{localStorage.setItem(KEY,JSON.stringify(data));}catch{} },[data]);

  const bien=useMemo(()=>data.biens.find(b=>b.id===bienId),[data.biens,bienId]);
  const isImm=bien?.type==="Immeuble (multi-lots)";
  const lotsB=useMemo(()=>(data.lots||[]).filter(l=>l.bienId===bienId),[data.lots,bienId]);
  const lot=useMemo(()=>(data.lots||[]).find(l=>l.id===lotId),[data.lots,lotId]);

  function toast_(msg,t="ok"){setToast({msg,t});setTimeout(()=>setToast(null),3000);}
  function openM(type,def={}){setModal(type);setForm(def);}
  function closeM(){setModal(null);setForm({});}
  function sf(k,v){setForm(f=>({...f,[k]:v}));}

  const txOf=(bId,lId,yr)=>data.transactions.filter(t=>
    t.bienId===bId&&
    (lId!==undefined?t.lotId===lId:true)&&
    (yr?String(t.date).startsWith(String(yr)):true)
  );
  const stBien=useMemo(()=>stats(txOf(bienId,undefined,an)),[data.transactions,bienId,an]);
  const stLot =useMemo(()=>stats(txOf(bienId,lotId,an)),[data.transactions,bienId,lotId,an]);

  // CRUD
  function saveBien(){
    if(!form.nom?.trim())return;
    const b={...form,valeurAchat:parseFloat(form.valeurAchat||0)};
    if(modal==="editBien"){
      setData(d=>({...d,biens:d.biens.map(x=>x.id===bienId?{...x,...b}:x)}));
      toast_("Bien mis à jour");
    } else {
      const nb={id:uid(),...b};
      setData(d=>({...d,biens:[...d.biens,nb]}));
      toast_(`Bien « ${nb.nom} » ajouté`);
    }
    closeM();
  }

  function saveLot(){
    if(!form.nom?.trim()||!form.typeLot)return;
    const l={...form,loyer:parseFloat(form.loyer||0),surface:parseFloat(form.surface||0),valeurEstimee:parseFloat(form.valeurEstimee||0)};
    if(modal==="editLot"){
      setData(d=>({...d,lots:d.lots.map(x=>x.id===lotId?{...x,...l}:x)}));
      toast_("Lot mis à jour");
    } else {
      const nl={id:uid(),bienId,...l};
      setData(d=>({...d,lots:[...(d.lots||[]),nl]}));
      toast_(`Lot « ${nl.nom} » ajouté`);
    }
    closeM();
  }

  function delLot(id){
    setData(d=>({...d,lots:(d.lots||[]).filter(l=>l.id!==id),transactions:d.transactions.filter(t=>t.lotId!==id)}));
    if(lotId===id){setLotId(null);setSub("lots");setPage("bien");}
    toast_("Lot supprimé","err");
  }

  function saveTx(){
    if(!form.montant||!form.date||!form.categorie)return;
    if(form.id){
      // édition d'une transaction existante
      setData(d=>({...d,transactions:d.transactions.map(t=>t.id===form.id?{...t,...form,montant:parseFloat(form.montant)}:t)}));
      toast_("Transaction mise à jour ✓");
      closeM();
    } else {
      const tx={id:uid(),bienId,lotId:form.lotId||null,...form,montant:parseFloat(form.montant)};
      setData(d=>({...d,transactions:[...d.transactions,tx]}));
      toast_(`${form.sens==="revenu"?"Revenu":"Charge"} enregistré${form.sens==="charge"?"e":""} ✓`);
      setForm(f=>({...f,montant:"",description:"",ref:""}));
    }
  }

  function saveLoc(){
    if(!form.nom?.trim())return;
    const l={id:uid(),bienId,lotId:form.lotId||null,...form};
    setData(d=>({...d,locataires:[...d.locataires,l]}));
    toast_("Locataire ajouté"); closeM();
  }

  function delTx(id){setData(d=>({...d,transactions:d.transactions.filter(t=>t.id!==id)}));toast_("Supprimé","err");}
  function editTx(t){openM("addTx",{...t});}
  function delLoc(id){setData(d=>({...d,locataires:d.locataires.filter(l=>l.id!==id)}));toast_("Locataire supprimé","err");}
  function delBien(id){
    setData(d=>({...d,biens:d.biens.filter(b=>b.id!==id),transactions:d.transactions.filter(t=>t.bienId!==id),locataires:d.locataires.filter(l=>l.bienId!==id),lots:(d.lots||[]).filter(l=>l.bienId!==id)}));
    setPage("dash");setBienId(null);toast_("Bien supprimé","err");
  }

  const allAn=data.transactions.filter(t=>String(t.date).startsWith(String(an)));
  const totRevG=allAn.filter(t=>t.sens==="revenu").reduce((s,t)=>s+t.montant,0);
  const totChgG=allAn.filter(t=>t.sens==="charge").reduce((s,t)=>s+t.montant,0);

  const NAV_IMM=[["apercu","📊 Aperçu"],["lots","🏢 Lots"],["revenus","💰 Revenus"],["charges","📉 Charges"],["locataires","👤 Locataires"],["tva","🔵 TVA"],["docs","📎 Documents"],["fiscal","📋 Déclaration"],["infos","⚙️ Infos"]];
  const NAV_BIE=[["apercu","📊 Aperçu"],["revenus","💰 Revenus"],["charges","📉 Charges"],["locataires","👤 Locataires"],["tva","🔵 TVA"],["docs","📎 Documents"],["fiscal","📋 Déclaration"],["infos","⚙️ Infos"]];
  const NAV_LOT=[["apercu_l","📊 Aperçu"],["rev_l","💰 Revenus"],["chg_l","📉 Charges"],["loc_l","👤 Locataire"],["tva_l","🔵 TVA"],["docs_l","📎 Documents"],["infos_l","⚙️ Infos"]];

  return (
    <div style={{fontFamily:"'Figtree',sans-serif",background:C.cr,minHeight:"100vh",color:C.tx}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0}
        button:hover{opacity:.85}
        input:focus,select:focus{border-color:${C.g}!important;box-shadow:0 0 0 3px ${C.gp}}
        @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ti{from{opacity:0;transform:translateX(-50%) translateY(14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .hov:hover{box-shadow:0 4px 20px rgba(45,91,61,.14)!important;transform:translateY(-2px)}
        .trow:hover{background:${C.gp}!important}
      `}</style>

      {/* HEADER */}
      <div style={{background:C.g,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 2px 16px rgba(45,91,61,.22)"}}>
        <div onClick={()=>{setPage("dash");setBienId(null);setLotId(null);}} style={{cursor:"pointer"}}>
          <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:"-0.5px"}}><span style={{fontWeight:300}}>Co</span>renta <span style={{fontSize:12,fontWeight:400,opacity:.6}}>Immobilier</span></div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.6)",fontWeight:500}}>Gestion · Rentabilité · Déclaration fiscale</div>
        </div>
        <select value={an} onChange={e=>setAn(Number(e.target.value))} style={{padding:"6px 10px",borderRadius:8,border:"none",background:"rgba(255,255,255,.15)",color:"#fff",fontSize:13,fontWeight:700,fontFamily:"inherit",cursor:"pointer"}}>
          {ANNEES.map(a=><option key={a} value={a} style={{color:C.tx}}>{a}</option>)}
        </select>
      </div>

      {/* NAV */}
      <div style={{background:C.wh,borderBottom:`2px solid ${C.br}`,display:"flex",gap:2,padding:"8px 14px 0",overflowX:"auto"}}>
        {[["dash","🏘 Tableau de bord"],bien&&["bien",`🏠 ${bien.nom}`],lot&&["lot",`${LOT_MAP[lot.typeLot]?.emoji||""} ${lot.nom}`]].filter(Boolean).map(([k,l])=>(
          <button key={k} onClick={()=>{if(k==="bien"){setPage("bien");setLotId(null);setSub(isImm?"lots":"apercu");}else setPage(k);}} style={{padding:"7px 14px",border:"none",borderRadius:"8px 8px 0 0",fontWeight:700,fontSize:13,fontFamily:"inherit",cursor:"pointer",whiteSpace:"nowrap",background:page===k?C.g:"transparent",color:page===k?"#fff":C.g}}>{l}</button>
        ))}
        <div style={{flex:1}}/>
        {page==="dash"&&<Btn v="gho" sx={{marginBottom:4,fontSize:12}} onClick={()=>openM("addBien",{type:TYPES_BIEN[0],regime:REGIMES[0]})}>+ Nouveau bien</Btn>}
        {page==="bien"&&isImm&&sub==="lots"&&<Btn v="gho" sx={{marginBottom:4,fontSize:12}} onClick={()=>openM("addLot",{typeLot:"meuble"})}>+ Nouveau lot</Btn>}
      </div>

      <div style={{maxWidth:800,margin:"0 auto",padding:"18px 14px 70px"}}>

        {/* ══ DASHBOARD ══ */}
        {page==="dash"&&(
          <>
            <Card sx={{background:`linear-gradient(135deg,${C.g},${C.gl})`,border:"none"}}>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.65)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:10}}>Synthèse {an}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4}}>
                <SB label="Biens" value={data.biens.length} color="#fff"/>
                <SB label="Revenus" value={euro(totRevG)} color="#a8d5b5"/>
                <SB label="Charges" value={euro(totChgG)} color="#f5a89a"/>
                <SB label="Cashflow" value={euro(totRevG-totChgG)} color={totRevG-totChgG>=0?"#a8d5b5":"#f5a89a"}/>
              </div>
            </Card>
            {data.biens.length===0?(
              <Card sx={{textAlign:"center",padding:"48px 20px"}}>
                <div style={{fontSize:48,marginBottom:12}}>🏡</div>
                <div style={{fontWeight:700,fontSize:17,marginBottom:6}}>Aucun bien enregistré</div>
                <div style={{color:C.tm,fontSize:13,marginBottom:20}}>Ajoutez un bien simple ou un immeuble multi-lots.</div>
                <Btn onClick={()=>openM("addBien",{type:TYPES_BIEN[0],regime:REGIMES[0]})}>+ Ajouter un bien</Btn>
              </Card>
            ):data.biens.map(b=>{
              const txB=data.transactions.filter(t=>t.bienId===b.id&&String(t.date).startsWith(String(an)));
              const rev=txB.filter(t=>t.sens==="revenu").reduce((s,t)=>s+t.montant,0);
              const chg=txB.filter(t=>t.sens==="charge").reduce((s,t)=>s+t.montant,0);
              const lotsB2=(data.lots||[]).filter(l=>l.bienId===b.id);
              const imm=b.type==="Immeuble (multi-lots)";
              return(
                <div key={b.id} className="hov" onClick={()=>{setBienId(b.id);setSub(imm?"lots":"apercu");setPage("bien");setLotId(null);}}
                  style={{background:C.wh,borderRadius:14,padding:"16px 20px",marginBottom:12,boxShadow:"0 1px 10px rgba(45,91,61,.07)",border:`1px solid ${C.br}`,cursor:"pointer",transition:"all .18s",animation:"fu .3s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:20}}>{imm?"🏢":"🏠"}</span>
                        <span style={{fontWeight:800,fontSize:16}}>{b.nom}</span>
                      </div>
                      {b.adresse&&<div style={{fontSize:12,color:C.tm,marginBottom:6}}>📍 {b.adresse}</div>}
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        <Bdg>{b.type}</Bdg>
                        {imm&&<Bdg bg={C.bp} tx={C.bl}>{lotsB2.length} lot{lotsB2.length!==1?"s":""}</Bdg>}
                        {imm&&[...new Set(lotsB2.map(l=>l.typeLot))].map(tp=>{
                          const info=LOT_MAP[tp]; const col=LOT_COL[tp];
                          return info?<Bdg key={tp} bg={col?.bg} tx={col?.text}>{info.emoji} {info.label.split(" ")[0]}</Bdg>:null;
                        })}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:9,color:C.tm,textTransform:"uppercase",letterSpacing:".06em"}}>Cashflow {an}</div>
                      <div style={{fontSize:22,fontWeight:900,color:rev-chg>=0?C.g:C.rd}}>{euro(rev-chg)}</div>
                      <div style={{fontSize:11,color:C.tm}}>{euro(rev)} rev · {euro(chg)} chg</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ══ PAGE BIEN ══ */}
        {page==="bien"&&bien&&(
          <>
            <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}>
              {(isImm?NAV_IMM:NAV_BIE).map(([k,l])=>(
                <button key={k} onClick={()=>setSub(k)} style={{padding:"6px 12px",borderRadius:8,border:`1.5px solid ${sub===k?C.g:C.br}`,background:sub===k?C.g:C.wh,color:sub===k?"#fff":C.tx,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
              ))}
            </div>

            {/* LOTS */}
            {sub==="lots"&&isImm&&(
              <>
                <Card sx={{background:`linear-gradient(135deg,${C.g},${C.gl})`,border:"none"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.65)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>Immeuble — {an}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
                    <SB label="Lots" value={lotsB.length} color="#fff"/>
                    <SB label="Revenus" value={euro(stBien.R)} color="#a8d5b5"/>
                    <SB label="Charges" value={euro(stBien.CH)} color="#f5a89a"/>
                    <SB label="Cashflow" value={euro(stBien.cf)} color={stBien.cf>=0?"#a8d5b5":"#f5a89a"}/>
                  </div>
                </Card>

                {lotsB.length>0&&(
                  <Card>
                    <ST>Composition de l'immeuble</ST>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
                      {TYPES_LOT.map(tp=>{
                        const n=lotsB.filter(l=>l.typeLot===tp.id).length; if(!n)return null;
                        const surf=lotsB.filter(l=>l.typeLot===tp.id).reduce((s,l)=>s+(l.surface||0),0);
                        const loy=lotsB.filter(l=>l.typeLot===tp.id).reduce((s,l)=>s+(l.loyer||0),0);
                        const col=LOT_COL[tp.id];
                        return(
                          <div key={tp.id} style={{background:col?.bg,borderRadius:10,padding:"10px 12px"}}>
                            <div style={{fontSize:20,marginBottom:4}}>{tp.emoji}</div>
                            <div style={{fontWeight:800,fontSize:14,color:col?.text}}>{n} lot{n>1?"s":""}</div>
                            <div style={{fontSize:11,color:C.tm}}>{tp.label.split("(")[0].trim()}</div>
                            {surf>0&&<div style={{fontSize:11,color:C.tm}}>{surf} m²</div>}
                            {loy>0&&<div style={{fontSize:12,fontWeight:700,color:col?.text,marginTop:2}}>{euro(loy)}/mois</div>}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{padding:"8px 12px",background:C.gp,borderRadius:8,display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:13,fontWeight:600}}>Loyer mensuel total cible</span>
                      <span style={{fontSize:15,fontWeight:800,color:C.g}}>{euro(lotsB.reduce((s,l)=>s+(l.loyer||0),0))}/mois</span>
                    </div>
                    <div style={{padding:"8px 12px",background:C.cr2,borderRadius:8,display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:13,fontWeight:600}}>Surface totale</span>
                      <span style={{fontSize:15,fontWeight:800}}>{lotsB.reduce((s,l)=>s+(l.surface||0),0)} m²</span>
                    </div>
                  </Card>
                )}

                {lotsB.length===0?(
                  <Card sx={{textAlign:"center",padding:"40px 20px"}}>
                    <div style={{fontSize:40,marginBottom:10}}>🏢</div>
                    <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>Aucun lot enregistré</div>
                    <div style={{color:C.tm,fontSize:13,marginBottom:18}}>Ajoutez les appartements, locaux et parkings de cet immeuble.</div>
                    <Btn onClick={()=>openM("addLot",{typeLot:"meuble"})}>+ Ajouter un lot</Btn>
                  </Card>
                ):lotsB.map(l=>{
                  const stL=stats(txOf(bienId,l.id,an));
                  const locL=data.locataires.filter(x=>x.lotId===l.id);
                  const tp=LOT_MAP[l.typeLot]; const col=LOT_COL[l.typeLot];
                  const rend=l.valeurEstimee>0?((l.loyer||0)*12/l.valeurEstimee*100):0;
                  return(
                    <div key={l.id} className="hov" onClick={()=>{setLotId(l.id);setSub("apercu_l");setPage("lot");}}
                      style={{background:C.wh,borderRadius:13,padding:"14px 18px",marginBottom:10,boxShadow:"0 1px 8px rgba(45,91,61,.06)",border:`1.5px solid ${col?.bg||C.br}`,cursor:"pointer",transition:"all .18s"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:5}}>
                            <span style={{fontSize:22}}>{tp?.emoji||"🏠"}</span>
                            <div>
                              <div style={{fontWeight:800,fontSize:15}}>{l.nom}</div>
                              <div style={{fontSize:11,color:C.tm}}>
                                {[l.etage&&`Étage ${l.etage}`,l.surface&&`${l.surface} m²`,l.nbPieces&&`${l.nbPieces} p.`].filter(Boolean).join(" · ")}
                              </div>
                            </div>
                          </div>
                          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                            <Bdg bg={col?.bg} tx={col?.text}>{tp?.label}</Bdg>
                            {locL.length>0?<Bdg bg={C.dp} tx={C.gd}>{locL[0].nom}</Bdg>:<Bdg bg={C.rp} tx={C.rd}>Vacant</Bdg>}
                            {rend>0&&<Bdg bg={C.gp} tx={C.g}>Rdt {pct(rend)}</Bdg>}
                          </div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          {l.loyer>0&&<div style={{fontSize:15,fontWeight:800,color:C.g}}>{euro(l.loyer)}<span style={{fontSize:11,fontWeight:400}}>/mois</span></div>}
                          <div style={{fontSize:11,color:stL.cf>=0?C.g:C.rd,fontWeight:700}}>CF {an} : {euro(stL.cf)}</div>
                          <div style={{fontSize:10,color:C.tm}}>{euro(stL.R)} / {euro(stL.CH)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Btn onClick={()=>openM("addLot",{typeLot:"meuble"})} sx={{marginTop:4}}>+ Ajouter un lot</Btn>
              </>
            )}

            {/* APERÇU BIEN */}
            {sub==="apercu"&&(
              <>
                <Card sx={{background:`linear-gradient(135deg,${C.g},${C.gl})`,border:"none"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.65)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>Performance {an}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
                    <SB label="Revenus" value={euro(stBien.R)} color="#a8d5b5"/>
                    <SB label="Charges" value={euro(stBien.CH)} color="#f5a89a"/>
                    <SB label="Cashflow" value={euro(stBien.cf)} color={stBien.cf>=0?"#a8d5b5":"#f5a89a"}/>
                    <SB label="Résultat fisc." value={euro(stBien.res)} color={stBien.res>=0?"#a8d5b5":"#f5a89a"}/>
                  </div>
                </Card>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                  <Card sx={{margin:0}}>
                    <ST>Rentabilité</ST>
                    {[["Valeur d'achat",euro(bien.valeurAchat)],["Rdt brut",pct(bien.valeurAchat>0?(stBien.loyers/bien.valeurAchat*100):0)],["Rdt net charges",pct(bien.valeurAchat>0?((stBien.loyers-stBien.ded)/bien.valeurAchat*100):0)],["Cashflow/mois",euro(stBien.cf/12)]].map(([k,v])=><KV key={k} k={k} v={v}/>)}
                  </Card>
                  <Card sx={{margin:0}}>
                    <ST>Crédit</ST>
                    {[["Capital remboursé",euro(stBien.cap)],["Intérêts payés",euro(stBien.int)],["Annuité totale",euro(stBien.cap+stBien.int)],["Intérêts déductibles","✓ Oui"]].map(([k,v])=><KV key={k} k={k} v={v}/>)}
                  </Card>
                </div>
                {isImm&&lotsB.length>0&&(
                  <Card>
                    <ST>Cashflow par lot — {an}</ST>
                    {lotsB.map(l=>{
                      const stL=stats(txOf(bienId,l.id,an));
                      const tp=LOT_MAP[l.typeLot]; const col=LOT_COL[l.typeLot];
                      return(
                        <div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.br}`,gap:8}}>
                          <div style={{display:"flex",gap:8,alignItems:"center",flex:1}}>
                            <span>{tp?.emoji}</span>
                            <span style={{fontSize:13,fontWeight:600}}>{l.nom}</span>
                            <Bdg bg={col?.bg} tx={col?.text}>{tp?.label.split(" ")[0]}</Bdg>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <span style={{fontSize:13,fontWeight:800,color:stL.cf>=0?C.g:C.rd}}>{euro(stL.cf)}</span>
                            <div style={{fontSize:10,color:C.tm}}>{euro(stL.R)} / {euro(stL.CH)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </Card>
                )}
                <div style={{display:"flex",gap:8}}>
                  <Btn onClick={()=>openM("addTx",{sens:"revenu",date:now(),categorie:CAT_REV[0],lotId:""})}>+ Revenu</Btn>
                  <Btn v="sec" onClick={()=>openM("addTx",{sens:"charge",date:now(),categorie:CAT_CHG[0],lotId:""})}>+ Charge</Btn>
                </div>
              </>
            )}

            {/* REVENUS / CHARGES BIEN */}
            {(sub==="revenus"||sub==="charges")&&<TxSec sens={sub==="revenus"?"revenu":"charge"} txs={sub==="revenus"?stBien.rev:stBien.chg} total={sub==="revenus"?stBien.R:stBien.CH} ded={stBien.ded} cap={stBien.cap} lots={isImm?lotsB:[]} onAdd={()=>openM("addTx",{sens:sub==="revenus"?"revenu":"charge",date:now(),categorie:sub==="revenus"?CAT_REV[0]:CAT_CHG[0],lotId:""})} onDel={delTx} onEdit={editTx} an={an}/>}

            {/* LOCATAIRES BIEN */}
            {sub==="locataires"&&(
              <>
                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
                  <Btn onClick={()=>openM("addLoc",{typeContrat:"Bail meublé",statut:"Actif",lotId:""})}>+ Ajouter locataire</Btn>
                </div>
                {data.locataires.filter(l=>l.bienId===bienId).length===0?
                  <Card sx={{textAlign:"center",padding:"36px 20px"}}><div style={{fontSize:32,marginBottom:10}}>👤</div><div style={{color:C.tm,fontSize:13}}>Aucun locataire.</div></Card>
                  :data.locataires.filter(l=>l.bienId===bienId).map(l=><LocCard key={l.id} l={l} lot={(data.lots||[]).find(x=>x.id===l.lotId)} onDel={delLoc}/>)}
              </>
            )}

            {/* FISCAL BIEN */}
            {sub==="fiscal"&&<FiscalSec bien={bien} st={stBien} an={an}/>}

            {/* TVA BIEN */}
            {sub==="tva"&&<TVASec txs={data.transactions.filter(t=>t.bienId===bienId)} lots={lotsB} an={an}/>}

            {/* DOCUMENTS BIEN */}
            {sub==="docs"&&<DocSec bienId={bienId} lotId={null} txs={data.transactions.filter(t=>t.bienId===bienId)} data={data} setData={setData} uid={uid} toast_={toast_}/>}

            {/* INFOS BIEN */}
            {sub==="infos"&&(
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontWeight:800,fontSize:16}}>{bien.nom}</div>
                  <div style={{display:"flex",gap:8}}>
                    <Btn v="gho" sx={{fontSize:12}} onClick={()=>openM("editBien",{...bien})}>✏️ Modifier</Btn>
                    <Btn v="dan" sx={{fontSize:12}} onClick={()=>{if(window.confirm("Supprimer ce bien et toutes ses données ?"))delBien(bienId);}}>Supprimer</Btn>
                  </div>
                </div>
                {[["Adresse",bien.adresse],["Type",bien.type],["Régime fiscal",bien.regime],["Valeur d'achat",bien.valeurAchat?euro(bien.valeurAchat):null],["Surface",bien.surface?`${bien.surface} m²`:null],["Acquisition",bien.anneeAcquisition],isImm&&["Nb de lots",lotsB.length],["Notes",bien.notes]].filter(Boolean).map(([k,v])=>v?<KV key={k} k={k} v={String(v)}/>:null)}
              </Card>
            )}
          </>
        )}

        {/* ══ PAGE LOT ══ */}
        {page==="lot"&&lot&&(
          <>
            {/* Header lot */}
            <div style={{background:LOT_COL[lot.typeLot]?.bg||C.gp,borderRadius:14,padding:"16px 20px",marginBottom:14,border:`1.5px solid ${C.br}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                    <span style={{fontSize:28}}>{LOT_MAP[lot.typeLot]?.emoji}</span>
                    <div>
                      <div style={{fontWeight:900,fontSize:18,color:LOT_COL[lot.typeLot]?.text}}>{lot.nom}</div>
                      <div style={{fontSize:12,color:C.tm}}>{LOT_MAP[lot.typeLot]?.label}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {lot.etage&&<Bdg>{`Étage ${lot.etage}`}</Bdg>}
                    {lot.surface&&<Bdg>{lot.surface} m²</Bdg>}
                    {lot.nbPieces&&<Bdg>{lot.nbPieces} pièce{lot.nbPieces>1?"s":""}</Bdg>}
                    {lot.loyer>0&&<Bdg bg={C.gp} tx={C.g}>{euro(lot.loyer)}/mois</Bdg>}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:22,fontWeight:900,color:stLot.cf>=0?C.g:C.rd}}>{euro(stLot.cf)}</div>
                  <div style={{fontSize:11,color:C.tm}}>cashflow {an}</div>
                </div>
              </div>
            </div>

            {/* Sous-nav lot */}
            <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}>
              {NAV_LOT.map(([k,l])=>(
                <button key={k} onClick={()=>setSub(k)} style={{padding:"6px 12px",borderRadius:8,border:`1.5px solid ${sub===k?C.g:C.br}`,background:sub===k?C.g:C.wh,color:sub===k?"#fff":C.tx,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
              ))}
            </div>

            {/* Aperçu lot */}
            {sub==="apercu_l"&&(
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                  <Card sx={{margin:0}}>
                    <ST>Performance {an}</ST>
                    {[["Revenus encaissés",euro(stLot.R)],["Charges imputées",euro(stLot.CH)],["Cashflow",euro(stLot.cf)],["Résultat fiscal",euro(stLot.res)]].map(([k,v])=><KV key={k} k={k} v={v}/>)}
                  </Card>
                  <Card sx={{margin:0}}>
                    <ST>Rentabilité lot</ST>
                    {[["Valeur estimée",euro(lot.valeurEstimee)],["Loyer cible/mois",euro(lot.loyer)],["Loyer annuel cible",euro((lot.loyer||0)*12)],["Rdt brut",pct(lot.valeurEstimee>0?((lot.loyer||0)*12/lot.valeurEstimee*100):0)]].map(([k,v])=><KV key={k} k={k} v={v}/>)}
                  </Card>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <Btn onClick={()=>openM("addTx",{sens:"revenu",date:now(),categorie:LOT_MAP[lot.typeLot]?.revCat||CAT_REV[0],lotId:lot.id})}>+ Revenu</Btn>
                  <Btn v="sec" onClick={()=>openM("addTx",{sens:"charge",date:now(),categorie:CAT_CHG[0],lotId:lot.id})}>+ Charge</Btn>
                </div>
              </>
            )}

            {sub==="rev_l"&&<TxSec sens="revenu" txs={stLot.rev} total={stLot.R} onAdd={()=>openM("addTx",{sens:"revenu",date:now(),categorie:LOT_MAP[lot.typeLot]?.revCat||CAT_REV[0],lotId:lot.id})} onDel={delTx} onEdit={editTx} an={an}/>}
            {sub==="chg_l"&&<TxSec sens="charge" txs={stLot.chg} total={stLot.CH} ded={stLot.ded} cap={stLot.cap} onAdd={()=>openM("addTx",{sens:"charge",date:now(),categorie:CAT_CHG[0],lotId:lot.id})} onDel={delTx} onEdit={editTx} an={an}/>}

            {/* DOCUMENTS LOT */}
            {sub==="docs_l"&&<DocSec bienId={bienId} lotId={lotId} txs={data.transactions.filter(t=>t.lotId===lotId)} data={data} setData={setData} uid={uid} toast_={toast_}/>}

            {/* TVA LOT */}
            {sub==="tva_l"&&<TVASec txs={data.transactions.filter(t=>t.lotId===lotId)} lots={[]} an={an}/>}

            {sub==="loc_l"&&(
              <>
                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
                  <Btn onClick={()=>openM("addLoc",{typeContrat:"Bail meublé",statut:"Actif",lotId:lot.id})}>+ Ajouter locataire</Btn>
                </div>
                {data.locataires.filter(l=>l.lotId===lotId).length===0?
                  <Card sx={{textAlign:"center",padding:"36px 20px"}}><div style={{fontSize:32,marginBottom:10}}>👤</div><div style={{color:C.tm,fontSize:13}}>Aucun locataire pour ce lot.</div></Card>
                  :data.locataires.filter(l=>l.lotId===lotId).map(l=><LocCard key={l.id} l={l} onDel={delLoc}/>)}
              </>
            )}

            {sub==="infos_l"&&(
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontWeight:800,fontSize:16}}>{lot.nom}</div>
                  <div style={{display:"flex",gap:8}}>
                    <Btn v="gho" sx={{fontSize:12}} onClick={()=>openM("editLot",{...lot})}>✏️ Modifier</Btn>
                    <Btn v="dan" sx={{fontSize:12}} onClick={()=>{if(window.confirm("Supprimer ce lot ?"))delLot(lot.id);}}>Supprimer</Btn>
                  </div>
                </div>
                {[["Type",LOT_MAP[lot.typeLot]?.label],["Étage",lot.etage],["Surface",lot.surface?`${lot.surface} m²`:null],["Nb pièces",lot.nbPieces],["Loyer cible",lot.loyer?euro(lot.loyer):null],["Valeur estimée",lot.valeurEstimee?euro(lot.valeurEstimee):null],["Notes",lot.notes]].map(([k,v])=>v!=null&&v!==""?<KV key={k} k={k} v={String(v)}/>:null)}
              </Card>
            )}
          </>
        )}
      </div>

      {/* ══ MODALS ══ */}
      {modal&&(
        <div onClick={closeM} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:900,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.wh,borderRadius:"18px 18px 0 0",padding:"24px 20px 36px",width:"100%",maxWidth:540,maxHeight:"90vh",overflowY:"auto",animation:"fu .22s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontWeight:800,fontSize:17,color:C.g}}>
                {{addBien:"Nouveau bien",editBien:"Modifier le bien",addLot:"Nouveau lot",editLot:"Modifier le lot",addTx:form.id?(form.sens==="revenu"?"Modifier le revenu":"Modifier la charge"):(form.sens==="revenu"?"Enregistrer un revenu":"Enregistrer une charge"),addLoc:"Ajouter un locataire"}[modal]}
              </div>
              <button onClick={closeM} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.tm}}>✕</button>
            </div>

            {(modal==="addBien"||modal==="editBien")&&<>
              <Inp label="Nom *" placeholder="ex. Immeuble Manosque, Appt Aix…" value={form.nom||""} onChange={e=>sf("nom",e.target.value)}/>
              <Inp label="Adresse" placeholder="Adresse complète" value={form.adresse||""} onChange={e=>sf("adresse",e.target.value)}/>
              <Slc label="Type" value={form.type||TYPES_BIEN[0]} onChange={e=>sf("type",e.target.value)}>{TYPES_BIEN.map(t=><option key={t}>{t}</option>)}</Slc>
              {form.type!=="Immeuble (multi-lots)"
                ? <Slc label="Régime fiscal" value={form.regime||REGIMES[0]} onChange={e=>sf("regime",e.target.value)}>{REGIMES.map(t=><option key={t}>{t}</option>)}</Slc>
                : <Slc label="Régime fiscal (immeuble)" value={form.regime||REGIMES[0]} onChange={e=>sf("regime",e.target.value)}>{REGIMES.map(t=><option key={t}>{t}</option>)}</Slc>
              }
              <Inp label="Valeur d'achat (€)" type="number" placeholder="350000" value={form.valeurAchat||""} onChange={e=>sf("valeurAchat",e.target.value)}/>
              <Inp label="Surface totale (m²)" type="number" placeholder="120" value={form.surface||""} onChange={e=>sf("surface",e.target.value)}/>
              <Inp label="Année d'acquisition" type="number" placeholder="2022" value={form.anneeAcquisition||""} onChange={e=>sf("anneeAcquisition",e.target.value)}/>
              <Inp label="Notes" placeholder="Remarques…" value={form.notes||""} onChange={e=>sf("notes",e.target.value)}/>
              <Btn onClick={saveBien} sx={{width:"100%",padding:13,fontSize:15}}>Enregistrer</Btn>
            </>}

            {(modal==="addLot"||modal==="editLot")&&<>
              <Inp label="Nom du lot *" placeholder="ex. Appt T3 2ème droite, Local RDC, Parking n°4…" value={form.nom||""} onChange={e=>sf("nom",e.target.value)}/>
              <Slc label="Type de lot *" value={form.typeLot||"meuble"} onChange={e=>sf("typeLot",e.target.value)}>
                {TYPES_LOT.map(t=><option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
              </Slc>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Inp label="Étage" placeholder="RDC, 1, 2…" value={form.etage||""} onChange={e=>sf("etage",e.target.value)}/>
                <Inp label="Nb de pièces" type="number" placeholder="3" value={form.nbPieces||""} onChange={e=>sf("nbPieces",e.target.value)}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Inp label="Surface (m²)" type="number" placeholder="45" value={form.surface||""} onChange={e=>sf("surface",e.target.value)}/>
                <Inp label="Loyer cible (€/mois)" type="number" placeholder="700" value={form.loyer||""} onChange={e=>sf("loyer",e.target.value)}/>
              </div>
              <Inp label="Valeur estimée du lot (€)" type="number" placeholder="150000" value={form.valeurEstimee||""} onChange={e=>sf("valeurEstimee",e.target.value)}/>
              <Inp label="Notes (DPE, équipements, travaux réalisés…)" placeholder="" value={form.notes||""} onChange={e=>sf("notes",e.target.value)}/>
              <Btn onClick={saveLot} sx={{width:"100%",padding:13,fontSize:15}}>Enregistrer le lot</Btn>
            </>}

            {modal==="addTx"&&<>
              <div style={{display:"flex",gap:6,marginBottom:14}}>
                {["revenu","charge"].map(s=>(
                  <button key={s} onClick={()=>setForm(f=>({...f,sens:s,categorie:s==="revenu"?CAT_REV[0]:CAT_CHG[0]}))}
                    style={{flex:1,padding:"9px 0",borderRadius:9,border:`2px solid ${form.sens===s?(s==="revenu"?C.g:C.rd):C.br}`,background:form.sens===s?(s==="revenu"?C.gp:C.rp):C.wh,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",color:form.sens===s?(s==="revenu"?C.g:C.rd):C.tm}}>
                    {s==="revenu"?"💰 Revenu":"📉 Charge"}
                  </button>
                ))}
              </div>
              <Inp label="Date *" type="date" value={form.date||now()} onChange={e=>sf("date",e.target.value)}/>
              <Slc label="Catégorie *" value={form.categorie||""} onChange={e=>sf("categorie",e.target.value)}>
                {(form.sens==="revenu"?CAT_REV:CAT_CHG).map(c=><option key={c}>{c}</option>)}
              </Slc>
              {isImm&&lotsB.length>0&&(
                <Slc label="Lot concerné" value={form.lotId||""} onChange={e=>sf("lotId",e.target.value||null)}>
                  <option value="">— Immeuble / Parties communes</option>
                  {lotsB.map(l=><option key={l.id} value={l.id}>{LOT_MAP[l.typeLot]?.emoji} {l.nom}</option>)}
                </Slc>
              )}
              <Inp label="Description / Tiers" placeholder="ex. M. Dupont – loyer mai, Leroy Merlin – robinetterie…" value={form.description||""} onChange={e=>sf("description",e.target.value)}/>
              {/* ── Bloc montant + TVA ── */}
              <div style={{background:C.cr,border:`1.5px solid ${C.br}`,borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:C.gl,textTransform:"uppercase",letterSpacing:".05em",marginBottom:10}}>Montant & TVA</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
                  <div>
                    <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gl,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>Montant TTC (€) *</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value={form.montant||""}
                      onChange={e=>{
                        const ttc=parseFloat(e.target.value)||0;
                        const taux=parseFloat(form.tauxTVA)||0;
                        const tva=taux>0 ? Math.round(ttc/(1+taux/100)*taux/100*100)/100 : 0;
                        setForm(f=>({...f,montant:e.target.value,tva,ht:Math.round((ttc-tva)*100)/100}));
                      }}
                      style={{width:"100%",padding:"9px 11px",border:`1.5px solid ${C.br}`,borderRadius:8,fontSize:14,fontFamily:"inherit",color:C.tx,background:C.wh,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gl,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>Taux TVA</label>
                    <select value={form.tauxTVA||"0"} onChange={e=>{
                        const taux=parseFloat(e.target.value)||0;
                        const ttc=parseFloat(form.montant)||0;
                        const tva=taux>0 ? Math.round(ttc/(1+taux/100)*taux/100*100)/100 : 0;
                        setForm(f=>({...f,tauxTVA:e.target.value,tva,ht:Math.round((ttc-tva)*100)/100}));
                      }}
                      style={{width:"100%",padding:"9px 11px",border:`1.5px solid ${C.br}`,borderRadius:8,fontSize:14,fontFamily:"inherit",color:C.tx,background:C.wh,outline:"none",boxSizing:"border-box"}}>
                      <option value="0">Sans TVA</option>
                      <option value="20">20 % (taux normal)</option>
                      <option value="10">10 % (travaux, restauration)</option>
                      <option value="5.5">5,5 % (rénovation énergétique)</option>
                      <option value="2.1">2,1 % (presse…)</option>
                    </select>
                  </div>
                </div>
                {(parseFloat(form.tauxTVA)||0)>0 && (parseFloat(form.montant)||0)>0 && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,background:C.wh,borderRadius:8,padding:"10px 12px",border:`1px solid ${C.br}`}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:10,color:C.tm,textTransform:"uppercase",letterSpacing:".05em",marginBottom:2}}>Montant HT</div>
                      <div style={{fontWeight:800,fontSize:16,color:C.g}}>{euro(form.ht||0)}</div>
                    </div>
                    <div style={{textAlign:"center",borderLeft:`1px solid ${C.br}`}}>
                      <div style={{fontSize:10,color:C.tm,textTransform:"uppercase",letterSpacing:".05em",marginBottom:2}}>TVA {form.tauxTVA} % récupérable</div>
                      <div style={{fontWeight:800,fontSize:16,color:C.bl}}>{euro(form.tva||0)}</div>
                    </div>
                  </div>
                )}
              </div>
              <Inp label="Référence / N° de pièce" placeholder="Facture, virement…" value={form.ref||""} onChange={e=>sf("ref",e.target.value)}/>
              <Btn onClick={saveTx} sx={{width:"100%",padding:13,fontSize:15}}>Enregistrer</Btn>
            </>}

            {modal==="addLoc"&&<>
              <Inp label="Nom complet *" placeholder="Prénom NOM" value={form.nom||""} onChange={e=>sf("nom",e.target.value)}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Inp label="Email" type="email" value={form.email||""} onChange={e=>sf("email",e.target.value)}/>
                <Inp label="Téléphone" type="tel" value={form.tel||""} onChange={e=>sf("tel",e.target.value)}/>
              </div>
              {isImm&&lotsB.length>0&&(
                <Slc label="Lot" value={form.lotId||""} onChange={e=>sf("lotId",e.target.value||null)}>
                  <option value="">— Bien entier</option>
                  {lotsB.map(l=><option key={l.id} value={l.id}>{LOT_MAP[l.typeLot]?.emoji} {l.nom}</option>)}
                </Slc>
              )}
              <Slc label="Type de contrat" value={form.typeContrat||"Bail meublé"} onChange={e=>sf("typeContrat",e.target.value)}>
                {["Bail meublé","Bail nu","Bail professionnel équipé","Bail commercial","Convention d'occupation","Airbnb / saisonnier"].map(t=><option key={t}>{t}</option>)}
              </Slc>
              <Slc label="Statut" value={form.statut||"Actif"} onChange={e=>sf("statut",e.target.value)}>
                {["Actif","Sorti","Préavis"].map(t=><option key={t}>{t}</option>)}
              </Slc>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Inp label="Loyer mensuel (€)" type="number" value={form.loyer||""} onChange={e=>sf("loyer",e.target.value)}/>
                <Inp label="Dépôt de garantie (€)" type="number" value={form.depotGarantie||""} onChange={e=>sf("depotGarantie",e.target.value)}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Inp label="Date d'entrée" type="date" value={form.dateEntree||""} onChange={e=>sf("dateEntree",e.target.value)}/>
                <Inp label="Date de sortie" type="date" value={form.dateSortie||""} onChange={e=>sf("dateSortie",e.target.value)}/>
              </div>
              <Inp label="Notes" placeholder="Observations particulières…" value={form.notes||""} onChange={e=>sf("notes",e.target.value)}/>
              <Btn onClick={saveLoc} sx={{width:"100%",padding:13,fontSize:15}}>Ajouter le locataire</Btn>
            </>}
          </div>
        </div>
      )}

      {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:toast.t==="err"?C.rd:C.g,color:"#fff",padding:"11px 22px",borderRadius:12,fontWeight:700,fontSize:14,boxShadow:"0 4px 20px rgba(0,0,0,.18)",zIndex:9999,animation:"ti .2s",whiteSpace:"nowrap"}}>{toast.msg}</div>}
    </div>
  );
}

// ── SOUS-COMPOSANTS ──
const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function TxSec({sens,txs,total,ded,cap,lots=[],onAdd,onDel,onEdit,an}){
  const isC=sens==="charge";
  const [cf,setCf]=useState("Toutes");
  const [vueMois,setVueMois]=useState(false);
  const cats=[...new Set(txs.map(t=>t.categorie))];
  const fil=cf==="Toutes"?txs:txs.filter(t=>t.categorie===cf);
  const totalTVA=txs.filter(t=>(t.tva||0)>0).reduce((s,t)=>s+(t.tva||0),0);

  // Groupement par mois
  const parMois = {};
  [...fil].sort((a,b)=>b.date.localeCompare(a.date)).forEach(t=>{
    const moisKey = t.date?.slice(0,7); // "2026-01"
    if(!parMois[moisKey]) parMois[moisKey]=[];
    parMois[moisKey].push(t);
  });

  return(
    <>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <div style={{fontWeight:800,fontSize:18,color:isC?C.rd:C.g}}>{euro(total)}</div>
            <div style={{fontSize:11,color:C.tm}}>Total {an}</div>
            {isC&&ded!=null&&<div style={{fontSize:11,color:C.tm}}>dont {euro(ded)} déductibles · {euro(cap)} capital non déductible</div>}
            {isC&&totalTVA>0&&<div style={{fontSize:11,color:C.bl,fontWeight:700}}>🔵 TVA récupérable : {euro(totalTVA)}</div>}
            {!isC&&totalTVA>0&&<div style={{fontSize:11,color:C.bl,fontWeight:700}}>🔵 TVA collectée : {euro(totalTVA)}</div>}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>setVueMois(!vueMois)} style={{padding:"6px 12px",borderRadius:8,border:`1.5px solid ${C.g}`,background:vueMois?C.g:C.wh,color:vueMois?"#fff":C.g,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              {vueMois?"Liste":"Par mois"}
            </button>
            <Btn onClick={onAdd}>+ Ajouter</Btn>
          </div>
        </div>

        {cats.length>1&&(
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
            {["Toutes",...cats].map(c=>(
              <button key={c} onClick={()=>setCf(c)} style={{padding:"4px 10px",borderRadius:20,border:`1.5px solid ${cf===c?C.g:C.br}`,background:cf===c?C.g:C.wh,color:cf===c?"#fff":C.tm,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{c}</button>
            ))}
          </div>
        )}

        {fil.length===0
          ? <div style={{textAlign:"center",color:C.tm,padding:"24px 0",fontSize:13}}>Aucun{isC?"e charge":" revenu"} pour {an}</div>
          : vueMois
            ? Object.entries(parMois).map(([moisKey, txsMois])=>{
                const [y,m]=moisKey.split("-");
                const totalMois=txsMois.reduce((s,t)=>s+t.montant,0);
                return(
                  <div key={moisKey} style={{marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`2px solid ${C.g}`,marginBottom:6}}>
                      <span style={{fontWeight:800,fontSize:14,color:C.g}}>{MOIS[parseInt(m)-1]} {y}</span>
                      <span style={{fontWeight:800,fontSize:14,color:isC?C.rd:C.g}}>{isC?"−":"+"} {euro(totalMois)}</span>
                    </div>
                    {txsMois.map(t=><TxRow key={t.id} t={t} isC={isC} lots={lots} onEdit={onEdit} onDel={onDel}/>)}
                  </div>
                );
              })
            : [...fil].sort((a,b)=>b.date.localeCompare(a.date)).map(t=><TxRow key={t.id} t={t} isC={isC} lots={lots} onEdit={onEdit} onDel={onDel}/>)
        }
      </Card>
    </>
  );
}

function TxRow({t, isC, lots, onEdit, onDel}){
  return(
    <div className="trow" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"9px 4px",borderBottom:`1px solid ${C.br}`,borderRadius:6,transition:"background .15s",gap:8}}>
      <div style={{flex:1}}>
        <div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{t.description||t.categorie}</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
          <Bdg bg={isC?C.cr2:C.gp} tx={isC?C.tm:C.g}>{t.categorie}</Bdg>
          <span style={{fontSize:11,color:C.tm}}>📅 {fd(t.date)}</span>
          {t.lotId&&lots.length>0&&(()=>{const l=lots.find(x=>x.id===t.lotId);return l?<span style={{fontSize:10,color:C.bl}}>📦 {l.nom}</span>:null;})()}
          {t.ref&&<span style={{fontSize:10,color:C.tm}}>#{t.ref}</span>}
          {isC&&t.categorie==="Crédit immobilier – capital"&&<span style={{fontSize:10,color:C.rd,fontWeight:700}}>Non déductible</span>}
          {(t.tva||0)>0&&<span style={{fontSize:10,color:C.bl,fontWeight:700,background:C.bp,padding:"1px 6px",borderRadius:10}}>TVA {t.tauxTVA}% · {euro(t.tva)} récup.</span>}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
        <span style={{fontWeight:800,fontSize:14,color:isC?C.rd:C.g}}>{isC?"−":"+"} {euro(t.montant)}</span>
        <button onClick={()=>onEdit(t)} style={{background:C.gp,border:"none",borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",color:C.g,fontWeight:700}}>✏️</button>
        <button onClick={()=>onDel(t.id)} style={{background:"none",border:"none",color:C.tm,cursor:"pointer",fontSize:14,padding:2}}>✕</button>
      </div>
    </div>
  );
}

function LocCard({l,lot,onDel}){
  return(
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:15,marginBottom:4}}>{l.nom}</div>
          {lot&&<div style={{fontSize:12,color:C.bl,marginBottom:4}}>📦 {lot.nom} — {LOT_MAP[lot.typeLot]?.label}</div>}
          {l.email&&<div style={{fontSize:12,color:C.tm,marginBottom:2}}>✉️ {l.email}</div>}
          {l.tel&&<div style={{fontSize:12,color:C.tm,marginBottom:6}}>📞 {l.tel}</div>}
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <Bdg>{l.typeContrat}</Bdg>
            <Bdg bg={l.statut==="Actif"?C.gp:C.rp} tx={l.statut==="Actif"?C.g:C.rd}>{l.statut}</Bdg>
            {l.loyer&&<Bdg bg={C.dp} tx={C.gd}>{euro(l.loyer)}/mois</Bdg>}
          </div>
          {l.dateEntree&&<div style={{fontSize:11,color:C.tm,marginTop:6}}>Entrée : {fd(l.dateEntree)}{l.dateSortie?` · Sortie : ${fd(l.dateSortie)}`:""}</div>}
          {l.depotGarantie&&<div style={{fontSize:11,color:C.tm}}>DG : {euro(l.depotGarantie)}</div>}
          {l.notes&&<div style={{fontSize:12,color:C.tm,marginTop:6,fontStyle:"italic"}}>{l.notes}</div>}
        </div>
        <button onClick={()=>onDel(l.id)} style={{background:"none",border:"none",color:C.rd,cursor:"pointer",fontSize:18,padding:4}}>✕</button>
      </div>
    </Card>
  );
}


function TVASec({txs, lots, an}){
  const txAn = txs.filter(t=>String(t.date).startsWith(String(an)));

  // TVA déductible = sur les charges avec TVA
  const chgTVA = txAn.filter(t=>t.sens==="charge"&&(t.tva||0)>0);
  const totalDed = chgTVA.reduce((s,t)=>s+(t.tva||0),0);

  // TVA collectée = sur les revenus avec TVA
  const revTVA = txAn.filter(t=>t.sens==="revenu"&&(t.tva||0)>0);
  const totalCollectee = revTVA.reduce((s,t)=>s+(t.tva||0),0);

  const solde = totalCollectee - totalDed;

  // Regrouper par taux
  const byTaux = {};
  chgTVA.forEach(t=>{
    const k=t.tauxTVA||"?";
    if(!byTaux[k]) byTaux[k]={taux:k,ht:0,tva:0,count:0};
    byTaux[k].ht+=(t.ht||0); byTaux[k].tva+=(t.tva||0); byTaux[k].count++;
  });

  return(
    <>
      {/* Solde TVA */}
      <Card sx={{background:`linear-gradient(135deg,${C.bl},#1a5276)`,border:"none"}}>
        <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.65)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:10}}>Bilan TVA — {an}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
          {[["TVA collectée",euro(totalCollectee),"#a8d5b5"],["TVA déductible",euro(totalDed),"#f5c6c0"],["Solde (à payer)",euro(solde),solde>=0?"#f5c6c0":"#a8d5b5"]].map(([l,v,col])=>(
            <div key={l} style={{textAlign:"center",padding:"8px 4px"}}>
              <div style={{fontSize:18,fontWeight:800,color:col,lineHeight:1.1}}>{v}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.6)",marginTop:3,textTransform:"uppercase",letterSpacing:".06em"}}>{l}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* TVA déductible détail */}
      <Card>
        <ST>TVA déductible sur achats & charges</ST>
        {chgTVA.length===0
          ? <div style={{textAlign:"center",color:C.tm,padding:"20px 0",fontSize:13}}>Aucune charge avec TVA renseignée pour {an}</div>
          : <>
              {Object.values(byTaux).map(g=>(
                <div key={g.taux} style={{padding:"8px 0",borderBottom:`1px solid ${C.br}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:700}}>Taux {g.taux} % <span style={{fontWeight:400,color:C.tm}}>({g.count} op.)</span></span>
                    <span style={{fontSize:13,fontWeight:800,color:C.bl}}>{euro(g.tva)}</span>
                  </div>
                  <div style={{fontSize:11,color:C.tm}}>Base HT : {euro(g.ht)}</div>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0",marginTop:4}}>
                <span style={{fontWeight:800}}>Total TVA déductible</span>
                <span style={{fontWeight:800,color:C.bl,fontSize:15}}>{euro(totalDed)}</span>
              </div>
            </>
        }
      </Card>

      {/* Détail ligne par ligne */}
      {chgTVA.length>0&&(
        <Card>
          <ST>Détail des achats avec TVA</ST>
          {[...chgTVA].sort((a,b)=>b.date.localeCompare(a.date)).map(t=>{
            const lot=lots.find(l=>l.id===t.lotId);
            return(
              <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"8px 0",borderBottom:`1px solid ${C.br}`,gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{t.description||t.categorie}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,color:C.tm}}>📅 {fd(t.date)}</span>
                    <span style={{fontSize:11,color:C.tm}}>HT : {euro(t.ht)}</span>
                    {lot&&<span style={{fontSize:10,color:C.bl}}>📦 {lot.nom}</span>}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.bl}}>{euro(t.tva)}</div>
                  <div style={{fontSize:10,color:C.tm}}>TVA {t.tauxTVA} %</div>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Déclaration CA3 */}
      <Card sx={{background:"#f0f4ff",border:`1px solid ${C.bl}`}}>
        <div style={{fontSize:12,fontWeight:700,color:C.bl,marginBottom:10}}>💡 Déclaration CA3 (TVA mensuelle/trimestrielle)</div>
        <div style={{fontSize:13,lineHeight:1.9}}>
          <b>Ligne 01</b> – CA HT soumis à TVA : <strong>{euro(revTVA.reduce((s,t)=>s+(t.ht||0),0))}</strong><br/>
          <b>Ligne 08</b> – TVA collectée : <strong>{euro(totalCollectee)}</strong><br/>
          <b>Ligne 20</b> – TVA déductible sur achats : <strong>{euro(totalDed)}</strong><br/>
          <b>Ligne 23</b> – TVA à payer (ou crédit) :{" "}
          <strong style={{color:solde>=0?C.rd:C.g}}>
            {solde>=0?`${euro(solde)} à décaisser`:`Crédit de ${euro(Math.abs(solde))}`}
          </strong>
        </div>
        {solde<0&&(
          <div style={{marginTop:10,background:C.gp,borderRadius:8,padding:"9px 12px",fontSize:12,color:C.g,fontWeight:600}}>
            ✓ Crédit de TVA — tu peux demander le remboursement ou l'imputer sur la prochaine déclaration.
          </div>
        )}
      </Card>
    </>
  );
}

function DocSec({bienId, lotId, txs, data, setData, uid, toast_}){
  const [preview, setPreview] = useState(null);
  const [linkTx, setLinkTx] = useState("");

  const docs = (data.documents||[]).filter(d=>
    d.bienId===bienId && (lotId ? d.lotId===lotId : true)
  );

  function handleFiles(files){
    Array.from(files).forEach(file=>{
      if(file.size > 5*1024*1024){ toast_("Fichier trop lourd (max 5 Mo)","err"); return; }
      const reader = new FileReader();
      reader.onload = e => {
        const doc = {
          id: uid(),
          bienId,
          lotId: lotId||null,
          txId: linkTx||null,
          nom: file.name,
          type: file.type,
          data: e.target.result,
          date: new Date().toISOString().slice(0,10),
        };
        setData(d=>({...d, documents:[...(d.documents||[]), doc]}));
        toast_(`« ${file.name} » ajouté`);
      };
      reader.readAsDataURL(file);
    });
  }

  function delDoc(id){
    setData(d=>({...d,documents:(d.documents||[]).filter(x=>x.id!==id)}));
    toast_("Document supprimé","err");
  }

  const isPdf = d => d.type==="application/pdf";
  const isImg = d => d.type?.startsWith("image/");

  // group by linked transaction
  const linked   = docs.filter(d=>d.txId);
  const unlinked = docs.filter(d=>!d.txId);
  const txsCharge = txs.filter(t=>t.sens==="charge");

  return(
    <>
      {/* Upload zone */}
      <Card>
        <ST>Ajouter un document</ST>
        <div
          onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.g;}}
          onDragLeave={e=>{e.currentTarget.style.borderColor=C.br;}}
          onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.br;handleFiles(e.dataTransfer.files);}}
          style={{border:`2px dashed ${C.br}`,borderRadius:12,padding:"28px 20px",textAlign:"center",marginBottom:14,transition:"border .2s",cursor:"pointer",background:C.cr}}
          onClick={()=>document.getElementById("doc-input").click()}
        >
          <div style={{fontSize:32,marginBottom:6}}>📎</div>
          <div style={{fontWeight:700,fontSize:14,color:C.g,marginBottom:4}}>Glisser-déposer ou cliquer</div>
          <div style={{fontSize:12,color:C.tm}}>Photos de tickets · Factures PDF · Images (max 5 Mo)</div>
          <input id="doc-input" type="file" accept="image/*,application/pdf" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
        </div>

        {txsCharge.length>0&&(
          <div style={{marginBottom:4}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gl,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>Associer à une dépense (optionnel)</label>
            <select value={linkTx} onChange={e=>setLinkTx(e.target.value)} style={{width:"100%",padding:"9px 11px",border:`1.5px solid ${C.br}`,borderRadius:8,fontSize:13,fontFamily:"inherit",color:C.tx,background:C.cr,outline:"none",boxSizing:"border-box"}}>
              <option value="">— Aucune dépense liée</option>
              {txsCharge.map(t=><option key={t.id} value={t.id}>{t.date} · {t.categorie} · {euro(t.montant)}{t.description?` — ${t.description}`:""}</option>)}
            </select>
          </div>
        )}
      </Card>

      {/* Docs liés à une dépense */}
      {linked.length>0&&(
        <Card>
          <ST>Justificatifs de dépenses ({linked.length})</ST>
          {linked.map(d=>{
            const tx = txs.find(t=>t.id===d.txId);
            return <DocRow key={d.id} d={d} tx={tx} onDel={delDoc} onPreview={setPreview} isPdf={isPdf} isImg={isImg}/>;
          })}
        </Card>
      )}

      {/* Docs non liés */}
      {unlinked.length>0&&(
        <Card>
          <ST>Autres documents ({unlinked.length})</ST>
          {unlinked.map(d=><DocRow key={d.id} d={d} onDel={delDoc} onPreview={setPreview} isPdf={isPdf} isImg={isImg}/>)}
        </Card>
      )}

      {docs.length===0&&(
        <Card sx={{textAlign:"center",padding:"36px 20px"}}>
          <div style={{fontSize:36,marginBottom:10}}>🗂</div>
          <div style={{color:C.tm,fontSize:13}}>Aucun document pour ce bien.<br/>Ajoutez tickets de caisse et factures ci-dessus.</div>
        </Card>
      )}

      {/* Preview modal */}
      {preview&&(
        <div onClick={()=>setPreview(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:1000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",maxWidth:600,marginBottom:12}}>
            <span style={{color:"#fff",fontWeight:700,fontSize:14}}>{preview.nom}</span>
            <button onClick={()=>setPreview(null)} style={{background:"none",border:"none",color:"#fff",fontSize:24,cursor:"pointer"}}>✕</button>
          </div>
          <div onClick={e=>e.stopPropagation()} style={{maxWidth:600,width:"100%",maxHeight:"80vh",overflow:"auto",borderRadius:12}}>
            {preview.type?.startsWith("image/")
              ? <img src={preview.src} alt={preview.nom} style={{width:"100%",borderRadius:12}}/>
              : <iframe src={preview.src} title={preview.nom} style={{width:"100%",height:"75vh",border:"none",borderRadius:12}}/>
            }
          </div>
          <a href={preview.src} download={preview.nom} style={{marginTop:12,padding:"9px 20px",background:C.g,color:"#fff",borderRadius:9,fontWeight:700,fontSize:13,textDecoration:"none"}}>⬇️ Télécharger</a>
        </div>
      )}
    </>
  );
}

function DocRow({d, tx, onDel, onPreview, isPdf, isImg}){
  const euro2 = n => Number(n||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR"});
  const fd2   = s => { if(!s) return ""; const [y,m,j]=s.split("-"); return `${j}/${m}/${y}`; };
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.br}`}}>
      {/* Thumbnail */}
      <div onClick={()=>onPreview({src:d.data,nom:d.nom,type:d.type})} style={{width:48,height:48,borderRadius:8,overflow:"hidden",flexShrink:0,cursor:"pointer",background:C.cr2,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${C.br}`}}>
        {isImg(d)
          ? <img src={d.data} alt={d.nom} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          : <span style={{fontSize:24}}>📄</span>
        }
      </div>
      {/* Info */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:600,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.nom}</div>
        <div style={{fontSize:11,color:C.tm}}>{fd2(d.date)}</div>
        {tx&&<div style={{fontSize:11,color:C.g,fontWeight:600,marginTop:1}}>🔗 {tx.categorie} · {euro2(tx.montant)}{tx.description?` — ${tx.description}`:""}</div>}
      </div>
      {/* Actions */}
      <div style={{display:"flex",gap:6,flexShrink:0}}>
        <button onClick={()=>onPreview({src:d.data,nom:d.nom,type:d.type})} style={{background:C.gp,border:"none",borderRadius:7,padding:"5px 10px",fontSize:12,cursor:"pointer",color:C.g,fontWeight:700}}>👁</button>
        <a href={d.data} download={d.nom} style={{background:C.cr2,border:"none",borderRadius:7,padding:"5px 10px",fontSize:12,cursor:"pointer",color:C.tx,fontWeight:700,textDecoration:"none"}}>⬇️</a>
        <button onClick={()=>onDel(d.id)} style={{background:"none",border:"none",color:C.rd,cursor:"pointer",fontSize:16,padding:"2px 4px"}}>✕</button>
      </div>
    </div>
  );
}


function FL({label,v,bold,indent,muted,col}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",paddingLeft:indent?12:0,borderBottom:`1px solid ${C.br}`}}>
      <span style={{fontSize:13,color:muted?C.tm:C.tx}}>{label}</span>
      <span style={{fontSize:13,fontWeight:bold?800:600,color:col||(muted?C.tm:C.tx)}}>{v}</span>
    </div>
  );
}

// ── Calcul IS ──
function calcIS(resultat){
  if(resultat<=0) return 0;
  const tranche1 = Math.min(resultat, 42500);
  const tranche2 = Math.max(0, resultat - 42500);
  return tranche1*0.15 + tranche2*0.25;
}

function FiscalSec({bien, st, an}){
  const {R:loyers, ded, cap, int:interets, res} = st;
  const reg = bien.regime||"";
  const isIS = reg.includes("IS") || reg.includes("SARL") || reg.includes("SAS");

  // IS spécifique
  const is = calcIS(res);
  const resultatNet = res - is;
  const [dividendes, setDividendes] = useState(0);
  const flatTax = Math.max(0, dividendes) * 0.30;
  const reserveLegale = Math.max(0, resultatNet) * 0.05;

  if(isIS) return (
    <>
      {/* Compte de résultat simplifié */}
      <Card sx={{border:`2px solid ${C.g}`}}>
        <div style={{fontWeight:800,color:C.g,marginBottom:4}}>Compte de résultat — {an}</div>
        <div style={{fontSize:12,color:C.tm,marginBottom:14}}>Structure : <strong>{bien.nom}</strong> · Régime : <strong>{reg}</strong></div>

        <div style={{fontSize:11,fontWeight:700,color:C.tm,marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>Produits</div>
        <FL label="Loyers et produits encaissés" v={euro(loyers)} bold/>
        <Div/>

        <div style={{fontSize:11,fontWeight:700,color:C.tm,margin:"4px 0 6px",textTransform:"uppercase",letterSpacing:".05em"}}>Charges déductibles IS</div>
        {interets>0    && <FL label="Intérêts d'emprunt" v={euro(interets)} indent/>}
        {ded-interets>0&& <FL label="Autres charges (assurances, travaux, gestion…)" v={euro(ded-interets)} indent/>}
        <Div/>
        <FL label="Total charges déductibles" v={euro(ded)} bold/>
        {cap>0&&<FL label="Remboursement capital (non déductible IS)" v={euro(cap)} muted/>}
        <Div/>

        <FL label={`Résultat fiscal ${res>=0?"bénéficiaire":"déficitaire"}`} v={euro(res)} bold col={res>=0?C.g:C.rd}/>
      </Card>

      {/* Calcul IS */}
      <Card sx={{border:`1.5px solid ${C.bl}`}}>
        <div style={{fontWeight:800,color:C.bl,marginBottom:12}}>🏛 Impôt sur les Sociétés</div>
        {res<=0?(
          <div style={{background:C.gp,borderRadius:8,padding:"12px 14px",fontSize:13,color:C.g,fontWeight:600}}>
            ✓ Résultat déficitaire — aucun IS dû cette année.<br/>
            <span style={{fontWeight:400,fontSize:12}}>Le déficit est reportable sur les exercices suivants (report illimité).</span>
          </div>
        ):(
          <>
            <FL label={`Tranche 15 % (jusqu'à 42 500 €)`} v={euro(Math.min(res,42500)*0.15)} indent/>
            {res>42500&&<FL label="Tranche 25 % (au-delà de 42 500 €)" v={euro((res-42500)*0.25)} indent/>}
            <Div/>
            <FL label="IS total estimé" v={euro(is)} bold col={C.bl}/>
            <Div/>
            <FL label="Résultat net après IS" v={euro(resultatNet)} bold col={resultatNet>=0?C.g:C.rd}/>
            <FL label="Réserve légale 5 % (obligatoire)" v={euro(reserveLegale)} muted/>
            <FL label="Bénéfice distribuable" v={euro(Math.max(0,resultatNet-reserveLegale))} bold/>
          </>
        )}
      </Card>

      {/* Simulation dividendes */}
      {res>0&&(
        <Card>
          <div style={{fontWeight:800,color:C.gd,marginBottom:12}}>💸 Simulation dividendes</div>
          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gl,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>Montant de dividendes à distribuer (€)</label>
            <input type="number" min="0" max={Math.max(0,resultatNet-reserveLegale)} value={dividendes}
              onChange={e=>setDividendes(Math.min(parseFloat(e.target.value)||0, Math.max(0,resultatNet-reserveLegale)))}
              style={{width:"100%",padding:"9px 11px",border:`1.5px solid ${C.br}`,borderRadius:8,fontSize:14,fontFamily:"inherit",color:C.tx,background:C.cr,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <FL label="Flat tax PFU 30 % (IR + PS)" v={euro(flatTax)}/>
          <FL label="Dividendes nets perçus" v={euro(Math.max(0,dividendes-flatTax))} bold col={C.g}/>
          <Div/>
          <div style={{background:C.dp,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.gd}}>
            💡 La flat tax 30 % se décompose en 12,8 % d'IR + 17,2 % de prélèvements sociaux. Option possible pour le barème progressif si ton TMI est &lt; 30 %.
          </div>
        </Card>
      )}

      {/* Vue globale IS */}
      {res>0&&(
        <Card sx={{background:C.gp,border:`1px solid ${C.g}`}}>
          <div style={{fontSize:12,fontWeight:700,color:C.g,marginBottom:10}}>📊 Synthèse IS — {an}</div>
          {[
            ["Loyers bruts",euro(loyers)],
            ["Charges déductibles",euro(ded)],
            ["Résultat fiscal",euro(res)],
            ["IS estimé",euro(is)],
            ["Résultat net après IS",euro(resultatNet)],
            ["Taux effectif IS",pct(res>0?is/res*100:0)],
            ["Cashflow après IS",euro(st.cf-is)],
          ].map(([k,v])=><KV key={k} k={k} v={v}/>)}
        </Card>
      )}

      {/* Liasse fiscale */}
      <Card sx={{background:"#f0f4ff",border:"1px solid #2471a3"}}>
        <div style={{fontSize:12,fontWeight:700,color:C.bl,marginBottom:8}}>💡 À reporter — Liasse IS</div>
        <div style={{fontSize:13,lineHeight:1.9}}>
          <b>Formulaire 2065</b> (déclaration IS SARL/SAS)<br/>
          Chiffre d'affaires (produits) : <strong>{euro(loyers)}</strong><br/>
          Charges déductibles totales : <strong>{euro(ded)}</strong><br/>
          Résultat fiscal : <strong style={{color:res>=0?C.g:C.rd}}>{euro(res)}</strong><br/>
          IS à payer : <strong style={{color:C.bl}}>{euro(is)}</strong><br/>
          <br/>
          <b>Acomptes IS</b> (si IS &gt; 3 000 €)<br/>
          4 acomptes trimestriels de : <strong>{euro(is/4)}</strong><br/>
          (15 mars · 15 juin · 15 sept. · 15 déc.)
        </div>
      </Card>
    </>
  );

  // ── Régimes IR (inchangé) ──
  return(
    <>
      <Card sx={{border:`2px solid ${C.g}`}}>
        <div style={{fontWeight:800,color:C.g,marginBottom:4}}>Récapitulatif fiscal {an}</div>
        <div style={{fontSize:12,color:C.tm,marginBottom:14}}>Régime : <strong>{reg}</strong> — {bien.nom}</div>
        <FL label="Revenus bruts encaissés" v={euro(loyers)} bold/>
        <Div/>
        <div style={{fontSize:11,fontWeight:700,color:C.tm,margin:"4px 0 6px",textTransform:"uppercase",letterSpacing:".05em"}}>Charges déductibles</div>
        {interets>0&&<FL label="Intérêts d'emprunt" v={euro(interets)} indent/>}
        {ded-interets>0&&<FL label="Autres charges déductibles" v={euro(ded-interets)} indent/>}
        <Div/>
        <FL label="Total déductible" v={euro(ded)} bold/>
        {cap>0&&<FL label="Capital remboursé (non déductible)" v={euro(cap)} muted/>}
        <Div/>
        <FL label={`Résultat ${res>=0?"bénéficiaire":"déficitaire"}`} v={euro(res)} bold col={res>=0?C.g:C.rd}/>
      </Card>
      <Card sx={{background:C.gp,border:`1px solid ${C.g}`}}>
        <div style={{fontSize:12,fontWeight:700,color:C.g,marginBottom:8}}>💡 À reporter en déclaration</div>
        {reg.includes("2044")&&<div style={{fontSize:13,lineHeight:1.8}}><b>Formulaire 2044</b><br/>Ligne 211 (Loyers) : <strong>{euro(loyers)}</strong><br/>Ligne 221 (Intérêts) : <strong>{euro(interets)}</strong><br/>Ligne 229 (Autres charges) : <strong>{euro(ded-interets)}</strong><br/>Résultat net : <strong style={{color:res>=0?C.g:C.rd}}>{euro(res)}</strong></div>}
        {reg.includes("BIC")&&<div style={{fontSize:13,lineHeight:1.8}}><b>Liasse BIC (2031 / 2033)</b><br/>CA : <strong>{euro(loyers)}</strong><br/>Charges : <strong>{euro(ded)}</strong><br/>Résultat : <strong style={{color:res>=0?C.g:C.rd}}>{euro(res)}</strong></div>}
        {reg.includes("Micro-foncier")&&<div style={{fontSize:13,lineHeight:1.8}}><b>Déclaration 2042 — Case 4BE</b><br/>Loyers bruts : <strong>{euro(loyers)}</strong><br/>(abattement 30 % calculé automatiquement)</div>}
        {reg.includes("Micro-BIC")&&<div style={{fontSize:13,lineHeight:1.8}}><b>Déclaration 2042 C PRO</b><br/>Recettes BIC : <strong>{euro(loyers)}</strong><br/>(abattement 50 % calculé automatiquement)</div>}
      </Card>
    </>
  );
}
