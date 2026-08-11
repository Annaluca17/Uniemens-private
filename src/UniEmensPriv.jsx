import { useState, useRef } from "react";

/* ═══ UTILITIES ═══ */
const uid = () => Math.random().toString(36).slice(2, 9);
const parseIt = (v) => { const n = parseFloat(String(v||"0").replace(",",".")); return isNaN(n)?0:n; };
const esc = (s) => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

/* Tipi importo dello schema UniEmens, come li riporta il validatore INPS:
   - 'Importo'       → intero puro. "La stringa '1195,58' non è un valore intero valido".
   - 'ImportoConDec' → decimali con la VIRGOLA. '19.25' fa fallire il Pattern, '19,25' passa.
   Un valore non numerico viene lasciato intatto: meglio farlo scartare dal validatore
   che emettere uno 0 inventato al posto di quello che l'utente ha scritto. */
const impInt = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? String(Math.round(n)) : s;
};
const impDec = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.includes(",") ? s : s.replace(".", ",");
};
/* TipoCodiceContratto è a lunghezza fissa 2: "2" viene scartato, "02" no. */
const cod2 = (v) => { const s = String(v ?? "").trim(); return s.length === 1 ? "0" + s : s; };

function giorniMese(annoMese) {
  if (!annoMese) return 30;
  const [y, m] = annoMese.split("-").map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

/* ═══ COSTANTI ═══ */
const TIPO_Q1=[{v:"1",l:"1 – Operaio"},{v:"2",l:"2 – Impiegato"},{v:"5",l:"5 – Apprendista"}];
const TIPO_Q2=[{v:"F",l:"F – Full time"},{v:"P",l:"P – Part-time orizz."},{v:"V",l:"V – Part-time vert."},{v:"M",l:"M – Part-time misto"}];
const TIPO_Q3=[{v:"D",l:"D – Dipendente"},{v:"I",l:"I – Intermittente"}];
const TIPO_CONTRIB=[{v:"00",l:"00 – Standard"},{v:"H0",l:"H0 – Vigilanza"},{v:"J1",l:"J1 – Apprendistato ridotto"},{v:"J2",l:"J2 – Apprendistato"},{v:"55",l:"55 – Ex CFL"},{v:"71",l:"71"}];
const TIPO_LAV=[{v:"00",l:"00 – Standard"},{v:"PB",l:"PB – Borsa lavoro"}];
const TIPO_LAVSTAT=[{v:"",l:"— standard"},{v:"NR00",l:"NR00 – Non retribuito"},{v:"NFOR",l:"NFOR – Non formale"}];
const TIPO_PAGA=[{v:"H",l:"H – Orario"},{v:"M",l:"M – Mensile"}];
const TIPO_MENS=[{v:"12000",l:"12 mensilità"},{v:"13000",l:"13 mensilità"},{v:"14000",l:"14 mensilità"}];
const TIPO_CESS=[{v:"1B",l:"1B – Fine TD"},{v:"1C",l:"1C – Fine TD (cantiere)"},{v:"3",l:"3 – Dimissioni"}];
const TIPO_ASSUN=[{v:"1",l:"1 – Prima assunzione"}];
const TIPO_MITT=[{v:"1",l:"1 – Azienda"},{v:"2",l:"2 – Persona fisica/Consulente"}];
const SI_NO=[{v:"S",l:"S"},{v:"N",l:"N"}];
const SI_NO_EMPTY=[{v:"",l:"—"},{v:"S",l:"S"},{v:"N",l:"N"}];
const TIPO_RETR_MAL=[{v:"1",l:"1"},{v:"2",l:"2"}];
const TIPO_IDENT=[{v:"DATA",l:"DATA"},{v:"PUC",l:"PUC"}];
const CAUSALE_AD=[{v:"M701",l:"M701 – Orario"},{v:"M702",l:"M702 – Giornaliero"}];
const CAUSALE_APD=[{v:"M980",l:"M980 – EBNA/ART1"},{v:"M900",l:"M900 – Fondo solidarietà"}];
const TIPO_RAPPORTO=[{v:"1E",l:"1E – Co.co.co."}];
const TIPO_INFO_EVENTO=[{v:"CM",l:"CM – Certificato"},{v:"DT",l:"DT – Data"}];
/* Etichette settimana indicizzate 0=lun … 6=dom (l'ordine in cui il calendario impagina le colonne). */
const DOW_LABELS=["lun","mar","mer","gio","ven","sab","dom"];
/* TipoCopertura della <Settimana>. "auto" = ricavato dai giorni, gli altri forzano. */
const TIPO_COPERTURA=[
  {v:"",l:"auto (dai giorni)"},
  {v:"X",l:"X – completa"},
  {v:"1",l:"1 – evento tutta la settimana"},
  {v:"2",l:"2 – parziale"},
  {v:"0",l:"0 – non lavorata"},
];

/* ═══ FACTORIES ═══ */
const mkGiorni = (n) => Array.from({length:n}, (_,i) => ({
  gg: i+1, lavorato:"N", tipoCoperturaGiorn:"", evento:null,
}));

const mkLav = (annoMese="") => ({
  id: uid(), CFLavoratore:"", Cognome:"", Nome:"",
  EmailLav:"", CellLav:"",
  TipoRegolarizz:"", IdentInvioAttoINPS:"",
  Qualifica1:"1", Qualifica2:"F", Qualifica3:"D",
  TipoContribuzione:"00", RegimePost95:"N",
  Cittadinanza:"000", UnitaOperativa:"0", UnitaProduttiva:"0",
  CodiceComune:"", CodiceContratto:"", TipoCodiceContratto:"02",
  QualProf:"", TipoPaga:"H",
  DivisoreOrarioContr:"", OrarioContrattuale:"4000",
  OrarioGiornMedioContrattuale:"800",
  TipoApplCongedoParOre:"", TipoRetrMal:"1",
  PercPartTime:"", PercPartTimeMese:"",
  NumMensilita:"14000",
  hasCessazione:false, GiornoCessazione:"", TipoCessazione:"1C",
  hasAssunzione:false, GiornoAssunzione:"", TipoAssunzione:"1",
  ForzImpZero:false,
  TipoLavoratore:"00", TipoLavStat:"",
  Imponibile:"", Contributo:"",
  AltreADebito:[], RetribTeorica:"", OreLavorabili:"",
  giorni: mkGiorni(giorniMese(annoMese)||30),
  EmettiSettimane: true, AdeguaSettimane: true, SettimaneOverride: {},
  GiorniRetribuiti:"", GiorniContribuiti:"", OreContribuite:"",
  RispettoMinimale:"S", SettimaneUtili:"",
  InfoAggCausali:[], DatiParticolari:[],
  DifferenzeAccredito:[],
  hasMaternita:false, IndMat1Fascia:"", IndMat2Fascia:"",
  BaseCalcoloTFR:"", BaseCalcoloPrevCompl:"",
  hasDestinazioneTFR:false,
  DestTFR_TipoScelta:"T2", DestTFR_DataScelta:"",
  DestTFR_IscrizPrevObbl:"", DestTFR_IscrizPrevCompl:"NO",
  DestTFR_FondoTesoreria:"NO",
  MisureCompensative:[],
});

/* AltrePartiteADebito sta dentro DenunciaAziendale → appartiene alla PosContributiva,
   non all'azienda: tenerla sull'azienda la duplicava su ogni matricola. */
const mkPos = () => ({
  id: uid(), Matricola:"", lavoratori: [],
  TrattQuotaLav:"S", ForzaAziendale:"",
  TipoRegolarizz:"", IdentInvioAttoINPS:"",
  AltrePartiteADebito:[],
});
const mkCollab = () => ({
  id: uid(), CFCollaboratore:"", Cognome:"", Nome:"",
  CodiceComune:"", TipoRapporto:"1E",
  Imponibile:"", Aliquota:"", AltraAss:"",
  Dal:"", Al:"",
});
const mkAzienda = () => ({
  id: uid(), AnnoMese:"", CFAzienda:"", RagSocAzienda:"",
  poss: [mkPos()], collaboratori: [], CAP:"", ISTAT:"",
});
const EMPTY_CFG = {
  TipoMittente:"1", CFPersonaMittente:"", RagSocMittente:"",
  CFMittente:"", CFSoftwarehouse:"", SedeINPS:"",
};

/* ═══ STILI (clone da UniEmensBuilder per coerenza) ═══ */
const C = {
  app:   { fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", fontSize:"13px", background:"#F3F7FA", color:"#334155", minHeight:"100vh", display:"flex", flexDirection:"column" },
  hdr:   { background:"#1E2939", borderBottom:"2px solid #00AEEF55", padding:"11px 18px", display:"flex", alignItems:"center", gap:"12px" },
  hdrT:  { fontSize:"15px", fontWeight:"700", color:"#00AEEF", letterSpacing:"-0.01em" },
  hdrS:  { fontSize:"10px", color:"#7AAFC8", marginTop:"3px", letterSpacing:"0.02em" },
  toolbar:{ background:"#FFFFFF", borderBottom:"1px solid #D9E3EC", padding:"8px 18px", display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" },
  body:  { flex:1, display:"flex", overflow:"hidden", background:"#F3F7FA" },
  side:  { width:"300px", background:"#FFFFFF", borderRight:"1px solid #D9E3EC", overflowY:"auto", padding:"10px" },
  main:  { flex:1, overflowY:"auto", padding:"16px 18px" },
  sec:   { background:"#FFFFFF", border:"1px solid #E5E7EB", borderRadius:"8px", padding:"14px 16px", marginBottom:"14px", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" },
  sT:    { fontSize:"10px", fontWeight:"700", color:"#0369A1", textTransform:"uppercase", letterSpacing:"1.2px", marginBottom:"12px", paddingBottom:"7px", borderBottom:"1px solid #D9E3EC" },
  row:   { display:"flex", flexWrap:"wrap", gap:"10px", marginBottom:"9px" },
  lbl:   { fontSize:"10px", color:"#6A7282", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"4px", display:"block", fontWeight:"600" },
  inp:   { background:"#FFFFFF", border:"1px solid #CBD5E1", borderRadius:"4px", color:"#334155", padding:"5px 8px", fontSize:"12px", fontFamily:"'Courier New',monospace", outline:"none", width:"100%", boxSizing:"border-box" },
  sel:   { background:"#FFFFFF", border:"1px solid #CBD5E1", borderRadius:"4px", color:"#334155", padding:"5px 8px", fontSize:"11px", outline:"none", width:"100%", boxSizing:"border-box" },
  btn:   (v="d") => ({
    padding:"5px 12px", borderRadius:"5px", border:"none", cursor:"pointer",
    fontSize:"11px", fontWeight:"600", letterSpacing:"0.02em",
    background: v==="p"?"#0369A1":v==="s"?"#166534":v==="x"?"#991B1B":v==="w"?"#92400E":v==="i"?"#065F46":"#E2E8F0",
    color: v==="p"||v==="s"||v==="x"||v==="w"||v==="i"?"#FFFFFF":"#334155",
  }),
  itemRow:(active) => ({
    padding:"7px 9px", borderRadius:"5px", cursor:"pointer", marginBottom:"3px",
    background: active?"#0369A111":"transparent",
    border: active?"1px solid #0369A155":"1px solid transparent",
    display:"flex", alignItems:"center", justifyContent:"space-between", gap:"6px",
  }),
  bdg:   (c) => ({ background:c+"22", color:c, padding:"2px 7px", borderRadius:"9999px", fontSize:"9px", fontWeight:"700", fontFamily:"monospace", whiteSpace:"nowrap" }),
  tab:   (a) => ({ padding:"7px 16px", cursor:"pointer", fontSize:"12px", fontWeight:"600", border:"none", background:"transparent", color:a?"#0369A1":"#6A7282", borderBottom:a?"2px solid #0369A1":"2px solid transparent" }),
  tabsBar:{ display:"flex", background:"#FFFFFF", border:"1px solid #E5E7EB", borderTopLeftRadius:"8px", borderTopRightRadius:"8px", borderBottom:"none" },
  empty: { textAlign:"center", color:"#94A3B8", padding:"32px", fontSize:"12px", fontStyle:"italic" },
  modal: { position:"fixed", inset:0, background:"rgba(15,23,42,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modalBox:{ background:"#FFFFFF", border:"1px solid #E5E7EB", borderRadius:"10px", padding:"22px 26px", maxWidth:"640px", width:"92%", maxHeight:"82vh", overflowY:"auto", boxShadow:"0 16px 48px rgba(0,0,0,0.2)" },
  giornoCell: (state, { weekend=false, fuori=false } = {}) => {
    const map = {
      N: { bg:"#F1F5F9", fg:"#64748B", bd:"#CBD5E1" },
      S: { bg:"#DCFCE7", fg:"#166534", bd:"#86EFAC" },
      MAL:{ bg:"#FFEDD5", fg:"#9A3412", bd:"#FDBA74" },
      MA1:{ bg:"#DBEAFE", fg:"#1E40AF", bd:"#93C5FD" },
    };
    const s = map[state] || map.N;
    return {
      width:"100%", minHeight:"42px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      // Il sabato/domenica resta cliccabile: il tratteggio segnala il weekend senza vietare il turno festivo.
      border: weekend && state === "N" ? `1px dashed ${s.bd}` : `1px solid ${s.bd}`,
      borderRadius:"5px", background:s.bg, color:s.fg, cursor:"pointer", fontSize:"10px", fontWeight:"700", userSelect:"none",
      // Fuori dal periodo di rapporto i giorni non entrano in calcSettimane: vanno visti come inerti.
      opacity: fuori ? 0.4 : 1,
    };
  },
  dowHead: (weekend) => ({
    textAlign:"center", fontSize:"9px", fontWeight:"700", letterSpacing:"0.06em", textTransform:"uppercase",
    color: weekend ? "#94A3B8" : "#6A7282", paddingBottom:"2px",
  }),
};

/* ═══ FIELD ═══ */
function F({ label, value, onChange, ph="", w="140px", full=false, opts=null, type="text", note="", disabled=false }) {
  /* Lo stato e ciò che il select mostra devono coincidere, sempre.
     1) Valore importato non previsto in lista: veniva mostrata la prima opzione.
     2) Valore VUOTO su una lista senza opzione vuota: il browser ripiega su selectedIndex 0,
        quindi il campo appariva compilato (es. "F – Full time") mentre lo stato era "".
        L'XML usciva senza il tag e cliccare la voce già mostrata non emetteva onChange:
        il campo era di fatto impossibile da correggere. Si aggiunge un segnaposto esplicito. */
  let options = opts;
  let vuotoNonImpostato = false;
  if (opts) {
    if (value && !opts.some(o => o.v === value)) {
      options = [...opts, { v: value, l: `${value} — da file` }];
    } else if (!value && !opts.some(o => o.v === "")) {
      options = [{ v: "", l: "— non impostato —" }, ...opts];
      vuotoNonImpostato = true;
    }
  }
  const selStyle = {
    ...C.sel, opacity: disabled ? 0.5 : 1,
    ...(vuotoNonImpostato ? { borderColor:"#F59E0B", background:"#FFFBEB", color:"#92400E" } : {}),
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", flex: full?"1 1 100%":`1 1 ${w}`, minWidth: full?"180px":w }}>
      <label style={C.lbl}>{label}{note&&<span style={{color:"#059669",marginLeft:"5px",fontWeight:"700",fontSize:"9px"}}>{note}</span>}</label>
      {options
        ? <select style={selStyle} disabled={disabled} value={value||""} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>
        : <input type={type} style={{...C.inp, opacity:disabled?0.5:1}} disabled={disabled} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={ph}/>}
    </div>
  );
}

/* ═══ PANNELLO VALIDAZIONE ═══ */
function PannelloValidazione({ voci, titolo = "Quadri obbligatori" }) {
  if (!voci || voci.length === 0) return null;
  const err = voci.filter(v => v.liv === "E");
  const warn = voci.filter(v => v.liv !== "E");
  const grave = err.length > 0;
  return (
    <div style={{
      padding:"9px 12px", marginBottom:"10px", borderRadius:"6px", fontSize:"11px", lineHeight:"1.6",
      background: grave ? "#FEF2F2" : "#FFFBEB",
      border: `1px solid ${grave ? "#FCA5A5" : "#FDE68A"}`,
      color: grave ? "#991B1B" : "#92400E",
    }}>
      <b>{titolo}{grave ? ` — ${err.length} da correggere` : ""}</b>
      {err.map((v,i) => <div key={`e${i}`}>✖ {v.msg}</div>)}
      {warn.map((v,i) => <div key={`w${i}`} style={{color:"#92400E"}}>⚠ {v.msg}</div>)}
    </div>
  );
}

/* Pallino rosso/giallo in sidebar: dice dove guardare senza aprire ogni scheda. */
function Pallino({ voci }) {
  if (!voci || voci.length === 0) return null;
  const grave = voci.some(v => v.liv === "E");
  return (
    <span title={voci.map(v => (v.liv === "E" ? "✖ " : "⚠ ") + v.msg).join("\n")}
          style={{...C.bdg(grave ? "#991B1B" : "#92400E"), marginLeft:"5px"}}>
      {grave ? "✖" : "⚠"}{voci.length}
    </span>
  );
}

/* ═══ CALCOLI ═══ */
function isoWeek(d) {
  const tmp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  tmp.setHours(0,0,0,0);
  tmp.setDate(tmp.getDate() + 3 - (tmp.getDay() + 6) % 7);
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  return 1 + Math.round(((tmp - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function weekEffectiveMonday(d) {
  // In UniEmens Sunday belongs to the FOLLOWING week: use next Monday for attribution
  if (d.getDay() === 0) {
    const next = new Date(d); next.setDate(d.getDate() + 1);
    return next; // next day is already Monday
  }
  const dow = (d.getDay() + 6) % 7; // 0=Mon
  const mon = new Date(d); mon.setDate(d.getDate() - dow);
  return mon;
}

function isoWeekForDay(d) {
  // In UniEmens Sunday belongs to the following week (isoWeek of next Monday)
  if (d.getDay() === 0) {
    const next = new Date(d); next.setDate(d.getDate() + 1);
    return isoWeek(next);
  }
  return isoWeek(d);
}

/* Numero di settimane ISO dell'anno: la settimana del 28 dicembre è sempre l'ultima. */
function settimaneNellAnno(y) {
  return isoWeek(new Date(y, 11, 28));
}

/* IdSettimana progressivo NELL'ANNO DELLA DENUNCIA.
   A cavallo d'anno la numerazione ISO riparte da 1: i giorni 29-31 dicembre 2025 cadono
   nella settimana ISO 1 del 2026, ma nella denuncia di dicembre INPS pretende la 53
   (02990E — "settimana non congrua con il periodo della denuncia").
   La stessa settimana fisica prende quindi numeri diversi nelle due denunce: 53 a
   dicembre, 1 a gennaio. */
function idSettimana(d, meseDenuncia, annoDenuncia) {
  const w = isoWeekForDay(d);
  if (meseDenuncia === 12 && w === 1) return settimaneNellAnno(annoDenuncia) + 1;
  return w;
}

function calcSettimane(annoMese, giorni, lav = {}) {
  if (!annoMese) return [];
  const [y, m] = annoMese.split("-").map(Number);
  if (!y || !m) return [];

  // Periodo di rapporto nel mese (assunzione/cessazione)
  const nDays = giorniMese(annoMese);
  const firstDay = lav.hasAssunzione ? Math.max(1, parseInt(lav.GiornoAssunzione) || 1) : 1;
  const lastDay  = lav.hasCessazione ? Math.min(nDays, parseInt(lav.GiornoCessazione) || nDays) : nDays;

  const settMap = new Map();
  giorni.forEach(({gg, lavorato, evento}) => {
    // Il periodo di rapporto si filtra sui giorni: il vecchio confronto fra numeri di
    // settimana ISO svuotava l'intero elenco quando il mese scavalca l'anno.
    if (gg < firstDay || gg > lastDay) return;
    const d = new Date(y, m-1, gg);
    /* Regola UNIEMENS: la settimana va da domenica a sabato e, quando è a cavallo di due
       mesi, si dichiara COME FRAZIONE IN ENTRAMBI i mesi mantenendo lo stesso IdSettimana.
       Il vecchio filtro "la settimana appartiene al mese in cui cade il suo lunedì effettivo"
       era una regola del gestionale, non di INPS: scartava la frazione iniziale del mese e
       faceva scattare 07780E (giorno lavorato senza <Settimana> corrispondente).
       Es. settimana 18/2025 = dom 27 apr → sab 3 mag: va sia in aprile sia in maggio.
       Il TipoCopertura si calcola sulla sola frazione del mese, ed è già così perché
       settMap aggrega unicamente i giorni di questo mese dentro il periodo di rapporto. */
    const mon = weekEffectiveMonday(d);
    const w = idSettimana(d, m, y);
    if (!settMap.has(w)) settMap.set(w, {ord: mon.getTime(), tot:0, X:0, MAT:0, MAL:0});
    const s = settMap.get(w);
    s.tot++;
    if (lavorato === "S") s.X++;
    else if (evento?.codice === "MA1") s.MAT++;
    else if (evento?.codice === "MAL") s.MAL++;
  });

  const result = [...settMap.entries()]
    // Ordine cronologico via lunedì della settimana: i numeri ISO si azzerano a fine anno
    // e ordinarli/filtrarli come interi svuotava dicembre e gennaio.
    .sort((a,b) => a[1].ord - b[1].ord)
    .map(([id, c]) => {
      const ev = c.MAT + c.MAL;
      const codEv = ev === 0 ? null : (c.MAT >= c.MAL ? "MA1" : "MAL");
      let tc = "0";
      if (ev > 0 && ev === c.tot) tc = "1";   // tutti i giorni della settimana coperti da evento
      else if (ev > 0) tc = "2";              // evento su parte della settimana
      else if (c.X > 0) tc = "X";             // lavorata, nessun evento
      return { IdSettimana: id, TipoCopertura: tc, CodiceEvento: (tc === "1" || tc === "2") ? codEv : null };
    });

  // Adeguamento opzionale a GiorniRetribuiti (vincolo 02570E). Promuove settimane scoperte:
  // è una forzatura, quindi disattivabile per lavoratore.
  const giorniRet = parseIt(lav.GiorniRetribuiti);
  if (giorniRet > 0 && lav.AdeguaSettimane !== false) {
    const nCop = result.filter(s => s.TipoCopertura !== "0").length;
    if (nCop * 6 < giorniRet) {
      const daEventi = (lav.DifferenzeAccredito || []).map(d => d.CodiceEvento).filter(Boolean);
      const upgradeTc = daEventi.includes("MAL") ? "2" : "X";
      const upgradeCe = upgradeTc === "2" ? "MAL" : null;
      let count = nCop;
      for (let i = 0; i < result.length && count * 6 < giorniRet; i++) {
        if (result[i].TipoCopertura === "0") {
          result[i] = { ...result[i], TipoCopertura: upgradeTc, CodiceEvento: upgradeCe };
          count++;
        }
      }
    }
  }

  /* Forzatura manuale del TipoCopertura, per settimana. Va applicata per ultima: deve
     vincere sia sul calcolo dai giorni sia sull'adeguamento a GiorniRetribuiti.
     Serve perché la copertura di una settimana non è sempre deducibile dalla griglia
     S/N: una settimana può essere retribuita senza giorni lavorati (ferie, festività). */
  const ov = lav.SettimaneOverride || {};
  return result.map(s => {
    const forz = ov[s.IdSettimana];
    if (!forz) return s;
    return { ...s, TipoCopertura: forz, CodiceEvento: (forz === "1" || forz === "2") ? (s.CodiceEvento || "MAL") : null };
  });
}

/* Vincoli INPS su settimane / giorni retribuiti: segnalati, non nascosti. */
function checkSettimane(setts, lav) {
  const gr = parseIt(lav.GiorniRetribuiti);
  const n = setts.filter(s => s.TipoCopertura !== "0").length;
  const w = [];
  if (gr > 0 && n === 0) w.push("02580E — GiorniRetribuiti > 0 ma nessuna settimana coperta");
  if (gr > 0 && n > gr)  w.push(`02560E — settimane coperte (${n}) maggiori dei GiorniRetribuiti (${gr})`);
  if (gr > 0 && n > 0 && n * 6 < gr) w.push(`02570E — settimane coperte (${n}) × 6 minori dei GiorniRetribuiti (${gr})`);
  return w;
}

/* ═══ SCELTA GiorniContribuiti / OreContribuite ═══ */
/* Sono alternativi nello schema. Il part-time va dichiarato a ore; per gli altri si usano
   i giorni, ma se il lavoratore ha solo le ore valorizzate si emettono quelle. */
const isPartTime = (lav) => ["P","V","M"].includes(lav.Qualifica2);
const usaOreContribuite = (lav) =>
  !!lav.OreContribuite && (isPartTime(lav) || !lav.GiorniContribuiti);

/* OreContribuite è in centesimi come OrarioContrattuale e PercPartTime: 78 ore = 7800. */
const oreDaCentesimi = (v) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return (n / 100).toFixed(2).replace(".", ",");
};

/* ═══ VALIDAZIONE — quadri obbligatori ═══ */
/* I codici e i testi ricalcano i messaggi del validatore INPS, così l'avviso che vedi
   qui e la riga del file di verifica si leggono allo stesso modo.
   Livelli: "E" = il flusso viene scartato, "W" = da controllare. */

/* 07780E — ogni giorno lavorato deve avere la sua <Settimana>. Confronta le settimane
   effettivamente emesse con quelle dei giorni a S: se una manca, INPS scarta. */
function settimaneMancanti(annoMese, lav) {
  if (!annoMese || lav.EmettiSettimane === false) return [];
  const [y, m] = String(annoMese).split("-").map(Number);
  if (!y || !m) return [];
  const nDays = lav.giorni.length;
  const firstDay = lav.hasAssunzione ? Math.max(1, parseInt(lav.GiornoAssunzione) || 1) : 1;
  const lastDay  = lav.hasCessazione ? Math.min(nDays, parseInt(lav.GiornoCessazione) || nDays) : nDays;
  const emesse = new Set(calcSettimane(annoMese, lav.giorni, lav).map(s => s.IdSettimana));
  const mancanti = new Set();
  for (const g of lav.giorni) {
    if (g.lavorato !== "S" && !g.evento) continue;
    if (g.gg < firstDay || g.gg > lastDay) continue;
    // Stessa numerazione di calcSettimane (a dicembre la 53, non la 1), altrimenti
    // il controllo segnala come mancante una settimana che in realtà c'è.
    const w = idSettimana(new Date(y, m - 1, g.gg), m, y);
    if (!emesse.has(w)) mancanti.add(w);
  }
  return [...mancanti].sort((a, b) => a - b);
}

function validaLav(lav, annoMese) {
  const v = [];
  if (!lav.CFLavoratore) v.push({liv:"E", msg:"CFLavoratore mancante"});
  if (!lav.Cognome) v.push({liv:"E", msg:"Cognome mancante"});
  if (!lav.Nome) v.push({liv:"E", msg:"Nome mancante"});
  if (lav.TipoRegolarizz && !String(lav.IdentInvioAttoINPS||"").trim())
    v.push({liv:"E", msg:"31 — con TipoRegolarizz valorizzato, IdentInvioAttoINPS è obbligatorio"});
  /* Dire QUALE qualifica manca, non "una delle tre": la select mostrava un valore
     plausibile anche quando lo stato era vuoto, e l'avviso generico non aiutava a trovarla. */
  const qMancanti = [
    !lav.Qualifica1 && "Qualifica1", !lav.Qualifica2 && "Qualifica2", !lav.Qualifica3 && "Qualifica3",
  ].filter(Boolean);
  if (qMancanti.length)
    v.push({liv:"E", msg:`00090E — ${qMancanti.join(" e ")} non impostat${qMancanti.length>1?"e":"a"}: seleziona un valore nel tab Anagrafica`});
  if (lav.Qualifica2 === "F" && lav.PercPartTime)
    v.push({liv:"E", msg:"00820E — Qualifica2 'F' (full time) non prevede PercPartTime"});
  if (["P","V","M"].includes(lav.Qualifica2) && !lav.PercPartTime)
    v.push({liv:"W", msg:"Qualifica2 part-time senza PercPartTime"});
  /* 1527 — sul part-time la contribuzione si dichiara a ore, non a giorni. */
  if (isPartTime(lav) && lav.Contributo && !lav.OreContribuite)
    v.push({liv:"E", msg:"1527 — assenza di OreContribuite in presenza di Contributo (sul part-time è obbligatoria): compilala nel tab Retributivi"});
  /* Alternativa esclusiva: emetterli entrambi fa scartare il flusso. Meglio dirlo qui
     che lasciare all'utente il dubbio su quale dei due sia finito nell'XML. */
  if (lav.OreContribuite && lav.GiorniContribuiti)
    v.push({liv:"W", msg:`GiorniContribuiti e OreContribuite sono alternativi: nell'XML uscirà solo ${usaOreContribuite(lav) ? "OreContribuite" : "GiorniContribuiti"}`});
  if (isPartTime(lav) && lav.GiorniContribuiti && !lav.OreContribuite)
    v.push({liv:"W", msg:"Su un part-time la contribuzione va espressa in OreContribuite, non in GiorniContribuiti"});
  /* Centesimi: 78 ore si scrivono 7800. Sotto 100 sarebbe meno di un'ora, quasi
     certamente ore scritte per intero e non convertite. */
  if (lav.OreContribuite && parseIt(lav.OreContribuite) > 0 && parseIt(lav.OreContribuite) < 100)
    v.push({liv:"W", msg:`OreContribuite = ${lav.OreContribuite} vale ${oreDaCentesimi(lav.OreContribuite)} ore: il campo è in centesimi, 78 ore si scrivono 7800`});
  if (lav.TipoLavStat !== "NR00" && !lav.Imponibile)
    v.push({liv:"W", msg:"Imponibile non valorizzato"});
  const mancanti = settimaneMancanti(annoMese, lav);
  if (mancanti.length)
    v.push({liv:"E", msg:`07780E — giorni lavorati senza <Settimana> corrispondente: settimana ${mancanti.join(", ")} assente`});
  return v;
}

function validaPos(pos) {
  const v = [];
  if (!pos.Matricola) v.push({liv:"E", msg:"Matricola mancante"});
  if (pos.TipoRegolarizz && !String(pos.IdentInvioAttoINPS||"").trim())
    v.push({liv:"E", msg:"31 — con TipoRegolarizz valorizzato, IdentInvioAttoINPS è obbligatorio su DenunciaAziendale"});
  return v;
}

function validaAz(az) {
  const v = [];
  if (!az.AnnoMese) v.push({liv:"E", msg:"AnnoMeseDenuncia mancante"});
  if (!az.CFAzienda) v.push({liv:"E", msg:"CFAzienda mancante"});
  if (!az.RagSocAzienda) v.push({liv:"E", msg:"RagSocAzienda mancante"});
  return v;
}

function validaCfg(cfg) {
  const v = [];
  if (!cfg.CFMittente) v.push({liv:"E", msg:"DatiMittente: CFMittente mancante"});
  if (!cfg.RagSocMittente) v.push({liv:"W", msg:"DatiMittente: RagSocMittente mancante"});
  return v;
}

/* Raccolta piatta per il controllo pre-export: ogni voce porta con sé dove sta. */
function validaTutto(cfg, aziende) {
  const out = validaCfg(cfg).map(x => ({...x, dove:"Dati Mittente"}));
  for (const az of aziende) {
    const et = az.RagSocAzienda || az.CFAzienda || "(azienda)";
    validaAz(az).forEach(x => out.push({...x, dove: et}));
    for (const pos of az.poss) {
      const ep = `${et} · ${pos.Matricola || "(matricola)"}`;
      validaPos(pos).forEach(x => out.push({...x, dove: ep}));
      for (const lav of pos.lavoratori) {
        const el = `${ep} · ${`${lav.Cognome||""} ${lav.Nome||""}`.trim() || lav.CFLavoratore || "(lavoratore)"}`;
        validaLav(lav, az.AnnoMese).forEach(x => out.push({...x, dove: el}));
      }
    }
  }
  return out;
}

function calcTotDebito(lavs, altrePartite = []) {
  const fromLav = lavs.reduce((s, l) =>
    s + (parseIt(l.Contributo) || 0) +
    (l.AltreADebito || []).reduce((ss, ad) => ss + (parseIt(ad.ImportoADebito) || 0), 0), 0);
  const fromAltrePartite = (altrePartite || []).reduce((s, apd) => s + (parseIt(apd.SommaADebito) || 0), 0);
  return Math.round(fromLav + fromAltrePartite);
}
function calcTotCredito(lavs) {
  return Math.round(lavs.reduce((s, l) =>
    s + l.InfoAggCausali.reduce((ss, c) => ss + (parseIt(c.ImportoRif) || 0), 0) +
    (l.MisureCompensative || []).reduce((ss, mc) => ss + (parseIt(mc.ImportoMCACred) || 0), 0) +
    (parseIt(l.IndMat1Fascia) || 0) + (parseIt(l.IndMat2Fascia) || 0), 0));
}
function countGiorniLav(giorni) {
  return giorni.filter(g => g.lavorato === "S").length;
}

/* ═══ PARSER XML ═══ */
const txt = (el, sel) => el?.querySelector(sel)?.textContent?.trim() || "";
const childTxt = (parent, tag) => {
  if (!parent) return "";
  for (const ch of parent.children) if (ch.tagName === tag) return ch.textContent.trim();
  return "";
};
const directChildren = (parent, tag) => {
  if (!parent) return [];
  return Array.from(parent.children).filter(c => c.tagName === tag);
};

function parsePrivXML(xmlStr) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, "application/xml");
  const errNode = doc.querySelector("parsererror");
  if (errNode) throw new Error("XML non valido: " + errNode.textContent.slice(0,200));
  const root = doc.documentElement;
  if (!root || (root.tagName !== "DenunceMensili" && root.tagName !== "UniEmens")) {
    throw new Error("Root XML inatteso: " + (root?.tagName || "(nessuno)"));
  }
  const denunce = root.tagName === "DenunceMensili" ? root : root.querySelector("DenunceMensili");
  if (!denunce) throw new Error("Sezione DenunceMensili non trovata");

  const report = { aziende:0, posizioni:0, lavoratori:0, collaboratori:0, eventi:0, regolarizz:0, warnings:[], ignored:[] };

  /* ── DatiMittente ── */
  const dmEl = denunce.querySelector("DatiMittente");
  const cfg = { ...EMPTY_CFG };
  if (dmEl) {
    cfg.TipoMittente = dmEl.getAttribute("Tipo") || "1";
    cfg.CFPersonaMittente = childTxt(dmEl, "CFPersonaMittente");
    cfg.RagSocMittente = childTxt(dmEl, "RagSocMittente");
    cfg.CFMittente = childTxt(dmEl, "CFMittente");
    cfg.CFSoftwarehouse = childTxt(dmEl, "CFSoftwarehouse");
    cfg.SedeINPS = childTxt(dmEl, "SedeINPS");
  } else {
    report.warnings.push("DatiMittente assente");
  }

  /* ── Aziende ── */
  const aziende = [];
  const azEls = directChildren(denunce, "Azienda");
  for (const azEl of azEls) {
    const az = mkAzienda();
    az.id = uid();
    az.AnnoMese = childTxt(azEl, "AnnoMeseDenuncia");
    az.CFAzienda = childTxt(azEl, "CFAzienda");
    az.RagSocAzienda = childTxt(azEl, "RagSocAzienda");
    az.poss = [];

    const posEls = directChildren(azEl, "PosContributiva");
    for (const posEl of posEls) {
      const pos = mkPos();
      pos.Matricola = childTxt(posEl, "Matricola");
      const denAzEl = posEl.querySelector(":scope > DenunciaAziendale");
      if (denAzEl) {
        pos.TrattQuotaLav = childTxt(denAzEl, "TrattQuotaLav") || "S";
        pos.ForzaAziendale = childTxt(denAzEl, "ForzaAziendale") || "";
        pos.TipoRegolarizz = denAzEl.getAttribute("TipoRegolarizz") || "";
        pos.IdentInvioAttoINPS = denAzEl.getAttribute("IdentInvioAttoINPS") || "";
        const apdEls = directChildren(denAzEl, "AltrePartiteADebito");
        for (const apd of apdEls) {
          pos.AltrePartiteADebito.push({
            id: uid(),
            CausaleADebito: childTxt(apd, "CausaleADebito"),
            NumDip: childTxt(apd, "NumDip"),
            Retribuzione: childTxt(apd, "Retribuzione"),
            SommaADebito: childTxt(apd, "SommaADebito"),
          });
        }
      }
      pos.lavoratori = [];

      const diEls = directChildren(posEl, "DenunciaIndividuale");
      for (const diEl of diEls) {
        const lav = mkLav(az.AnnoMese);
        lav.id = uid();
        /* Import fedele: un campo assente nel file resta vuoto. Applicare i default
           (|| "1", || "02"…) riscriveva dati che nell'originale non c'erano. */
        lav.TipoRegolarizz = diEl.getAttribute("TipoRegolarizz") || "";
        lav.IdentInvioAttoINPS = diEl.getAttribute("IdentInvioAttoINPS") || "";
        lav.CFLavoratore = childTxt(diEl, "CFLavoratore");
        lav.Cognome = childTxt(diEl, "Cognome");
        lav.Nome = childTxt(diEl, "Nome");
        const recEl = diEl.querySelector(":scope > RecapitiLav");
        lav.EmailLav = childTxt(recEl, "EmailLav");
        lav.CellLav = childTxt(recEl, "CellLav");
        lav.Qualifica1 = childTxt(diEl, "Qualifica1");
        lav.Qualifica2 = childTxt(diEl, "Qualifica2");
        lav.Qualifica3 = childTxt(diEl, "Qualifica3");
        lav.TipoContribuzione = childTxt(diEl, "TipoContribuzione");
        lav.RegimePost95 = childTxt(diEl, "RegimePost95");
        lav.Cittadinanza = childTxt(diEl, "Cittadinanza");
        lav.UnitaOperativa = childTxt(diEl, "UnitaOperativa");
        lav.UnitaProduttiva = childTxt(diEl, "UnitaProduttiva");
        lav.CodiceComune = childTxt(diEl, "CodiceComune");
        lav.CodiceContratto = childTxt(diEl, "CodiceContratto");
        lav.TipoCodiceContratto = childTxt(diEl, "TipoCodiceContratto");
        lav.QualProf = childTxt(diEl, "QualProf");
        lav.TipoPaga = childTxt(diEl, "TipoPaga");
        lav.DivisoreOrarioContr = childTxt(diEl, "DivisoreOrarioContr");
        lav.OrarioContrattuale = childTxt(diEl, "OrarioContrattuale");
        lav.OrarioGiornMedioContrattuale = childTxt(diEl, "OrarioGiornMedioContrattuale");
        lav.TipoApplCongedoParOre = childTxt(diEl, "TipoApplCongedoParOre");
        lav.TipoRetrMal = childTxt(diEl, "TipoRetrMal");
        lav.PercPartTime = childTxt(diEl, "PercPartTime");
        lav.PercPartTimeMese = childTxt(diEl, "PercPartTimeMese");
        lav.NumMensilita = childTxt(diEl, "NumMensilita");

        const cessEl = diEl.querySelector(":scope > Cessazione");
        if (cessEl) {
          lav.hasCessazione = true;
          lav.GiornoCessazione = childTxt(cessEl, "GiornoCessazione");
          lav.TipoCessazione = childTxt(cessEl, "TipoCessazione");
        }
        const assEl = diEl.querySelector(":scope > Assunzione");
        if (assEl) {
          lav.hasAssunzione = true;
          lav.GiornoAssunzione = childTxt(assEl, "GiornoAssunzione");
          lav.TipoAssunzione = childTxt(assEl, "TipoAssunzione");
        }

        const drEl = diEl.querySelector(":scope > DatiRetributivi");
        if (drEl) {
          lav.ForzImpZero = drEl.getAttribute("ForzImpZero") === "S";
          lav.TipoLavoratore = childTxt(drEl, "TipoLavoratore");
          lav.TipoLavStat = childTxt(drEl, "TipoLavStat");
          lav.Imponibile = childTxt(drEl, "Imponibile");
          lav.Contributo = childTxt(drEl, "Contributo");
          lav.RetribTeorica = childTxt(drEl, "RetribTeorica");
          lav.OreLavorabili = childTxt(drEl, "OreLavorabili");
          lav.GiorniRetribuiti = childTxt(drEl, "GiorniRetribuiti");
          lav.GiorniContribuiti = childTxt(drEl, "GiorniContribuiti");
          lav.OreContribuite = childTxt(drEl, "OreContribuite");
          lav.RispettoMinimale = childTxt(drEl, "RispettoMinimale");
          lav.SettimaneUtili = childTxt(drEl, "SettimaneUtili");
          // Se il file non dichiara settimane non gliene inventiamo in riesportazione
          lav.EmettiSettimane = directChildren(drEl, "Settimana").length > 0;

          const matEl = drEl.querySelector(":scope > Maternita > MatACredito");
          if (matEl) {
            lav.hasMaternita = true;
            lav.IndMat1Fascia = childTxt(matEl, "IndMat1Fascia");
            lav.IndMat2Fascia = childTxt(matEl, "IndMat2Fascia");
          }

          const adEls = directChildren(drEl, "AltreADebito");
          for (const ad of adEls) {
            lav.AltreADebito.push({
              id: uid(),
              CausaleADebito: childTxt(ad, "CausaleADebito"),
              NumOre: childTxt(ad, "NumOre"),
              NumGG: childTxt(ad, "NumGG"),
              AltroImponibile: childTxt(ad, "AltroImponibile"),
              ImportoADebito: childTxt(ad, "ImportoADebito"),
            });
          }

          /* Giorni — sovrascrive default */
          const ggMax = giorniMese(az.AnnoMese);
          lav.giorni = mkGiorni(ggMax);
          const ggEls = directChildren(drEl, "Giorno");
          for (const ggEl of ggEls) {
            const ggNum = parseInt(ggEl.getAttribute("GG"), 10);
            if (!ggNum || ggNum < 1 || ggNum > ggMax) continue;
            const g = lav.giorni[ggNum-1];
            g.lavorato = childTxt(ggEl, "Lavorato") || "N";
            g.tipoCoperturaGiorn = childTxt(ggEl, "TipoCoperturaGiorn");
            const evEl = ggEl.querySelector(":scope > EventoGiorn");
            if (evEl) {
              const iaEl = evEl.querySelector("InfoAggEvento");
              g.evento = {
                codice: childTxt(evEl, "CodiceEventoGiorn") || "MAL",
                infoTipo: iaEl?.getAttribute("TipoInfoAggEvento") || "CM",
                infoVal: iaEl?.textContent?.trim() || "",
              };
              report.eventi++;
            }
          }

          const daEls = directChildren(drEl, "DifferenzeAccredito");
          for (const da of daEls) {
            const infoEl = da.querySelector(":scope > InfoEvento");
            const motEl = infoEl?.querySelector("MotivoEvento");
            lav.DifferenzeAccredito.push({
              id: uid(),
              CodiceEvento: childTxt(da, "CodiceEvento"),
              DiffAccredito: childTxt(da, "DiffAccredito"),
              TipoMotivoEvento: motEl?.getAttribute("TipoMotivoEvento") || "",
              MotivoEvento: motEl?.textContent?.trim() || "",
              DiffAccreditoEvento: infoEl ? childTxt(infoEl, "DiffAccreditoEvento") : "",
            });
          }

          const iacEls = directChildren(drEl, "InfoAggCausaliContrib");
          for (const iac of iacEls) {
            const idEl = iac.querySelector("IdentMotivoUtilizzoCausale");
            lav.InfoAggCausali.push({
              id: uid(),
              CodiceCausale: childTxt(iac, "CodiceCausale"),
              TipoIdent: idEl?.getAttribute("TipoIdentMotivoUtilizzo") || "DATA",
              ValoreIdent: idEl?.textContent?.trim() || "",
              AnnoMeseRif: childTxt(iac, "AnnoMeseRif"),
              ImportoRif: childTxt(iac, "ImportoAnnoMeseRif"),
            });
          }

          const dpEl = drEl.querySelector(":scope > DatiParticolari > ConvBilat");
          if (dpEl) {
            const convs = directChildren(dpEl, "Conv");
            for (const c of convs) {
              const impEl = c.querySelector("Importo");
              lav.DatiParticolari.push({
                id: uid(),
                CodConv: childTxt(c, "CodConv"),
                Importo: impEl?.textContent?.trim() || "",
                Periodo: impEl?.getAttribute("Periodo") || "",
              });
            }
          }

          /* Le <Settimana> del file vanno conservate quando divergono dal calcolo automatico:
             la copertura non è sempre deducibile dai giorni (una settimana può essere
             retribuita senza giorni lavorati) e prima della forzatura manuale la
             riesportazione le riscriveva silenziosamente. Solo le divergenze diventano
             override, così l'automatismo resta attivo dove già concorda. */
          const settFile = directChildren(drEl, "Settimana");
          if (settFile.length) {
            const calcolate = new Map(
              calcSettimane(az.AnnoMese, lav.giorni, {...lav, SettimaneOverride: {}})
                .map(s => [String(s.IdSettimana), s.TipoCopertura])
            );
            for (const sEl of settFile) {
              const id = childTxt(sEl, "IdSettimana");
              const tc = childTxt(sEl, "TipoCopertura");
              // Un IdSettimana che il calcolo non produce è un numero errato nel file
              // (es. la 1 al posto della 53 a dicembre): forzarlo non avrebbe effetto.
              if (id && tc && calcolate.has(id) && calcolate.get(id) !== tc) lav.SettimaneOverride[id] = tc;
            }
          }
        }

        const tfrEl = diEl.querySelector(":scope > GestioneTFR");
        if (tfrEl) {
          const meseEl = tfrEl.querySelector(":scope > MeseTFR");
          if (meseEl) {
            lav.BaseCalcoloTFR = childTxt(meseEl, "BaseCalcoloTFR");
            lav.BaseCalcoloPrevCompl = childTxt(meseEl, "BaseCalcoloPrevCompl");
            const mcEls = directChildren(meseEl.querySelector("MisureCompensative"), "MisCompACredito");
            for (const mc of mcEls) {
              lav.MisureCompensative.push({
                id: uid(),
                CausaleMCACred: childTxt(mc, "CausaleMCACred"),
                ImportoMCACred: childTxt(mc, "ImportoMCACred"),
              });
            }
          }
          const dtfrEl = tfrEl.querySelector(":scope > DestinazioneTFR");
          if (dtfrEl) {
            lav.hasDestinazioneTFR = true;
            lav.DestTFR_TipoScelta = childTxt(dtfrEl, "TipoScelta");
            lav.DestTFR_DataScelta = childTxt(dtfrEl, "DataScelta");
            const profEl = dtfrEl.querySelector("ProfiloLav");
            if (profEl) {
              lav.DestTFR_IscrizPrevObbl = childTxt(profEl, "IscrizPrevObbl");
              lav.DestTFR_IscrizPrevCompl = childTxt(profEl, "IscrizPrevCompl") || "NO";
            }
            const ftEl = dtfrEl.querySelector("FondoTesoreria");
            if (ftEl) lav.DestTFR_FondoTesoreria = ftEl.textContent.trim() || "NO";
          }
        }

        pos.lavoratori.push(lav);
        report.lavoratori++;
        if (lav.TipoRegolarizz) report.regolarizz++;
      }

      az.poss.push(pos);
      report.posizioni++;
      if (pos.TipoRegolarizz) report.regolarizz++;
    }

    const lcEl = azEl.querySelector(":scope > ListaCollaboratori");
    if (lcEl) {
      az.CAP = childTxt(lcEl, "CAP");
      az.ISTAT = childTxt(lcEl, "ISTAT");
      const collEls = directChildren(lcEl, "Collaboratore");
      for (const cEl of collEls) {
        az.collaboratori.push({
          id: uid(),
          CFCollaboratore: childTxt(cEl, "CFCollaboratore"),
          Cognome: childTxt(cEl, "Cognome"),
          Nome: childTxt(cEl, "Nome"),
          CodiceComune: childTxt(cEl, "CodiceComune"),
          TipoRapporto: childTxt(cEl, "TipoRapporto") || "1E",
          Imponibile: childTxt(cEl, "Imponibile"),
          Aliquota: childTxt(cEl, "Aliquota"),
          AltraAss: childTxt(cEl, "AltraAss"),
          Dal: childTxt(cEl, "Dal"),
          Al: childTxt(cEl, "Al"),
        });
        report.collaboratori++;
      }
    }

    if (azEl.querySelector("ListaPosPA")) report.ignored.push("ListaPosPA in " + (az.RagSocAzienda || az.CFAzienda));

    aziende.push(az);
    report.aziende++;
  }

  return { cfg, aziende, report };
}

/* ═══ BUILDER XML ═══ */
/* TipoRegolarizz valorizzato → si emette l'attributo. IdentInvioAttoINPS si emette solo
   se ha un valore: sullo schema INPS è di tipo 'String' con un Pattern che la stringa
   vuota non soddisfa, e IdentInvioAttoINPS="" faceva scartare l'intero flusso. */
const regolarizzAttr = (o) => {
  if (!o.TipoRegolarizz) return "";
  let a = ` TipoRegolarizz="${esc(o.TipoRegolarizz)}"`;
  if (o.IdentInvioAttoINPS) a += ` IdentInvioAttoINPS="${esc(o.IdentInvioAttoINPS)}"`;
  return a;
};

function buildPrivXML(cfg, aziende) {
  let x = `<?xml version="1.0" encoding="UTF-8"?>\n<DenunceMensili>\n`;

  /* DatiMittente */
  x += `  <DatiMittente Tipo="${esc(cfg.TipoMittente)}">\n`;
  x += `    <CFPersonaMittente>${esc(cfg.CFPersonaMittente)}</CFPersonaMittente>\n`;
  x += `    <RagSocMittente>${esc(cfg.RagSocMittente)}</RagSocMittente>\n`;
  x += `    <CFMittente>${esc(cfg.CFMittente)}</CFMittente>\n`;
  if (cfg.CFSoftwarehouse) x += `    <CFSoftwarehouse>${esc(cfg.CFSoftwarehouse)}</CFSoftwarehouse>\n`;
  if (cfg.SedeINPS) x += `    <SedeINPS>${esc(cfg.SedeINPS)}</SedeINPS>\n`;
  x += `  </DatiMittente>\n`;

  for (const az of aziende) {
    x += `  <Azienda>\n`;
    x += `    <AnnoMeseDenuncia>${esc(az.AnnoMese)}</AnnoMeseDenuncia>\n`;
    x += `    <CFAzienda>${esc(az.CFAzienda)}</CFAzienda>\n`;
    x += `    <RagSocAzienda>${esc(az.RagSocAzienda)}</RagSocAzienda>\n`;

    for (const pos of az.poss) {
      x += `    <PosContributiva Composizione="CP">\n`;
      x += `      <Matricola>${esc(pos.Matricola)}</Matricola>\n`;

      for (const lav of pos.lavoratori) {
        x += `      <DenunciaIndividuale${regolarizzAttr(lav)}>\n`;
        x += `        <CFLavoratore>${esc(lav.CFLavoratore)}</CFLavoratore>\n`;
        x += `        <Cognome>${esc(lav.Cognome)}</Cognome>\n`;
        x += `        <Nome>${esc(lav.Nome)}</Nome>\n`;
        if (lav.EmailLav || lav.CellLav) {
          x += `        <RecapitiLav>\n`;
          if (lav.EmailLav) x += `          <EmailLav>${esc(lav.EmailLav)}</EmailLav>\n`;
          if (lav.CellLav)  x += `          <CellLav>${esc(lav.CellLav)}</CellLav>\n`;
          x += `        </RecapitiLav>\n`;
        }
        if (lav.Qualifica1) x += `        <Qualifica1>${esc(lav.Qualifica1)}</Qualifica1>\n`;
        if (lav.Qualifica2) x += `        <Qualifica2>${esc(lav.Qualifica2)}</Qualifica2>\n`;
        if (lav.Qualifica3) x += `        <Qualifica3>${esc(lav.Qualifica3)}</Qualifica3>\n`;
        if (lav.TipoContribuzione) x += `        <TipoContribuzione>${esc(lav.TipoContribuzione)}</TipoContribuzione>\n`;
        if (lav.RegimePost95) x += `        <RegimePost95>${esc(lav.RegimePost95)}</RegimePost95>\n`;
        if (lav.Cittadinanza) x += `        <Cittadinanza>${esc(lav.Cittadinanza)}</Cittadinanza>\n`;
        if (lav.UnitaOperativa) x += `        <UnitaOperativa>${esc(lav.UnitaOperativa)}</UnitaOperativa>\n`;
        if (lav.UnitaProduttiva) x += `        <UnitaProduttiva>${esc(lav.UnitaProduttiva)}</UnitaProduttiva>\n`;
        if (lav.CodiceComune) x += `        <CodiceComune>${esc(lav.CodiceComune)}</CodiceComune>\n`;
        if (lav.CodiceContratto) x += `        <CodiceContratto>${esc(lav.CodiceContratto)}</CodiceContratto>\n`;
        if (lav.TipoCodiceContratto) x += `        <TipoCodiceContratto>${esc(cod2(lav.TipoCodiceContratto))}</TipoCodiceContratto>\n`;
        if (lav.QualProf) x += `        <QualProf>${esc(lav.QualProf)}</QualProf>\n`;
        if (lav.TipoPaga) x += `        <TipoPaga>${esc(lav.TipoPaga)}</TipoPaga>\n`;
        if (lav.DivisoreOrarioContr) x += `        <DivisoreOrarioContr>${esc(lav.DivisoreOrarioContr)}</DivisoreOrarioContr>\n`;
        if (lav.OrarioContrattuale) x += `        <OrarioContrattuale>${esc(lav.OrarioContrattuale)}</OrarioContrattuale>\n`;
        if (lav.OrarioGiornMedioContrattuale) x += `        <OrarioGiornMedioContrattuale>${esc(lav.OrarioGiornMedioContrattuale)}</OrarioGiornMedioContrattuale>\n`;
        if (lav.TipoApplCongedoParOre) x += `        <TipoApplCongedoParOre>${esc(lav.TipoApplCongedoParOre)}</TipoApplCongedoParOre>\n`;
        if (lav.TipoRetrMal) x += `        <TipoRetrMal>${esc(lav.TipoRetrMal)}</TipoRetrMal>\n`;
        if (lav.PercPartTime) x += `        <PercPartTime>${esc(lav.PercPartTime)}</PercPartTime>\n`;
        if (lav.PercPartTimeMese)
          x += `        <PercPartTimeMese>${esc(lav.PercPartTimeMese)}</PercPartTimeMese>\n`;
        if (lav.NumMensilita) x += `        <NumMensilita>${esc(lav.NumMensilita)}</NumMensilita>\n`;

        if (lav.hasCessazione) {
          x += `        <Cessazione>\n`;
          x += `          <GiornoCessazione>${esc(lav.GiornoCessazione)}</GiornoCessazione>\n`;
          if (lav.TipoCessazione) x += `          <TipoCessazione>${esc(lav.TipoCessazione)}</TipoCessazione>\n`;
          x += `        </Cessazione>\n`;
        }
        if (lav.hasAssunzione) {
          x += `        <Assunzione>\n`;
          x += `          <GiornoAssunzione>${esc(lav.GiornoAssunzione)}</GiornoAssunzione>\n`;
          if (lav.TipoAssunzione) x += `          <TipoAssunzione>${esc(lav.TipoAssunzione)}</TipoAssunzione>\n`;
          x += `        </Assunzione>\n`;
        }

        const forzAttr = lav.ForzImpZero ? ' ForzImpZero="S"' : '';
        x += `        <DatiRetributivi${forzAttr}>\n`;
        if (lav.TipoLavoratore) x += `          <TipoLavoratore>${esc(lav.TipoLavoratore)}</TipoLavoratore>\n`;
        if (lav.TipoLavStat) x += `          <TipoLavStat>${esc(lav.TipoLavStat)}</TipoLavStat>\n`;

        if (lav.TipoLavStat === "NR00" && lav.hasMaternita) {
          x += `          <Maternita><MatACredito>\n`;
          if (lav.IndMat1Fascia) x += `            <IndMat1Fascia>${esc(lav.IndMat1Fascia)}</IndMat1Fascia>\n`;
          if (lav.IndMat2Fascia) x += `            <IndMat2Fascia>${esc(lav.IndMat2Fascia)}</IndMat2Fascia>\n`;
          x += `          </MatACredito></Maternita>\n`;
        }

        if (lav.TipoLavStat !== "NR00") {
          if (lav.Imponibile) x += `          <Imponibile>${esc(impInt(lav.Imponibile))}</Imponibile>\n`;
          if (lav.Contributo) x += `          <Contributo>${esc(impDec(lav.Contributo))}</Contributo>\n`;
        }

        for (const ad of lav.AltreADebito) {
          x += `          <AltreADebito>\n`;
          x += `            <CausaleADebito>${esc(ad.CausaleADebito)}</CausaleADebito>\n`;
          // Il vincolo NumOre↔M701 / NumGG↔M702 non regge sui tracciati reali
          // (esistono M702 con NumOre): si emette ciò che è valorizzato.
          if (ad.NumOre) x += `            <NumOre>${esc(ad.NumOre)}</NumOre>\n`;
          if (ad.NumGG) x += `            <NumGG>${esc(ad.NumGG)}</NumGG>\n`;
          if (ad.AltroImponibile) x += `            <AltroImponibile>${esc(ad.AltroImponibile)}</AltroImponibile>\n`;
          if (ad.ImportoADebito) x += `            <ImportoADebito>${esc(ad.ImportoADebito)}</ImportoADebito>\n`;
          x += `          </AltreADebito>\n`;
        }

        if (lav.RetribTeorica) x += `          <RetribTeorica>${esc(impInt(lav.RetribTeorica))}</RetribTeorica>\n`;
        if (lav.OreLavorabili) x += `          <OreLavorabili>${esc(lav.OreLavorabili)}</OreLavorabili>\n`;

        // Alcune ricostruzioni (denunce a zero, regolarizzazioni) non prevedono <Settimana>:
        // il tracciato standard le vuole anche a copertura 0, quindi la scelta resta esplicita.
        const setts = lav.EmettiSettimane === false ? [] : calcSettimane(az.AnnoMese, lav.giorni, lav);
        for (const s of setts) {
          x += `          <Settimana>\n`;
          x += `            <IdSettimana>${s.IdSettimana}</IdSettimana>\n`;
          x += `            <TipoCopertura>${s.TipoCopertura}</TipoCopertura>\n`;
          if (s.CodiceEvento) x += `            <CodiceEvento>${s.CodiceEvento}</CodiceEvento>\n`;
          x += `          </Settimana>\n`;
        }

        for (const g of lav.giorni) {
          const gg = String(g.gg).padStart(2, "0");
          if (g.tipoCoperturaGiorn || g.evento) {
            x += `          <Giorno GG="${gg}">\n`;
            x += `            <Lavorato>${g.lavorato}</Lavorato>\n`;
            if (g.tipoCoperturaGiorn) x += `            <TipoCoperturaGiorn>${g.tipoCoperturaGiorn}</TipoCoperturaGiorn>\n`;
            if (g.evento) {
              x += `            <EventoGiorn>\n`;
              x += `              <CodiceEventoGiorn>${esc(g.evento.codice)}</CodiceEventoGiorn>\n`;
              x += `              <InfoAggEvento TipoInfoAggEvento="${esc(g.evento.infoTipo)}">${esc(g.evento.infoVal)}</InfoAggEvento>\n`;
              x += `            </EventoGiorn>\n`;
            }
            x += `          </Giorno>\n`;
          } else {
            x += `          <Giorno GG="${gg}"><Lavorato>${g.lavorato}</Lavorato></Giorno>\n`;
          }
        }

        for (const da of lav.DifferenzeAccredito) {
          x += `          <DifferenzeAccredito>\n`;
          if (da.CodiceEvento) x += `            <CodiceEvento>${esc(da.CodiceEvento)}</CodiceEvento>\n`;
          if (da.DiffAccredito) x += `            <DiffAccredito>${esc(da.DiffAccredito)}</DiffAccredito>\n`;
          if (da.MotivoEvento || da.DiffAccreditoEvento) {
            x += `            <InfoEvento>\n`;
            if (da.MotivoEvento) x += `              <MotivoEvento TipoMotivoEvento="${esc(da.TipoMotivoEvento)}">${esc(da.MotivoEvento)}</MotivoEvento>\n`;
            if (da.DiffAccreditoEvento) x += `              <DiffAccreditoEvento>${esc(da.DiffAccreditoEvento)}</DiffAccreditoEvento>\n`;
            x += `            </InfoEvento>\n`;
          }
          x += `          </DifferenzeAccredito>\n`;
        }

        /* GiorniRetribuiti va sempre. Poi lo schema prevede una SCELTA — il Documento
           tecnico INPS dice "Ovvero" — fra GiorniContribuiti e OreContribuite: emetterli
           entrambi fa scartare il flusso ("invalid child element 'OreContribuite'", perché
           GiorniContribuiti ha già soddisfatto la scelta).
           Sul part-time si usa OreContribuite (ore per cui è stata versata contribuzione). */
        if (lav.GiorniRetribuiti) x += `          <GiorniRetribuiti>${esc(lav.GiorniRetribuiti)}</GiorniRetribuiti>\n`;
        if (usaOreContribuite(lav)) {
          x += `          <OreContribuite>${esc(lav.OreContribuite)}</OreContribuite>\n`;
        } else if (lav.GiorniContribuiti) {
          x += `          <GiorniContribuiti>${esc(lav.GiorniContribuiti)}</GiorniContribuiti>\n`;
        }
        if (lav.RispettoMinimale) x += `          <RispettoMinimale>${esc(lav.RispettoMinimale)}</RispettoMinimale>\n`;
        if (lav.SettimaneUtili) x += `          <SettimaneUtili>${esc(lav.SettimaneUtili)}</SettimaneUtili>\n`;

        for (const c of lav.InfoAggCausali) {
          x += `          <InfoAggCausaliContrib>\n`;
          x += `            <CodiceCausale>${esc(c.CodiceCausale)}</CodiceCausale>\n`;
          x += `            <IdentMotivoUtilizzoCausale TipoIdentMotivoUtilizzo="${esc(c.TipoIdent)}">${esc(c.ValoreIdent)}</IdentMotivoUtilizzoCausale>\n`;
          if (c.AnnoMeseRif) x += `            <AnnoMeseRif>${esc(c.AnnoMeseRif)}</AnnoMeseRif>\n`;
          if (c.ImportoRif) x += `            <ImportoAnnoMeseRif>${esc(c.ImportoRif)}</ImportoAnnoMeseRif>\n`;
          x += `          </InfoAggCausaliContrib>\n`;
        }

        if (lav.DatiParticolari.length > 0) {
          x += `          <DatiParticolari><ConvBilat>\n`;
          for (const dp of lav.DatiParticolari) {
            x += `            <Conv><CodConv>${esc(dp.CodConv)}</CodConv><Importo Periodo="${esc(dp.Periodo)}">${esc(dp.Importo)}</Importo></Conv>\n`;
          }
          x += `          </ConvBilat></DatiParticolari>\n`;
        }

        x += `        </DatiRetributivi>\n`;

        /* GestioneTFR solo se c'è davvero un dato TFR: emetterla sempre aggiungeva
           un BaseCalcoloTFR 0,00 inventato ai tracciati che non la prevedono. */
        const hasTFR = lav.hasDestinazioneTFR || lav.BaseCalcoloTFR ||
                       lav.BaseCalcoloPrevCompl || lav.MisureCompensative.length > 0;
        if (hasTFR) {
          x += `        <GestioneTFR>\n`;
          if (lav.hasDestinazioneTFR) {
            x += `          <DestinazioneTFR>\n`;
            if (lav.DestTFR_TipoScelta) x += `            <TipoScelta>${esc(lav.DestTFR_TipoScelta)}</TipoScelta>\n`;
            if (lav.DestTFR_DataScelta) x += `            <DataScelta>${esc(lav.DestTFR_DataScelta)}</DataScelta>\n`;
            x += `            <ProfiloLav>\n`;
            if (lav.DestTFR_IscrizPrevObbl) x += `              <IscrizPrevObbl>${esc(lav.DestTFR_IscrizPrevObbl)}</IscrizPrevObbl>\n`;
            x += `              <IscrizPrevCompl>${esc(lav.DestTFR_IscrizPrevCompl)}</IscrizPrevCompl>\n`;
            x += `            </ProfiloLav>\n`;
            x += `            <SceltaDest><SceltaTFR><FondoTesoreria>${esc(lav.DestTFR_FondoTesoreria)}</FondoTesoreria></SceltaTFR></SceltaDest>\n`;
            x += `          </DestinazioneTFR>\n`;
          }
          x += `          <MeseTFR>\n`;
          x += `            <BaseCalcoloTFR>${esc(lav.BaseCalcoloTFR || "0,00")}</BaseCalcoloTFR>\n`;
          if (lav.BaseCalcoloPrevCompl) x += `            <BaseCalcoloPrevCompl>${esc(lav.BaseCalcoloPrevCompl)}</BaseCalcoloPrevCompl>\n`;
          if (lav.MisureCompensative.length > 0) {
            x += `            <MisureCompensative>\n`;
            for (const mc of lav.MisureCompensative) {
              x += `              <MisCompACredito><CausaleMCACred>${esc(mc.CausaleMCACred)}</CausaleMCACred><ImportoMCACred>${esc(mc.ImportoMCACred)}</ImportoMCACred></MisCompACredito>\n`;
            }
            x += `            </MisureCompensative>\n`;
          }
          x += `          </MeseTFR>\n`;
          x += `        </GestioneTFR>\n`;
        }
        x += `      </DenunciaIndividuale>\n`;
      }

      const nLav = pos.lavoratori.length;
      const totDeb = calcTotDebito(pos.lavoratori, pos.AltrePartiteADebito);
      const totCred = calcTotCredito(pos.lavoratori);
      const forza = pos.ForzaAziendale || String(nLav);
      x += `      <DenunciaAziendale${regolarizzAttr(pos)}>\n`;
      x += `        <TrattQuotaLav>${esc(pos.TrattQuotaLav || "S")}</TrattQuotaLav>\n`;
      x += `        <NumLavoratori>${nLav}</NumLavoratori>\n`;
      x += `        <ForzaAziendale>${esc(forza)}</ForzaAziendale>\n`;
      for (const apd of pos.AltrePartiteADebito) {
        x += `        <AltrePartiteADebito>\n`;
        x += `          <CausaleADebito>${esc(apd.CausaleADebito)}</CausaleADebito>\n`;
        if (apd.NumDip) x += `          <NumDip>${esc(apd.NumDip)}</NumDip>\n`;
        if (apd.Retribuzione) x += `          <Retribuzione>${esc(apd.Retribuzione)}</Retribuzione>\n`;
        if (apd.SommaADebito) x += `          <SommaADebito>${esc(apd.SommaADebito)}</SommaADebito>\n`;
        x += `        </AltrePartiteADebito>\n`;
      }
      x += `        <DatiQuadraturaRetrContr>\n`;
      x += `          <NumDenIndiv>${nLav}</NumDenIndiv>\n`;
      x += `          <TotaleADebito>${totDeb}</TotaleADebito>\n`;
      x += `          <TotaleACredito>${totCred}</TotaleACredito>\n`;
      x += `        </DatiQuadraturaRetrContr>\n`;
      x += `      </DenunciaAziendale>\n`;
      x += `    </PosContributiva>\n`;
    }

    if (az.collaboratori.length > 0 || az.CAP || az.ISTAT) {
      x += `    <ListaCollaboratori>\n`;
      if (az.CAP) x += `      <CAP>${esc(az.CAP)}</CAP>\n`;
      if (az.ISTAT) x += `      <ISTAT>${esc(az.ISTAT)}</ISTAT>\n`;
      for (const c of az.collaboratori) {
        x += `      <Collaboratore>\n`;
        x += `        <CFCollaboratore>${esc(c.CFCollaboratore)}</CFCollaboratore>\n`;
        x += `        <Cognome>${esc(c.Cognome)}</Cognome>\n`;
        x += `        <Nome>${esc(c.Nome)}</Nome>\n`;
        if (c.CodiceComune) x += `        <CodiceComune>${esc(c.CodiceComune)}</CodiceComune>\n`;
        x += `        <TipoRapporto>${esc(c.TipoRapporto || "1E")}</TipoRapporto>\n`;
        if (c.Imponibile) x += `        <Imponibile>${esc(c.Imponibile)}</Imponibile>\n`;
        if (c.Aliquota) x += `        <Aliquota>${esc(c.Aliquota)}</Aliquota>\n`;
        if (c.AltraAss) x += `        <AltraAss>${esc(c.AltraAss)}</AltraAss>\n`;
        if (c.Dal) x += `        <Dal>${esc(c.Dal)}</Dal>\n`;
        if (c.Al) x += `        <Al>${esc(c.Al)}</Al>\n`;
        x += `      </Collaboratore>\n`;
      }
      x += `    </ListaCollaboratori>\n`;
    }

    x += `  </Azienda>\n`;
  }

  x += `</DenunceMensili>\n`;
  return x;
}

/* ═══ NOME FILE EXPORT ═══ */
function exportFilename(cfg, aziende) {
  const az = aziende[0];
  if (!az || !az.AnnoMese) return "uniemens-priv.xml";
  const [y, m] = az.AnnoMese.split("-");
  const yymm = y.slice(-2) + m;
  if (cfg.TipoMittente === "2") {
    const cf = (cfg.CFMittente || cfg.CFPersonaMittente || "").replace(/\s/g, "").toUpperCase();
    const last6 = cf.slice(-6) || "MITTEN";
    return `UM${last6}${yymm}.xml`;
  }
  return `UNIE${yymm}.xml`;
}

/* ═══ APP ═══ */
export default function UniEmensPriv() {
  const [cfg, setCfg] = useState(EMPTY_CFG);
  const [aziende, setAziende] = useState([mkAzienda()]);
  const [xAz, setXAz] = useState(null);
  const [xPos, setXPos] = useState(null);
  const [xLav, setXLav] = useState(null);
  const [xCollab, setXCollab] = useState(null);
  const [lavTab, setLavTab] = useState("anag");
  const [importReport, setImportReport] = useState(null);
  const [importPending, setImportPending] = useState(null); // {cfg, aziende, report}
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  const fileRef = useRef(null);

  /* ── Selezioni / lookup ── */
  const selAz = aziende.find(a => a.id === xAz);
  const selPos = selAz?.poss.find(p => p.id === xPos);
  const selLav = selPos?.lavoratori.find(l => l.id === xLav);
  const selCollab = selAz?.collaboratori.find(c => c.id === xCollab);

  /* ── Mutators ── */
  const updateCfg = (patch) => setCfg(c => ({...c, ...patch}));
  const updateAz = (azId, patch) => setAziende(arr => arr.map(a => a.id===azId ? {...a, ...patch} : a));
  const updatePos = (azId, posId, patch) => setAziende(arr => arr.map(a => a.id!==azId ? a : {
    ...a, poss: a.poss.map(p => p.id===posId ? {...p, ...patch} : p)
  }));
  const updateLav = (azId, posId, lavId, patch) => setAziende(arr => arr.map(a => a.id!==azId ? a : {
    ...a, poss: a.poss.map(p => p.id!==posId ? p : {
      ...p, lavoratori: p.lavoratori.map(l => l.id===lavId ? {...l, ...patch} : l)
    })
  }));
  const updateCollab = (azId, cId, patch) => setAziende(arr => arr.map(a => a.id!==azId ? a : {
    ...a, collaboratori: a.collaboratori.map(c => c.id===cId ? {...c, ...patch} : c)
  }));

  /* Se le denunce sono ordinarie, TipoRegolarizz va tolto ovunque: lasciarlo senza
     IdentInvioAttoINPS fa scartare il flusso (errore 31), e toglierlo lavoratore per
     lavoratore su una matricola popolata è una perdita di tempo. */
  const azzeraRegolarizz = (azId, posId) => setAziende(arr => arr.map(a => a.id!==azId ? a : {
    ...a, poss: a.poss.map(p => p.id!==posId ? p : {
      ...p, TipoRegolarizz:"", IdentInvioAttoINPS:"",
      lavoratori: p.lavoratori.map(l => ({...l, TipoRegolarizz:"", IdentInvioAttoINPS:""})),
    })
  }));

  /* ── AnnoMese change → ridimensiona giorni di tutti i lavoratori dell'azienda ── */
  const setAnnoMese = (azId, am) => {
    setAziende(arr => arr.map(a => {
      if (a.id !== azId) return a;
      const newLen = giorniMese(am) || 30;
      return {
        ...a, AnnoMese: am,
        poss: a.poss.map(p => ({
          ...p,
          lavoratori: p.lavoratori.map(l => {
            if (l.giorni.length === newLen) return l;
            const ng = mkGiorni(newLen);
            for (let i=0; i<Math.min(l.giorni.length, newLen); i++) ng[i] = {...l.giorni[i], gg:i+1};
            return {...l, giorni: ng};
          })
        }))
      };
    }));
  };

  /* ── Add/remove ── */
  const addAzienda = () => {
    const a = mkAzienda();
    setAziende(arr => [...arr, a]);
    // Su un'azienda nuova la prima cosa da compilare è l'Anno-Mese: apri il suo pannello.
    setXAz(a.id); setXPos(null); setXLav(null); setXCollab(null);
  };
  const removeAzienda = (id) => {
    if (!confirm("Eliminare l'azienda e tutti i suoi dati?")) return;
    setAziende(arr => arr.filter(a => a.id !== id));
    if (xAz === id) { setXAz(null); setXPos(null); setXLav(null); setXCollab(null); }
  };
  const addPos = (azId) => {
    const p = mkPos();
    setAziende(arr => arr.map(a => a.id===azId ? {...a, poss: [...a.poss, p]} : a));
    setXPos(p.id); setXLav(null);
  };
  const removePos = (azId, posId) => {
    if (!confirm("Eliminare la PosContributiva e tutti i suoi lavoratori?")) return;
    setAziende(arr => arr.map(a => a.id!==azId ? a : {...a, poss: a.poss.filter(p => p.id !== posId)}));
    if (xPos === posId) { setXPos(null); setXLav(null); }
  };
  const addLav = (azId, posId) => {
    const az = aziende.find(a => a.id === azId);
    const l = mkLav(az?.AnnoMese || "");
    setAziende(arr => arr.map(a => a.id!==azId ? a : {
      ...a, poss: a.poss.map(p => p.id===posId ? {...p, lavoratori:[...p.lavoratori, l]} : p)
    }));
    // selLav si risolve dentro selPos: senza aprire la matricola il nuovo lavoratore non si vedrebbe.
    setXPos(posId); setXLav(l.id);
  };
  const removeLav = (azId, posId, lavId) => {
    if (!confirm("Eliminare il lavoratore?")) return;
    setAziende(arr => arr.map(a => a.id!==azId ? a : {
      ...a, poss: a.poss.map(p => p.id!==posId ? p : {...p, lavoratori: p.lavoratori.filter(l => l.id !== lavId)})
    }));
    if (xLav === lavId) setXLav(null);
  };
  const duplicateLav = (azId, posId, lavId) => {
    setAziende(arr => arr.map(a => a.id!==azId ? a : {
      ...a, poss: a.poss.map(p => {
        if (p.id !== posId) return p;
        const orig = p.lavoratori.find(l => l.id === lavId);
        if (!orig) return p;
        const copy = JSON.parse(JSON.stringify(orig));
        copy.id = uid();
        copy.CFLavoratore = ""; copy.Cognome = ""; copy.Nome = "";
        copy.giorni = copy.giorni.map(g => ({...g}));
        copy.AltreADebito = copy.AltreADebito.map(x => ({...x, id: uid()}));
        copy.InfoAggCausali = copy.InfoAggCausali.map(x => ({...x, id: uid()}));
        copy.DatiParticolari = copy.DatiParticolari.map(x => ({...x, id: uid()}));
        copy.DifferenzeAccredito = copy.DifferenzeAccredito.map(x => ({...x, id: uid()}));
        copy.MisureCompensative = copy.MisureCompensative.map(x => ({...x, id: uid()}));
        return {...p, lavoratori: [...p.lavoratori, copy]};
      })
    }));
  };
  const addCollab = (azId) => {
    const c = mkCollab();
    setAziende(arr => arr.map(a => a.id===azId ? {...a, collaboratori:[...a.collaboratori, c]} : a));
    setXCollab(c.id); setShowCollabPanel(true);
  };
  const removeCollab = (azId, cId) => {
    if (!confirm("Eliminare il collaboratore?")) return;
    setAziende(arr => arr.map(a => a.id!==azId ? a : {...a, collaboratori: a.collaboratori.filter(c => c.id !== cId)}));
    if (xCollab === cId) setXCollab(null);
  };

  /* ── Reset ── */
  const reset = () => {
    if (!confirm("Reset completo? Tutti i dati verranno persi.")) return;
    setCfg(EMPTY_CFG);
    setAziende([mkAzienda()]);
    setXAz(null); setXPos(null); setXLav(null); setXCollab(null);
  };

  /* ── Import ── */
  const handleImport = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parsePrivXML(e.target.result);
        setImportPending(result);
      } catch (err) {
        alert("Errore import:\n" + err.message);
      }
    };
    reader.readAsText(file);
  };
  const applyImport = (mode) => {
    if (!importPending) return;
    const { cfg: newCfg, aziende: newAz, report } = importPending;
    if (mode === "replace") {
      setCfg(newCfg);
      setAziende(newAz.length ? newAz : [mkAzienda()]);
    } else {
      // In append il mittente corrente vince, ma se è ancora vuoto va preso dal file
      // invece di esportare una denuncia senza DatiMittente.
      const cfgVuoto = Object.values(cfg).every(v => !v || v === "1");
      if (cfgVuoto) setCfg(newCfg);
      setAziende(arr => [...arr, ...newAz]);
    }
    setImportPending(null);
    setImportReport(report);
    if (newAz.length > 0) {
      // Dopo un import il passo tipico è ricalibrare l'Anno-Mese: apri il pannello azienda.
      setXAz(newAz[0].id);
      setXPos(null);
      setXLav(null); setXCollab(null);
    }
  };

  /* ── Export ── */
  const handleExport = () => {
    /* Meglio fermarsi qui che scoprire lo scarto dal file di verifica INPS.
       Resta una conferma, non un blocco: le ricostruzioni parziali vanno salvate lo stesso. */
    const problemi = validaTutto(cfg, aziende);
    const err = problemi.filter(p => p.liv === "E");
    if (err.length) {
      const elenco = err.slice(0, 15).map(p => `• [${p.dove}] ${p.msg}`).join("\n");
      const extra = err.length > 15 ? `\n…e altri ${err.length - 15}.` : "";
      if (!confirm(`${err.length} quadri obbligatori incompleti: INPS scarterà il flusso.\n\n${elenco}${extra}\n\nEsportare comunque?`)) return;
    }
    if (!aziende.length || !aziende[0].AnnoMese) {
      if (!confirm("AnnoMese non impostato sulla prima azienda. Esportare comunque?")) return;
    }
    const xml = buildPrivXML(cfg, aziende);
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = exportFilename(cfg, aziende);
    // Firefox ignora il click su un anchor fuori dal DOM e revoca l'URL prima del download
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* ─────────── RENDER ─────────── */
  return (
    <div style={C.app}>
      {/* Header */}
      <div style={C.hdr}>
        <div>
          <div style={C.hdrT}>⬛ UniEmens Privatistico Builder v1.1</div>
          <div style={C.hdrS}>Settore privato e cantieri · IVS/DS · Co.co.co. · Regolarizzazioni</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={C.toolbar}>
        <button style={C.btn("p")} onClick={addAzienda}>+ Azienda</button>
        <button style={C.btn("d")} onClick={()=> selAz && addPos(selAz.id)} disabled={!selAz}>+ Matricola</button>
        {/* Con l'azienda selezionata ma nessuna matricola aperta si ricade sulla prima:
            il pulsante resterebbe altrimenti spento nel caso più comune (una sola matricola). */}
        <button style={C.btn("d")} onClick={()=>{ const p = selPos || selAz?.poss[0]; if (p) addLav(selAz.id, p.id); }} disabled={!selAz?.poss.length}>+ Lavoratore</button>
        <button style={C.btn("d")} onClick={()=> selAz && addCollab(selAz.id)} disabled={!selAz}>+ Collab.</button>
        <div style={{flex:1}}/>
        <button style={C.btn("i")} onClick={()=> fileRef.current?.click()}>Importa XML</button>
        <input type="file" accept=".xml" ref={fileRef} style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0]; if(f) handleImport(f); e.target.value="";}}/>
        <button style={C.btn("s")} onClick={handleExport}>Esporta XML</button>
        <button style={C.btn("x")} onClick={reset}>Reset</button>
      </div>

      {/* Body */}
      <div style={C.body}>
        {/* Sidebar */}
        <div style={C.side}>
          <div style={{fontSize:"10px",fontWeight:"700",color:"#0369A1",textTransform:"uppercase",letterSpacing:"1px",margin:"4px 6px 8px"}}>Aziende ({aziende.length})</div>
          <div
            style={{...C.itemRow(xAz===null && xPos===null && xLav===null), fontWeight:"600", color:"#0369A1", marginBottom:"8px"}}
            onClick={()=>{ setXAz(null); setXPos(null); setXLav(null); setXCollab(null); }}
          >
            ⚙ Dati Mittente
          </div>
          {aziende.map(a => {
            const nLav = a.poss.reduce((s,p) => s + p.lavoratori.length, 0);
            const totDeb = a.poss.reduce((s,p) => s + calcTotDebito(p.lavoratori, p.AltrePartiteADebito), 0);
            const isAct = xAz === a.id;
            return (
              <div key={a.id} style={{marginBottom:"4px"}}>
                {/* Selezionare l'azienda deve aprire il pannello azienda, non quello della prima
                    matricola: selPos ha la precedenza nel render e l'Anno-Mese restava irraggiungibile. */}
                <div style={C.itemRow(isAct)} onClick={()=>{ setXAz(a.id); setXPos(null); setXLav(null); setXCollab(null); }}>
                  <div style={{flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    <div style={{fontWeight:"600", fontSize:"12px"}}>
                      {a.RagSocAzienda || a.CFAzienda || "(nuova azienda)"}
                      <Pallino voci={validaAz(a)}/>
                    </div>
                    <div style={{fontSize:"10px", color:"#6A7282"}}>{a.AnnoMese || "—"} · {nLav} lav · €{totDeb}</div>
                  </div>
                  <button style={{...C.btn("x"), padding:"2px 6px", fontSize:"10px"}} onClick={e=>{e.stopPropagation(); removeAzienda(a.id);}}>✕</button>
                </div>
                {isAct && (
                  <div style={{marginLeft:"10px", marginBottom:"6px"}}>
                    {a.poss.map(p => {
                      const isP = xPos === p.id;
                      return (
                        <div key={p.id}>
                          <div style={C.itemRow(isP)} onClick={()=>{ setXPos(p.id); setXLav(null); setXCollab(null); }}>
                            <div style={{flex:1, fontSize:"11px"}}>
                              <span style={C.bdg("#0369A1")}>{p.Matricola || "MAT"}</span>
                              <span style={{marginLeft:"6px", color:"#6A7282"}}>{p.lavoratori.length} lav</span>
                              {p.TipoRegolarizz && <span style={{...C.bdg("#92400E"), marginLeft:"5px"}}>{p.TipoRegolarizz}</span>}
                              <Pallino voci={validaPos(p)}/>
                            </div>
                            <button style={{...C.btn("x"), padding:"1px 5px", fontSize:"9px"}} onClick={e=>{e.stopPropagation(); removePos(a.id, p.id);}}>✕</button>
                          </div>
                          {isP && (
                            <div style={{marginLeft:"10px"}}>
                              {p.lavoratori.map(l => (
                                <div key={l.id} style={C.itemRow(xLav === l.id)} onClick={()=>{ setXLav(l.id); setXCollab(null); }}>
                                  <div style={{flex:1, fontSize:"11px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                                    {l.Cognome || l.Nome ? `${l.Cognome} ${l.Nome}`.trim() : (l.CFLavoratore || "(nuovo)")}
                                    {l.TipoRegolarizz && <span style={{...C.bdg("#92400E"), marginLeft:"5px"}}>{l.TipoRegolarizz}</span>}
                                    <Pallino voci={validaLav(l, a.AnnoMese)}/>
                                  </div>
                                  <button style={{...C.btn("x"), padding:"1px 5px", fontSize:"9px"}} onClick={e=>{e.stopPropagation(); removeLav(a.id, p.id, l.id);}}>✕</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {a.collaboratori.length > 0 && (
                      <div style={{marginTop:"6px"}}>
                        <div style={{fontSize:"9px",fontWeight:"700",color:"#92400E",textTransform:"uppercase",letterSpacing:"1px",padding:"4px 6px"}}>
                          Collaboratori ({a.collaboratori.length})
                        </div>
                        {a.collaboratori.map(c => (
                          <div key={c.id} style={C.itemRow(xCollab === c.id)} onClick={()=>{ setXCollab(c.id); setXLav(null); setShowCollabPanel(true); }}>
                            <div style={{flex:1, fontSize:"11px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                              {c.Cognome || c.Nome ? `${c.Cognome} ${c.Nome}`.trim() : (c.CFCollaboratore || "(nuovo collab.)")}
                            </div>
                            <button style={{...C.btn("x"), padding:"1px 5px", fontSize:"9px"}} onClick={e=>{e.stopPropagation(); removeCollab(a.id, c.id);}}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Main panel */}
        <div style={C.main}>
          {selCollab ? renderCollabForm(selAz, selCollab, updateCollab) :
           selLav ? renderLavForm(selAz, selPos, selLav, lavTab, setLavTab, updateLav, duplicateLav) :
           selPos ? renderPosForm(selAz, selPos, updatePos, azzeraRegolarizz) :
           selAz ? renderAzForm(selAz, setAnnoMese, updateAz) :
           renderMittenteForm(cfg, updateCfg)}
        </div>
      </div>

      {/* Modal: import pending */}
      {importPending && (
        <div style={C.modal} onClick={()=>setImportPending(null)}>
          <div style={C.modalBox} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:"0 0 12px",color:"#0369A1"}}>Importa XML</h3>
            <div style={{marginBottom:"12px",fontSize:"12px",lineHeight:"1.6"}}>
              <div><b>{importPending.report.aziende}</b> aziende · <b>{importPending.report.posizioni}</b> posizioni · <b>{importPending.report.lavoratori}</b> lavoratori</div>
              <div><b>{importPending.report.collaboratori}</b> collaboratori · <b>{importPending.report.eventi}</b> eventi giorno (MAL/MA1)</div>
              <div><b>{importPending.report.regolarizz}</b> sezioni con TipoRegolarizz</div>
              {importPending.report.warnings.length > 0 && (
                <div style={{marginTop:"8px",color:"#92400E"}}>⚠ {importPending.report.warnings.join("; ")}</div>
              )}
              {importPending.report.ignored.length > 0 && (
                <div style={{marginTop:"4px",color:"#6A7282"}}>Sezioni ignorate: {importPending.report.ignored.join("; ")}</div>
              )}
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",flexWrap:"wrap"}}>
              <button style={C.btn("d")} onClick={()=>setImportPending(null)}>Annulla</button>
              <button style={C.btn("p")} onClick={()=>applyImport("append")}>Aggiungi aziende</button>
              <button style={C.btn("x")} onClick={()=>applyImport("replace")}>Sostituisci tutto</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: report post-import */}
      {importReport && (
        <div style={C.modal} onClick={()=>setImportReport(null)}>
          <div style={C.modalBox} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:"0 0 12px",color:"#166534"}}>✓ Import completato</h3>
            <div style={{fontSize:"12px",lineHeight:"1.7"}}>
              <div>Aziende: <b>{importReport.aziende}</b></div>
              <div>Posizioni contributive: <b>{importReport.posizioni}</b></div>
              <div>Lavoratori: <b>{importReport.lavoratori}</b></div>
              <div>Collaboratori: <b>{importReport.collaboratori}</b></div>
              <div>Eventi giorno (MAL/MA1): <b>{importReport.eventi}</b></div>
              <div>Sezioni in regolarizzazione: <b>{importReport.regolarizz}</b></div>
              {importReport.warnings.length > 0 && (<div style={{marginTop:"8px",color:"#92400E"}}>Warning: {importReport.warnings.join("; ")}</div>)}
              {importReport.ignored.length > 0 && (<div style={{marginTop:"4px",color:"#6A7282"}}>Ignorato: {importReport.ignored.join("; ")}</div>)}
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:"14px"}}>
              <button style={C.btn("p")} onClick={()=>setImportReport(null)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ FORM RENDERERS ═══ */
function renderMittenteForm(cfg, updateCfg) {
  return (
    <div style={C.sec}>
      <div style={C.sT}>Dati Mittente</div>
      <PannelloValidazione voci={validaCfg(cfg)}/>
      <div style={C.row}>
        <F label="TipoMittente" value={cfg.TipoMittente} onChange={v=>updateCfg({TipoMittente:v})} opts={TIPO_MITT} w="220px"/>
        <F label="CF Persona Mittente" value={cfg.CFPersonaMittente} onChange={v=>updateCfg({CFPersonaMittente:v.toUpperCase()})} w="200px"/>
        <F label="CF Mittente" value={cfg.CFMittente} onChange={v=>updateCfg({CFMittente:v.toUpperCase()})} w="200px"/>
      </div>
      <div style={C.row}>
        <F label="Ragione Sociale Mittente" value={cfg.RagSocMittente} onChange={v=>updateCfg({RagSocMittente:v})} full/>
      </div>
      <div style={C.row}>
        <F label="CF Softwarehouse" value={cfg.CFSoftwarehouse} onChange={v=>updateCfg({CFSoftwarehouse:v.toUpperCase()})} w="200px"/>
        {cfg.TipoMittente === "1" && (
          <F label="Sede INPS" value={cfg.SedeINPS} onChange={v=>updateCfg({SedeINPS:v})} w="120px" note="solo Tipo=1"/>
        )}
      </div>
      <div style={{fontSize:"11px",color:"#6A7282",marginTop:"10px",lineHeight:"1.5"}}>
        Tipo 1 = denuncia presentata direttamente dall'azienda · Tipo 2 = consulente/intermediario.
      </div>
    </div>
  );
}

function renderAzForm(az, setAnnoMese, updateAz) {
  const nLav = az.poss.reduce((s,p) => s + p.lavoratori.length, 0);
  return (
    <>
      <PannelloValidazione voci={validaAz(az)}/>
      <div style={C.sec}>
        <div style={C.sT}>Configurazione Azienda</div>
        <div style={C.row}>
          <F label="Anno-Mese" value={az.AnnoMese} onChange={v=>setAnnoMese(az.id, v)} ph="YYYY-MM" w="120px" type="month"/>
          <F label="CF Azienda" value={az.CFAzienda} onChange={v=>updateAz(az.id, {CFAzienda:v.toUpperCase()})} w="180px"/>
          <F label="Ragione Sociale" value={az.RagSocAzienda} onChange={v=>updateAz(az.id, {RagSocAzienda:v})} full/>
        </div>
        <div style={{fontSize:"11px",color:"#6A7282",marginTop:"6px"}}>
          {nLav} lavoratori · {az.poss.length} posizioni contributive · {az.collaboratori.length} collaboratori
        </div>
        {/* Cambiando mese i giorni vengono ridimensionati ma conservano gli stati precedenti:
            l'allineamento ai giorni della settimana cambia, il calendario va rivisto. */}
        <div style={{fontSize:"11px",color:"#92400E",marginTop:"6px",lineHeight:"1.5"}}>
          Cambiando Anno-Mese l'anagrafica dei lavoratori resta intatta e il calendario viene
          adattato alla lunghezza del nuovo mese, ma gli stati dei giorni restano quelli del mese
          precedente e non sono più allineati ai giorni della settimana: rientra nel tab
          <b> Giorni</b> di ogni lavoratore e ripremi <b>Compila Lun–Ven</b>.
        </div>
      </div>

      <div style={C.sec}>
        <div style={C.sT}>Lista Collaboratori (ListaCollaboratori)</div>
        <div style={C.row}>
          <F label="CAP" value={az.CAP} onChange={v=>updateAz(az.id, {CAP:v})} w="100px"/>
          <F label="ISTAT" value={az.ISTAT} onChange={v=>updateAz(az.id, {ISTAT:v})} w="100px"/>
        </div>
        <div style={{fontSize:"11px",color:"#6A7282"}}>
          {az.collaboratori.length === 0 ? "Nessun collaboratore. Usa il pulsante \"+ Collab.\" nella toolbar." :
            `${az.collaboratori.length} collaboratori. Selezionali dalla sidebar per modificarli.`}
        </div>
      </div>

    </>
  );
}

function renderPosForm(az, pos, updatePos, azzeraRegolarizz) {
  const totDeb = calcTotDebito(pos.lavoratori, pos.AltrePartiteADebito);
  const totCred = calcTotCredito(pos.lavoratori);
  const setApd = (patch) => updatePos(az.id, pos.id, patch);
  return (
    <>
      <PannelloValidazione voci={validaPos(pos)}/>
      <div style={C.sec}>
        <div style={C.sT}>Posizione Contributiva</div>
        <div style={C.row}>
          <F label="Matricola INPS" value={pos.Matricola} onChange={v=>setApd({Matricola:v})} w="200px"/>
          <F label="Tratt. Quota Lav." value={pos.TrattQuotaLav} onChange={v=>setApd({TrattQuotaLav:v})} opts={SI_NO} w="120px"/>
          <F label="Forza Aziendale" value={pos.ForzaAziendale} onChange={v=>setApd({ForzaAziendale:v})} ph={String(pos.lavoratori.length)} w="120px" note="auto da NumLav"/>
        </div>
        <div style={{marginTop:"12px",padding:"10px",background:"#F0FDF4",borderRadius:"6px",fontSize:"12px"}}>
          <div><b>Riepilogo PosContributiva</b></div>
          <div>NumLavoratori: {pos.lavoratori.length}</div>
          <div>Totale a Debito: € {totDeb}</div>
          <div>Totale a Credito: € {totCred}</div>
        </div>
      </div>

      <div style={C.sec}>
        <div style={C.sT}>Regolarizzazione — frontespizio (DenunciaAziendale)</div>
        <div style={C.row}>
          <F label="Tipo Regolarizz." value={pos.TipoRegolarizz} onChange={v=>setApd({TipoRegolarizz:v.toUpperCase()})} ph="es. RS" w="140px"/>
          <F label="Ident. Invio Atto INPS" value={pos.IdentInvioAttoINPS} onChange={v=>setApd({IdentInvioAttoINPS:v})} ph="vuoto se assente" w="220px" disabled={!pos.TipoRegolarizz}/>
        </div>
        <div style={{fontSize:"11px",color:"#6A7282"}}>
          Vuoto = denuncia ordinaria, nessun attributo nel tag. Valorizzato = <code>TipoRegolarizz</code> e <code>IdentInvioAttoINPS</code> su <code>&lt;DenunciaAziendale&gt;</code>.
          Se <code>TipoRegolarizz</code> è valorizzato, <code>IdentInvioAttoINPS</code> diventa obbligatorio (errore 31).
        </div>
        {(pos.TipoRegolarizz || pos.lavoratori.some(l => l.TipoRegolarizz)) && (
          <button style={{...C.btn("w"), marginTop:"8px"}}
                  onClick={()=>{ if (confirm(`Togliere TipoRegolarizz e IdentInvioAttoINPS dalla matricola e da tutti i suoi ${pos.lavoratori.length} lavoratori?\n\nUsalo se le denunce sono ordinarie e non regolarizzazioni.`)) azzeraRegolarizz(az.id, pos.id); }}>
            Azzera regolarizzazione su tutta la matricola
          </button>
        )}
      </div>

      <div style={C.sec}>
        <div style={C.sT}>Altre Partite a Debito (DenunciaAziendale)</div>
        {pos.AltrePartiteADebito.length === 0 && <div style={C.empty}>Nessuna partita a debito</div>}
        {pos.AltrePartiteADebito.map(apd => (
          <div key={apd.id} style={{...C.row, alignItems:"flex-end"}}>
            <F label="Causale" value={apd.CausaleADebito} onChange={v=>setApd({AltrePartiteADebito: pos.AltrePartiteADebito.map(x=>x.id===apd.id?{...x,CausaleADebito:v}:x)})} opts={[{v:"",l:"—"},...CAUSALE_APD]} w="160px"/>
            <F label="NumDip" value={apd.NumDip} onChange={v=>setApd({AltrePartiteADebito: pos.AltrePartiteADebito.map(x=>x.id===apd.id?{...x,NumDip:v}:x)})} w="80px"/>
            <F label="Retribuzione" value={apd.Retribuzione} onChange={v=>setApd({AltrePartiteADebito: pos.AltrePartiteADebito.map(x=>x.id===apd.id?{...x,Retribuzione:v}:x)})} w="120px"/>
            <F label="Somma a debito" value={apd.SommaADebito} onChange={v=>setApd({AltrePartiteADebito: pos.AltrePartiteADebito.map(x=>x.id===apd.id?{...x,SommaADebito:v}:x)})} w="120px"/>
            <button style={C.btn("x")} onClick={()=>setApd({AltrePartiteADebito: pos.AltrePartiteADebito.filter(x=>x.id!==apd.id)})}>✕</button>
          </div>
        ))}
        <button style={C.btn("d")} onClick={()=>setApd({AltrePartiteADebito:[...pos.AltrePartiteADebito, {id:uid(),CausaleADebito:"M980",NumDip:"",Retribuzione:"",SommaADebito:""}]})}>+ Riga</button>
      </div>
    </>
  );
}

function renderCollabForm(az, c, updateCollab) {
  return (
    <div style={C.sec}>
      <div style={C.sT}>Collaboratore co.co.co.</div>
      <div style={C.row}>
        <F label="Codice Fiscale" value={c.CFCollaboratore} onChange={v=>updateCollab(az.id, c.id, {CFCollaboratore:v.toUpperCase()})} w="200px"/>
        <F label="Cognome" value={c.Cognome} onChange={v=>updateCollab(az.id, c.id, {Cognome:v})} w="180px"/>
        <F label="Nome" value={c.Nome} onChange={v=>updateCollab(az.id, c.id, {Nome:v})} w="180px"/>
      </div>
      <div style={C.row}>
        <F label="Codice Comune" value={c.CodiceComune} onChange={v=>updateCollab(az.id, c.id, {CodiceComune:v})} w="120px"/>
        <F label="Tipo Rapporto" value={c.TipoRapporto} onChange={v=>updateCollab(az.id, c.id, {TipoRapporto:v})} opts={TIPO_RAPPORTO} w="160px"/>
      </div>
      <div style={C.row}>
        <F label="Imponibile" value={c.Imponibile} onChange={v=>updateCollab(az.id, c.id, {Imponibile:v})} w="140px"/>
        <F label="Aliquota" value={c.Aliquota} onChange={v=>updateCollab(az.id, c.id, {Aliquota:v})} w="120px"/>
        <F label="AltraAss" value={c.AltraAss} onChange={v=>updateCollab(az.id, c.id, {AltraAss:v})} w="120px"/>
      </div>
      <div style={C.row}>
        <F label="Dal" value={c.Dal} onChange={v=>updateCollab(az.id, c.id, {Dal:v})} type="date" w="160px"/>
        <F label="Al" value={c.Al} onChange={v=>updateCollab(az.id, c.id, {Al:v})} type="date" w="160px"/>
      </div>
    </div>
  );
}

function renderLavForm(az, pos, lav, lavTab, setLavTab, updateLav, duplicateLav) {
  const upd = (patch) => updateLav(az.id, pos.id, lav.id, patch);
  const ggLav = countGiorniLav(lav.giorni);
  // Ciò che il pannello mostra deve essere ciò che finisce nell'XML, flag compreso
  const setts = lav.EmettiSettimane === false ? [] : calcSettimane(az.AnnoMese, lav.giorni, lav);
  const avvisi = checkSettimane(setts, lav);
  const isNR00 = lav.TipoLavStat === "NR00";

  return (
    <>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}>
        <div style={{fontSize:"13px",fontWeight:"700",color:"#0369A1"}}>
          {lav.Cognome || lav.Nome ? `${lav.Cognome} ${lav.Nome}`.trim() : "(nuovo lavoratore)"} · {pos.Matricola || "MAT"}
        </div>
        <button style={C.btn("d")} onClick={()=>duplicateLav(az.id, pos.id, lav.id)}>Duplica</button>
      </div>

      {/* I quadri obbligatori vanno segnalati mentre si compila, non dopo lo scarto INPS.
          Sta fuori dai tab perché l'errore può riguardare un tab non aperto. */}
      <PannelloValidazione voci={validaLav(lav, az.AnnoMese)}/>

      <div style={C.tabsBar}>
        {[["anag","Anagrafica"],["retr","Retributivi"],["gg","Giorni"],["opt","Opzionali"],["tfr","TFR"]].map(([k,l])=>(
          <button key={k} style={C.tab(lavTab===k)} onClick={()=>setLavTab(k)}>{l}</button>
        ))}
      </div>

      <div style={{...C.sec, borderTopLeftRadius:0, borderTopRightRadius:0}}>
        {lavTab === "anag" && (
          <>
            <div style={C.row}>
              <F label="Codice Fiscale" value={lav.CFLavoratore} onChange={v=>upd({CFLavoratore:v.toUpperCase()})} w="200px"/>
              <F label="Cognome" value={lav.Cognome} onChange={v=>upd({Cognome:v})} w="180px"/>
              <F label="Nome" value={lav.Nome} onChange={v=>upd({Nome:v})} w="180px"/>
            </div>
            <div style={C.row}>
              <F label="Email (RecapitiLav)" value={lav.EmailLav} onChange={v=>upd({EmailLav:v})} w="260px"/>
              <F label="Cellulare (RecapitiLav)" value={lav.CellLav} onChange={v=>upd({CellLav:v})} w="160px"/>
            </div>
            <div style={{...C.row, padding:"8px 10px", background:"#FFFBEB", borderRadius:"6px"}}>
              <F label="Tipo Regolarizz." value={lav.TipoRegolarizz} onChange={v=>upd({TipoRegolarizz:v.toUpperCase()})} ph="es. RS" w="140px" note="su DenunciaIndividuale"/>
              <F label="Ident. Invio Atto INPS" value={lav.IdentInvioAttoINPS} onChange={v=>upd({IdentInvioAttoINPS:v})} ph="vuoto se assente" w="220px" disabled={!lav.TipoRegolarizz}/>
            </div>
            <div style={C.row}>
              <F label="Qualifica1" value={lav.Qualifica1} onChange={v=>upd({Qualifica1:v})} opts={TIPO_Q1} w="180px"/>
              <F label="Qualifica2" value={lav.Qualifica2} onChange={v=>upd({Qualifica2:v})} opts={TIPO_Q2} w="180px"/>
              <F label="Qualifica3" value={lav.Qualifica3} onChange={v=>upd({Qualifica3:v})} opts={TIPO_Q3} w="180px"/>
            </div>
            <div style={C.row}>
              <F label="Tipo Contribuzione" value={lav.TipoContribuzione} onChange={v=>upd({TipoContribuzione:v})} opts={TIPO_CONTRIB} w="220px"/>
              <F label="Regime Post 95" value={lav.RegimePost95} onChange={v=>upd({RegimePost95:v})} opts={SI_NO} w="120px"/>
              <F label="Num. Mensilità" value={lav.NumMensilita} onChange={v=>upd({NumMensilita:v})} opts={TIPO_MENS} w="160px"/>
            </div>
            <div style={C.row}>
              <F label="Cittadinanza" value={lav.Cittadinanza} onChange={v=>upd({Cittadinanza:v})} w="120px"/>
              <F label="Unità Operativa" value={lav.UnitaOperativa} onChange={v=>upd({UnitaOperativa:v})} w="120px"/>
              <F label="Unità Produttiva" value={lav.UnitaProduttiva} onChange={v=>upd({UnitaProduttiva:v})} w="120px"/>
              <F label="Codice Comune" value={lav.CodiceComune} onChange={v=>upd({CodiceComune:v})} w="120px"/>
            </div>
            <div style={C.row}>
              <F label="Codice Contratto" value={lav.CodiceContratto} onChange={v=>upd({CodiceContratto:v})} w="120px"/>
              <F label="Tipo Cod. Contratto" value={lav.TipoCodiceContratto} onChange={v=>upd({TipoCodiceContratto:v})} w="120px"
                 note={cod2(lav.TipoCodiceContratto) !== String(lav.TipoCodiceContratto||"").trim() ? `XML: ${cod2(lav.TipoCodiceContratto)}` : ""}/>
              <F label="QualProf (ISTAT)" value={lav.QualProf} onChange={v=>upd({QualProf:v})} ph="5.2.2.4.0" w="160px"/>
            </div>
            <div style={C.row}>
              <F label="Tipo Paga" value={lav.TipoPaga} onChange={v=>upd({TipoPaga:v})} opts={TIPO_PAGA} w="120px"/>
              <F label="Divisore Orario" value={lav.DivisoreOrarioContr} onChange={v=>upd({DivisoreOrarioContr:v})} w="120px"/>
              <F label="Orario Contrattuale" value={lav.OrarioContrattuale} onChange={v=>upd({OrarioContrattuale:v})} w="140px" note="es. 4000=40h"/>
              <F label="Orario Giorn. Medio" value={lav.OrarioGiornMedioContrattuale} onChange={v=>upd({OrarioGiornMedioContrattuale:v})} w="140px" note="es. 800=8h"/>
            </div>
            <div style={C.row}>
              <F label="Tipo Retr. Mal." value={lav.TipoRetrMal} onChange={v=>upd({TipoRetrMal:v})} opts={TIPO_RETR_MAL} w="120px"/>
              <F label="Tipo Appl. Cong." value={lav.TipoApplCongedoParOre} onChange={v=>upd({TipoApplCongedoParOre:v})} opts={SI_NO_EMPTY} w="120px"/>
              <F label="% Part-Time" value={lav.PercPartTime} onChange={v=>upd({PercPartTime:v})} ph="es. 5000" w="120px"/>
              <F label="% Part-Time Mese" value={lav.PercPartTimeMese} onChange={v=>upd({PercPartTimeMese:v})} ph="se differente" w="120px"/>
            </div>
            <div style={{...C.row, marginTop:"12px", alignItems:"center"}}>
              <label style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",fontWeight:"600"}}>
                <input type="checkbox" checked={lav.hasCessazione} onChange={e=>upd({hasCessazione:e.target.checked})}/> Cessazione
              </label>
              {lav.hasCessazione && <>
                <F label="Giorno" value={lav.GiornoCessazione} onChange={v=>upd({GiornoCessazione:v})} w="80px"/>
                <F label="Tipo" value={lav.TipoCessazione} onChange={v=>upd({TipoCessazione:v})} opts={TIPO_CESS} w="200px"/>
              </>}
            </div>
            <div style={{...C.row, alignItems:"center"}}>
              <label style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",fontWeight:"600"}}>
                <input type="checkbox" checked={lav.hasAssunzione} onChange={e=>upd({hasAssunzione:e.target.checked})}/> Assunzione
              </label>
              {lav.hasAssunzione && <>
                <F label="Giorno" value={lav.GiornoAssunzione} onChange={v=>upd({GiornoAssunzione:v})} w="80px"/>
                <F label="Tipo" value={lav.TipoAssunzione} onChange={v=>upd({TipoAssunzione:v})} opts={TIPO_ASSUN} w="180px"/>
              </>}
            </div>
          </>
        )}

        {lavTab === "retr" && (
          <>
            <div style={C.row}>
              <F label="Tipo Lavoratore" value={lav.TipoLavoratore} onChange={v=>upd({TipoLavoratore:v})} opts={TIPO_LAV} w="180px"/>
              <F label="Tipo Lav. Stat." value={lav.TipoLavStat} onChange={v=>upd({TipoLavStat:v})} opts={TIPO_LAVSTAT} w="200px"/>
              <label style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",fontWeight:"600",marginTop:"16px"}}>
                <input type="checkbox" checked={lav.ForzImpZero} onChange={e=>upd({ForzImpZero:e.target.checked})}/> Forz. Imp. Zero
              </label>
            </div>
            {!isNR00 && (
              <div style={C.row}>
                {/* L'arrotondamento a intero cambia un importo dichiarato: va mostrato,
                    non fatto di nascosto in fase di export. */}
                <F label="Imponibile" value={lav.Imponibile} onChange={v=>upd({Imponibile:v})} w="140px"
                   note={impInt(lav.Imponibile) !== String(lav.Imponibile||"").trim() ? `XML: ${impInt(lav.Imponibile)}` : ""}/>
                <F label="Contributo" value={lav.Contributo} onChange={v=>upd({Contributo:v})} w="140px"
                   note={impDec(lav.Contributo) !== String(lav.Contributo||"").trim() ? `XML: ${impDec(lav.Contributo)}` : ""}/>
                <F label="Retrib. Teorica" value={lav.RetribTeorica} onChange={v=>upd({RetribTeorica:v})} w="140px"
                   note={impInt(lav.RetribTeorica) !== String(lav.RetribTeorica||"").trim() ? `XML: ${impInt(lav.RetribTeorica)}` : ""}/>
              </div>
            )}
            <div style={C.row}>
              <F label="Ore Lavorabili" value={lav.OreLavorabili} onChange={v=>upd({OreLavorabili:v})} w="120px"/>
              {/* In centesimi come OrarioContrattuale: la nota mostra il valore in chiaro. */}
              <F label="Ore Contribuite" value={lav.OreContribuite} onChange={v=>upd({OreContribuite:v})} w="120px"
                 ph="es. 7800=78h" note={lav.OreContribuite ? `= ${oreDaCentesimi(lav.OreContribuite)} ore` : ""}/>
              <F label="Settimane Utili" value={lav.SettimaneUtili} onChange={v=>upd({SettimaneUtili:v})} w="120px"/>
            </div>
            <div style={C.row}>
              <F label="Giorni Retribuiti" value={lav.GiorniRetribuiti} onChange={v=>upd({GiorniRetribuiti:v})} w="120px" note={`auto: ${ggLav}`}/>
              <F label="Giorni Contribuiti" value={lav.GiorniContribuiti} onChange={v=>upd({GiorniContribuiti:v})} w="120px"
                 note={usaOreContribuite(lav) ? "escluso dall'XML" : ""}/>
              <F label="Rispetto Minimale" value={lav.RispettoMinimale} onChange={v=>upd({RispettoMinimale:v})} opts={SI_NO} w="120px"/>
            </div>
            <div style={{fontSize:"11px",color:"#6A7282",marginTop:"-4px",marginBottom:"9px",lineHeight:"1.5"}}>
              <code>GiorniRetribuiti</code> va sempre indicato. <code>GiorniContribuiti</code> e <code>OreContribuite</code> sono
              invece <b>alternativi</b>: nell'XML ne esce uno solo. Sul part-time va usato <code>OreContribuite</code>,
              espresso in centesimi (78 ore = <code>7800</code>).
            </div>
            <div style={C.row}>
              <F label="Base Calcolo TFR" value={lav.BaseCalcoloTFR} onChange={v=>upd({BaseCalcoloTFR:v})} w="160px"/>
              <F label="Base Calcolo Prev. Compl." value={lav.BaseCalcoloPrevCompl} onChange={v=>upd({BaseCalcoloPrevCompl:v})} w="160px"/>
            </div>
            {isNR00 && (
              <div style={{marginTop:"10px",padding:"10px",background:"#FFFBEB",borderRadius:"6px"}}>
                <label style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",fontWeight:"600",marginBottom:"8px"}}>
                  <input type="checkbox" checked={lav.hasMaternita} onChange={e=>upd({hasMaternita:e.target.checked})}/> Maternità a credito
                </label>
                {lav.hasMaternita && (
                  <div style={C.row}>
                    <F label="Ind. Mat. 1ª Fascia" value={lav.IndMat1Fascia} onChange={v=>upd({IndMat1Fascia:v})} w="160px"/>
                    <F label="Ind. Mat. 2ª Fascia" value={lav.IndMat2Fascia} onChange={v=>upd({IndMat2Fascia:v})} w="160px"/>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {lavTab === "gg" && renderGiorni(lav, upd, az.AnnoMese, ggLav, setts, avvisi)}

        {lavTab === "opt" && (
          <>
            <div style={C.sT}>Altre a Debito</div>
            {lav.AltreADebito.length === 0 && <div style={C.empty}>Nessuna voce</div>}
            {lav.AltreADebito.map(ad => (
              <div key={ad.id} style={{...C.row,alignItems:"flex-end"}}>
                <F label="Causale" value={ad.CausaleADebito} onChange={v=>upd({AltreADebito:lav.AltreADebito.map(x=>x.id===ad.id?{...x,CausaleADebito:v}:x)})} opts={CAUSALE_AD} w="160px"/>
                {ad.CausaleADebito === "M701" && <F label="NumOre" value={ad.NumOre} onChange={v=>upd({AltreADebito:lav.AltreADebito.map(x=>x.id===ad.id?{...x,NumOre:v}:x)})} w="100px"/>}
                {ad.CausaleADebito === "M702" && <F label="NumGG" value={ad.NumGG} onChange={v=>upd({AltreADebito:lav.AltreADebito.map(x=>x.id===ad.id?{...x,NumGG:v}:x)})} w="100px"/>}
                <F label="Altro Imp." value={ad.AltroImponibile} onChange={v=>upd({AltreADebito:lav.AltreADebito.map(x=>x.id===ad.id?{...x,AltroImponibile:v}:x)})} w="120px"/>
                <F label="Importo" value={ad.ImportoADebito} onChange={v=>upd({AltreADebito:lav.AltreADebito.map(x=>x.id===ad.id?{...x,ImportoADebito:v}:x)})} w="120px"/>
                <button style={C.btn("x")} onClick={()=>upd({AltreADebito:lav.AltreADebito.filter(x=>x.id!==ad.id)})}>✕</button>
              </div>
            ))}
            <button style={C.btn("d")} onClick={()=>upd({AltreADebito:[...lav.AltreADebito, {id:uid(),CausaleADebito:"M701",NumOre:"",NumGG:"",AltroImponibile:"",ImportoADebito:""}]})}>+ Riga</button>

            <div style={{...C.sT, marginTop:"18px"}}>Info Aggiuntive Causali Contributive</div>
            {lav.InfoAggCausali.length === 0 && <div style={C.empty}>Nessuna voce</div>}
            {lav.InfoAggCausali.map(c => (
              <div key={c.id} style={{...C.row,alignItems:"flex-end"}}>
                <F label="Cod. Causale" value={c.CodiceCausale} onChange={v=>upd({InfoAggCausali:lav.InfoAggCausali.map(x=>x.id===c.id?{...x,CodiceCausale:v}:x)})} ph="DPMI" w="120px"/>
                <F label="Tipo Ident." value={c.TipoIdent} onChange={v=>upd({InfoAggCausali:lav.InfoAggCausali.map(x=>x.id===c.id?{...x,TipoIdent:v}:x)})} opts={TIPO_IDENT} w="100px"/>
                <F label="Valore Ident." value={c.ValoreIdent} onChange={v=>upd({InfoAggCausali:lav.InfoAggCausali.map(x=>x.id===c.id?{...x,ValoreIdent:v}:x)})} w="160px"/>
                <F label="Anno-Mese Rif." value={c.AnnoMeseRif} onChange={v=>upd({InfoAggCausali:lav.InfoAggCausali.map(x=>x.id===c.id?{...x,AnnoMeseRif:v}:x)})} ph="YYYY-MM" w="120px"/>
                <F label="Importo" value={c.ImportoRif} onChange={v=>upd({InfoAggCausali:lav.InfoAggCausali.map(x=>x.id===c.id?{...x,ImportoRif:v}:x)})} w="120px"/>
                <button style={C.btn("x")} onClick={()=>upd({InfoAggCausali:lav.InfoAggCausali.filter(x=>x.id!==c.id)})}>✕</button>
              </div>
            ))}
            <button style={C.btn("d")} onClick={()=>upd({InfoAggCausali:[...lav.InfoAggCausali, {id:uid(),CodiceCausale:"DPMI",TipoIdent:"DATA",ValoreIdent:"",AnnoMeseRif:"",ImportoRif:""}]})}>+ Riga</button>

            <div style={{...C.sT, marginTop:"18px"}}>Dati Particolari (ConvBilat)</div>
            {lav.DatiParticolari.length === 0 && <div style={C.empty}>Nessuna voce</div>}
            {lav.DatiParticolari.map(d => (
              <div key={d.id} style={{...C.row,alignItems:"flex-end"}}>
                <F label="Cod. Conv." value={d.CodConv} onChange={v=>upd({DatiParticolari:lav.DatiParticolari.map(x=>x.id===d.id?{...x,CodConv:v}:x)})} ph="EBNA" w="120px"/>
                <F label="Importo" value={d.Importo} onChange={v=>upd({DatiParticolari:lav.DatiParticolari.map(x=>x.id===d.id?{...x,Importo:v}:x)})} w="120px"/>
                <F label="Periodo" value={d.Periodo} onChange={v=>upd({DatiParticolari:lav.DatiParticolari.map(x=>x.id===d.id?{...x,Periodo:v}:x)})} ph="YYYY-MM" w="120px"/>
                <button style={C.btn("x")} onClick={()=>upd({DatiParticolari:lav.DatiParticolari.filter(x=>x.id!==d.id)})}>✕</button>
              </div>
            ))}
            <button style={C.btn("d")} onClick={()=>upd({DatiParticolari:[...lav.DatiParticolari, {id:uid(),CodConv:"EBNA",Importo:"",Periodo:az.AnnoMese}]})}>+ Riga</button>

            <div style={{...C.sT, marginTop:"18px"}}>Differenze Accredito</div>
            {lav.DifferenzeAccredito.length === 0 && <div style={C.empty}>Nessuna voce</div>}
            {lav.DifferenzeAccredito.map(d => (
              <div key={d.id} style={{...C.row,alignItems:"flex-end"}}>
                <F label="Codice Evento" value={d.CodiceEvento} onChange={v=>upd({DifferenzeAccredito:lav.DifferenzeAccredito.map(x=>x.id===d.id?{...x,CodiceEvento:v}:x)})} w="110px"/>
                <F label="Diff. Accredito" value={d.DiffAccredito} onChange={v=>upd({DifferenzeAccredito:lav.DifferenzeAccredito.map(x=>x.id===d.id?{...x,DiffAccredito:v}:x)})} w="120px"/>
                <F label="Tipo Motivo" value={d.TipoMotivoEvento} onChange={v=>upd({DifferenzeAccredito:lav.DifferenzeAccredito.map(x=>x.id===d.id?{...x,TipoMotivoEvento:v}:x)})} opts={TIPO_INFO_EVENTO} w="110px"/>
                <F label="Motivo Evento" value={d.MotivoEvento} onChange={v=>upd({DifferenzeAccredito:lav.DifferenzeAccredito.map(x=>x.id===d.id?{...x,MotivoEvento:v}:x)})} ph="n.certificato" w="150px"/>
                <F label="Diff. Acc. Evento" value={d.DiffAccreditoEvento} onChange={v=>upd({DifferenzeAccredito:lav.DifferenzeAccredito.map(x=>x.id===d.id?{...x,DiffAccreditoEvento:v}:x)})} w="120px"/>
                <button style={C.btn("x")} onClick={()=>upd({DifferenzeAccredito:lav.DifferenzeAccredito.filter(x=>x.id!==d.id)})}>✕</button>
              </div>
            ))}
            <button style={C.btn("d")} onClick={()=>upd({DifferenzeAccredito:[...lav.DifferenzeAccredito, {id:uid(),CodiceEvento:"",DiffAccredito:"",TipoMotivoEvento:"CM",MotivoEvento:"",DiffAccreditoEvento:""}]})}>+ Riga</button>
          </>
        )}

        {lavTab === "tfr" && (
          <>
            <div style={C.row}>
              <F label="Base Calcolo TFR" value={lav.BaseCalcoloTFR} onChange={v=>upd({BaseCalcoloTFR:v})} w="160px"/>
              <F label="Base Calcolo Prev. Compl." value={lav.BaseCalcoloPrevCompl} onChange={v=>upd({BaseCalcoloPrevCompl:v})} w="180px"/>
            </div>
            <div style={{marginTop:"10px",padding:"10px",background:"#F8FAFC",borderRadius:"6px"}}>
              <label style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",fontWeight:"600",marginBottom:"10px"}}>
                <input type="checkbox" checked={lav.hasDestinazioneTFR} onChange={e=>upd({hasDestinazioneTFR:e.target.checked})}/> Destinazione TFR
              </label>
              {lav.hasDestinazioneTFR && (
                <>
                  <div style={C.row}>
                    <F label="Tipo Scelta" value={lav.DestTFR_TipoScelta} onChange={v=>upd({DestTFR_TipoScelta:v})} w="120px"/>
                    <F label="Data Scelta" value={lav.DestTFR_DataScelta} onChange={v=>upd({DestTFR_DataScelta:v})} type="date" w="160px"/>
                  </div>
                  <div style={C.row}>
                    <F label="Iscriz. Prev. Obbl." value={lav.DestTFR_IscrizPrevObbl} onChange={v=>upd({DestTFR_IscrizPrevObbl:v})} w="180px"/>
                    <F label="Iscriz. Prev. Compl." value={lav.DestTFR_IscrizPrevCompl} onChange={v=>upd({DestTFR_IscrizPrevCompl:v})} w="180px"/>
                    <F label="Fondo Tesoreria" value={lav.DestTFR_FondoTesoreria} onChange={v=>upd({DestTFR_FondoTesoreria:v})} w="160px"/>
                  </div>
                </>
              )}
            </div>

            <div style={{...C.sT, marginTop:"18px"}}>Misure Compensative</div>
            {lav.MisureCompensative.length === 0 && <div style={C.empty}>Nessuna misura</div>}
            {lav.MisureCompensative.map(mc => (
              <div key={mc.id} style={{...C.row,alignItems:"flex-end"}}>
                <F label="Causale" value={mc.CausaleMCACred} onChange={v=>upd({MisureCompensative:lav.MisureCompensative.map(x=>x.id===mc.id?{...x,CausaleMCACred:v}:x)})} ph="TF01" w="140px"/>
                <F label="Importo" value={mc.ImportoMCACred} onChange={v=>upd({MisureCompensative:lav.MisureCompensative.map(x=>x.id===mc.id?{...x,ImportoMCACred:v}:x)})} w="140px"/>
                <button style={C.btn("x")} onClick={()=>upd({MisureCompensative:lav.MisureCompensative.filter(x=>x.id!==mc.id)})}>✕</button>
              </div>
            ))}
            <button style={C.btn("d")} onClick={()=>upd({MisureCompensative:[...lav.MisureCompensative, {id:uid(),CausaleMCACred:"TF01",ImportoMCACred:""}]})}>+ Riga</button>
          </>
        )}
      </div>
    </>
  );
}

function renderGiorni(lav, upd, annoMese, ggLav, setts, avvisi) {
  const cycleGiorno = (idx) => {
    const g = lav.giorni[idx];
    let next;
    // Cycle: N → S → MAL → MA1 → N
    const stato = g.evento?.codice === "MAL" ? "MAL" : g.evento?.codice === "MA1" ? "MA1" : g.lavorato === "S" ? "S" : "N";
    if (stato === "N") next = { lavorato:"S", tipoCoperturaGiorn:"", evento:null };
    else if (stato === "S") next = { lavorato:"N", tipoCoperturaGiorn:"0", evento:{codice:"MAL", infoTipo:"CM", infoVal:""} };
    else if (stato === "MAL") next = { lavorato:"N", tipoCoperturaGiorn:"1", evento:{codice:"MA1", infoTipo:"DT", infoVal:""} };
    else next = { lavorato:"N", tipoCoperturaGiorn:"", evento:null };
    upd({ giorni: lav.giorni.map((x,i)=> i===idx ? {...x, ...next} : x) });
  };
  const setAll = (lav_state) => {
    upd({ giorni: lav.giorni.map(g => ({...g, lavorato:lav_state, tipoCoperturaGiorn:"", evento:null})) });
  };
  const fillGGRetr = () => upd({ GiorniRetribuiti: String(ggLav) });

  const ov = lav.SettimaneOverride || {};
  const setOverride = (id, tc) => {
    const next = { ...ov };
    if (tc) next[id] = tc; else delete next[id];   // stringa vuota = torna al calcolo automatico
    upd({ SettimaneOverride: next });
  };

  /* Impagina il mese per giorno della settimana. Senza AnnoMese valido non si sa a che
     giorno corrisponda il GG 1: si ricade sulla griglia lineare e il riempimento è inibito. */
  const [annoY, annoM] = String(annoMese||"").split("-").map(Number);
  const dataMese = !!(annoY && annoM);
  // 0=lun … 6=dom, l'indice di colonna del calendario.
  const dowOf = (gg) => (new Date(annoY, annoM-1, gg).getDay() + 6) % 7;
  // Stessi estremi usati da calcSettimane: fuori dal rapporto i giorni non fanno settimana.
  const nDays = lav.giorni.length;
  const firstDay = lav.hasAssunzione ? Math.max(1, parseInt(lav.GiornoAssunzione) || 1) : 1;
  const lastDay  = lav.hasCessazione ? Math.min(nDays, parseInt(lav.GiornoCessazione) || nDays) : nDays;
  const fuoriRapporto = (gg) => gg < firstDay || gg > lastDay;

  /* Lun–sab a S, domenica a N. I giorni fuori dal periodo di rapporto restano N: marcarli S
     gonfierebbe ggLav — e quindi GiorniRetribuiti — con giorni che non sono in forza. */
  const fillLunSab = () => {
    upd({ giorni: lav.giorni.map(g => ({
      ...g,
      lavorato: (dowOf(g.gg) <= 5 && !fuoriRapporto(g.gg)) ? "S" : "N",
      tipoCoperturaGiorn: "", evento: null,
    })) });
  };
  const editEventInfo = (idx, infoVal) => {
    const g = lav.giorni[idx];
    if (!g.evento) return;
    upd({ giorni: lav.giorni.map((x,i)=> i===idx ? {...x, evento:{...x.evento, infoVal}} : x) });
  };
  const stateOf = (g) => g.evento?.codice === "MAL" ? "MAL" : g.evento?.codice === "MA1" ? "MA1" : g.lavorato === "S" ? "S" : "N";
  const eventiPresenti = lav.giorni.filter(g => g.evento);

  return (
    <>
      <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"10px",flexWrap:"wrap"}}>
        <div style={{fontSize:"11px",color:"#6A7282"}}>Click per ciclare: <b>N</b> → <b>S</b> → <b>MAL</b> → <b>MA1</b> → N</div>
        <button style={C.btn("s")} onClick={()=>setAll("S")}>Tutti S</button>
        <button style={C.btn("d")} onClick={()=>setAll("N")}>Tutti N</button>
        <button style={{...C.btn("s"), opacity: dataMese?1:0.45, cursor: dataMese?"pointer":"not-allowed"}}
                disabled={!dataMese} onClick={fillLunSab}
                title={dataMese ? "Lun–sab a S, domenica a N (solo nel periodo di rapporto)" : "Imposta prima Anno/Mese della denuncia"}>
          Compila Lun–Sab
        </button>
        <button style={C.btn("d")} onClick={fillGGRetr}>Auto GiorniRetribuiti</button>
      </div>
      {dataMese ? (
        <div style={{display:"grid", gridTemplateColumns:"repeat(7, minmax(0, 1fr))", gap:"4px", marginBottom:"12px", maxWidth:"420px"}}>
          {DOW_LABELS.map((d, i) => <div key={`h${d}`} style={C.dowHead(i >= 5)}>{d}</div>)}
          {/* Celle vuote fino al giorno in cui cade il GG 1. */}
          {Array.from({length: dowOf(1)}, (_, i) => <div key={`pad${i}`} />)}
          {lav.giorni.map((g, i) => {
            const st = stateOf(g);
            const dow = dowOf(g.gg);
            const fuori = fuoriRapporto(g.gg);
            return (
              <div key={i} style={C.giornoCell(st, {weekend: dow >= 5, fuori})} onClick={()=>cycleGiorno(i)}
                   title={`${DOW_LABELS[dow]} ${g.gg}: ${st}${fuori ? " — fuori dal periodo di rapporto" : ""}`}>
                <div style={{fontSize:"11px",opacity:0.75}}>{g.gg}</div>
                <div>{st}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(40px, 1fr))", gap:"4px", marginBottom:"12px"}}>
          {lav.giorni.map((g, i) => {
            const st = stateOf(g);
            return (
              <div key={i} style={C.giornoCell(st)} onClick={()=>cycleGiorno(i)} title={`Giorno ${g.gg}: ${st}`}>
                <div style={{fontSize:"11px",opacity:0.75}}>{g.gg}</div>
                <div>{st}</div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{padding:"8px 12px",background:"#F0F9FF",borderRadius:"6px",fontSize:"11px",marginBottom:"12px"}}>
        Giorni lavorati (S): <b>{ggLav}</b> · Settimane in denuncia: <b>{setts.length}</b>
        {setts.length > 0 && (
          <>
            {/* La copertura non è sempre deducibile dai giorni: una settimana può essere
                retribuita senza giorni lavorati. Quindi ogni settimana è forzabile a mano. */}
            <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginTop:"8px"}}>
              {setts.map(s => {
                const forz = !!ov[s.IdSettimana];
                return (
                  <div key={s.IdSettimana} style={{
                    display:"flex",flexDirection:"column",gap:"2px",padding:"5px 7px",borderRadius:"5px",
                    background: forz ? "#FFFBEB" : "#FFFFFF",
                    border: `1px solid ${forz ? "#FDE68A" : "#D9E3EC"}`,
                  }}>
                    <div style={{fontSize:"10px",fontWeight:"700",color:"#0369A1",fontFamily:"monospace"}}>
                      W{s.IdSettimana} = {s.TipoCopertura}{s.CodiceEvento?` (${s.CodiceEvento})`:""}
                    </div>
                    <select style={{...C.sel, fontSize:"10px", padding:"3px 5px"}}
                            value={ov[s.IdSettimana] || ""}
                            onChange={e=>setOverride(s.IdSettimana, e.target.value)}>
                      {TIPO_COPERTURA.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
            {Object.keys(ov).length > 0 && (
              <div style={{marginTop:"6px"}}>
                <button style={C.btn("d")} onClick={()=>upd({SettimaneOverride:{}})}>Riporta tutte le settimane ad auto</button>
              </div>
            )}
          </>
        )}
        <label style={{display:"flex",alignItems:"center",gap:"6px",marginTop:"8px",fontWeight:"600"}}>
          <input type="checkbox" checked={lav.EmettiSettimane !== false} onChange={e=>upd({EmettiSettimane:e.target.checked})}/>
          Emetti gli elementi <code>&lt;Settimana&gt;</code> nell'XML
        </label>
        <label style={{display:"flex",alignItems:"center",gap:"6px",marginTop:"4px",fontWeight:"600",opacity:lav.EmettiSettimane===false?0.45:1}}>
          <input type="checkbox" disabled={lav.EmettiSettimane===false} checked={lav.AdeguaSettimane !== false} onChange={e=>upd({AdeguaSettimane:e.target.checked})}/>
          Adegua automaticamente le settimane a GiorniRetribuiti (vincolo 02570E)
        </label>
        {lav.EmettiSettimane === false && (
          <div style={{marginTop:"4px",color:"#92400E"}}>
            Nessun elemento <code>&lt;Settimana&gt;</code> verrà scritto per questo lavoratore.
          </div>
        )}
      </div>

      {avvisi.length > 0 && (
        <div style={{padding:"8px 12px",background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:"6px",fontSize:"11px",marginBottom:"12px",color:"#991B1B"}}>
          <b>Possibili scarti INPS</b>
          {avvisi.map((a,i) => <div key={i} style={{marginTop:"3px"}}>⚠ {a}</div>)}
        </div>
      )}

      {eventiPresenti.length > 0 && (
        <div style={C.sec}>
          <div style={C.sT}>Info Aggiuntiva Eventi Giornalieri</div>
          {eventiPresenti.map(g => {
            const idx = lav.giorni.findIndex(x => x.gg === g.gg);
            return (
              <div key={g.gg} style={{...C.row, alignItems:"flex-end"}}>
                <div style={{minWidth:"60px", fontSize:"12px", fontWeight:"700"}}>GG {g.gg}</div>
                <F label="Codice" value={g.evento.codice} onChange={v=>upd({giorni: lav.giorni.map((x,i)=> i===idx ? {...x, evento:{...x.evento, codice:v}} : x)})} opts={[{v:"MAL",l:"MAL"},{v:"MA1",l:"MA1"}]} w="120px"/>
                <F label="Tipo Info" value={g.evento.infoTipo} onChange={v=>upd({giorni: lav.giorni.map((x,i)=> i===idx ? {...x, evento:{...x.evento, infoTipo:v}} : x)})} opts={TIPO_INFO_EVENTO} w="160px"/>
                <F label="Valore" value={g.evento.infoVal} onChange={v=>editEventInfo(idx, v)} ph={g.evento.infoTipo === "CM" ? "n.certificato" : "YYYY-MM-DD"} w="180px"/>
                <F label="Tipo Cop. Giorn." value={g.tipoCoperturaGiorn} onChange={v=>upd({giorni: lav.giorni.map((x,i)=> i===idx ? {...x, tipoCoperturaGiorn:v} : x)})} opts={[{v:"",l:"—"},{v:"0",l:"0"},{v:"1",l:"1"}]} w="120px"/>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
