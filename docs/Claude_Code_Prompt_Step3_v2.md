# Prompt Claude Code — Step 3 v2.0: UniEmens Privatistico Builder

## CONTESTO
Repository: `Annaluca17/uniemens-builder`
Stack: React 18 + Vite 5 + JSX puro (no TypeScript, no Tailwind)
Stili: inline con oggetto C costante (identico a UniEmensBuilder.jsx)
File esistente da NON toccare: `src/UniEmensBuilder.jsx`, `index.html`

File di riferimento schema (allegati o in `/path/al/repo`):
- `UNIE2511.XML` — cantieri ente locale (struttura semplice)
- `UM102256.xml` — multi-azienda consulente (struttura completa)

---

## FASE 0 — Lettura preventiva obbligatoria

Leggere integralmente `src/UniEmensBuilder.jsx` per estrarre:
- Oggetto C con costanti CSS complete
- Utility: uid(), round2(), toIt(), parseIt(), esc()
- Componente F (field input generico con label/opts/onChange/w)
- Sistema btn(variant) con varianti p/s/x/w/d
- Pattern layout generale (header, toolbar, pannello a due colonne)

Usare queste come base identica per garantire coerenza visiva.

---

## FASE 1 — Scaffolding multi-entry Vite

### 1a. Creare `priv.html`
Copia di `index.html` con:
- `<title>UniEmens Privatistico Builder</title>`
- `<script type="module" src="/src/UniEmensPriv.jsx"></script>`

### 1b. Aggiornare `vite.config.js`
```javascript
import { resolve } from 'path'
// In defineConfig:
build: {
  rollupOptions: {
    input: {
      main: resolve(__dirname, 'index.html'),
      priv: resolve(__dirname, 'priv.html'),
    }
  }
}
```

**Verifica:** `npm run build` → due bundle compilati, nessun errore.

---

## FASE 2 — Data model completo

```javascript
// ── Costanti ─────────────────────────────────────────────────────────────
const TIPO_Q1 = [{v:"1",l:"1 – Operaio"},{v:"2",l:"2 – Impiegato"},{v:"5",l:"5 – Apprendista"}];
const TIPO_Q2 = [{v:"F",l:"F – Full time"},{v:"P",l:"P – Part time orizz."},{v:"V",l:"V – Part time vert."},{v:"M",l:"M – Part time misto"}];
const TIPO_Q3 = [{v:"D",l:"D – Dipendente"},{v:"I",l:"I – Intermittente"}];
const TIPO_CONTRIB = [{v:"00",l:"00 – Standard"},{v:"H0",l:"H0 – Vigilanza"},{v:"J1",l:"J1 – Apprendistato ridotto"},{v:"J2",l:"J2 – Apprendistato"},{v:"55",l:"55 – Ex CFL"}];
const TIPO_LAV = [{v:"00",l:"00 – Standard"},{v:"PB",l:"PB – Borsa lavoro"}];
const TIPO_LAVSTAT = [{v:"",l:"— standard"},{v:"NR00",l:"NR00 – Non retribuito"},{v:"NFOR",l:"NFOR – Non formale"}];
const TIPO_PAGA = [{v:"H",l:"H – Orario"},{v:"M",l:"M – Mensile"}];
const TIPO_MENS = [{v:"12000",l:"12 mensilità"},{v:"13000",l:"13 mensilità"},{v:"14000",l:"14 mensilità"}];
const TIPO_CESS = [{v:"1B",l:"1B – Fine TD"},{v:"1C",l:"1C – Fine TD (cantiere)"},{v:"3",l:"3 – Dimissioni"}];

// ── Numero giorni del mese ────────────────────────────────────────────────
function giorniMese(annoMese) {
  if (!annoMese) return 30;
  const [y, m] = annoMese.split("-").map(Number);
  return new Date(y, m, 0).getDate(); // es. 31 per marzo
}

// ── Factory lavoratore ────────────────────────────────────────────────────
const mkLav = (annoMese = "") => ({
  id: uid(),
  CFLavoratore: "", Cognome: "", Nome: "",
  Qualifica1: "1", Qualifica2: "F", Qualifica3: "D",
  TipoContribuzione: "00", RegimePost95: "N",
  Cittadinanza: "000", UnitaOperativa: "0", UnitaProduttiva: "0",
  CodiceComune: "", CodiceContratto: "", TipoCodiceContratto: "02",
  QualProf: "", TipoPaga: "H",
  DivisoreOrarioContr: "", OrarioContrattuale: "4000",
  OrarioGiornMedioContrattuale: "800",
  TipoApplCongedoParOre: "N", TipoRetrMal: "1",
  PercPartTime: "", PercPartTimeMese: "",
  NumMensilita: "14000",
  hasCessazione: false, GiornoCessazione: "", TipoCessazione: "1C",
  hasAssunzione: false, GiornoAssunzione: "", TipoAssunzione: "1",
  ForzImpZero: false,
  TipoLavoratore: "00", TipoLavStat: "",
  Imponibile: "", Contributo: "",
  AltreADebito: [],          // [{id,CausaleADebito,NumOre,NumGG,AltroImponibile,ImportoADebito}]
  RetribTeorica: "", OreLavorabili: "",
  giorni: Array.from({length: giorniMese(annoMese) || 30}, (_,i) => ({
    gg: i+1, lavorato: "N",
    tipoCoperturaGiorn: "",    // "" | "0" | "1"
    evento: null,              // null | {codice:"MAL"|"MA1", infoTipo:"CM"|"DT", infoVal:""}
  })),
  GiorniRetribuiti: "", GiorniContribuiti: "", OreContribuite: "",
  RispettoMinimale: "N", SettimaneUtili: "",
  InfoAggCausali: [],  // [{id,CodiceCausale,TipoIdent,ValoreIdent,AnnoMeseRif,ImportoRif}]
  DatiParticolari: [], // [{id,CodConv,Importo,Periodo}]
  DifferenzeAccredito: [], // [{CodiceEvento,DiffAccredito}]
  hasMaternita: false, IndMat1Fascia: "", IndMat2Fascia: "",
  BaseCalcoloTFR: "", BaseCalcoloPrevCompl: "",
  hasDestinazioneTFR: false,
  MisureCompensative: [],
});

const mkPos = () => ({ id: uid(), Matricola: "", lavoratori: [] });

const mkAzienda = () => ({
  id: uid(), AnnoMese: "", CFAzienda: "", RagSocAzienda: "",
  poss: [mkPos()],
  collaboratori: [], CAP: "", ISTAT: "",
});

const EMPTY_CFG = {
  TipoMittente: "1",
  CFPersonaMittente: "", RagSocMittente: "",
  CFMittente: "", CFSoftwarehouse: "", SedeINPS: "",
};
```

**Stato root del componente App:**
```javascript
const [cfg, setCfg] = useState(EMPTY_CFG);
const [aziende, setAziende] = useState([mkAzienda()]);
const [xAz, setXAz] = useState(null);      // id azienda selezionata
const [xPos, setXPos] = useState(null);    // id PosContributiva selezionata
const [xLav, setXLav] = useState(null);    // id lavoratore selezionato
```

---

## FASE 3 — Utility functions

### 3a. Settimane ISO con TipoCopertura
```javascript
function calcSettimane(annoMese, giorni) {
  if (!annoMese) return [];
  const [y, m] = annoMese.split("-").map(Number);
  const settMap = new Map();

  giorni.forEach(({gg, lavorato, tipoCoperturaGiorn, evento}) => {
    const d = new Date(y, m-1, gg);
    // Calcolo settimana ISO
    const tmp = new Date(d);
    tmp.setHours(0,0,0,0);
    tmp.setDate(tmp.getDate() + 3 - (tmp.getDay() + 6) % 7);
    const week1 = new Date(tmp.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((tmp - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);

    if (!settMap.has(weekNum)) settMap.set(weekNum, {X:0, MAT:0, MAL:0, N:0});
    const s = settMap.get(weekNum);
    if (lavorato === "S") s.X++;
    else if (evento?.codice === "MA1") s.MAT++;
    else if (evento?.codice === "MAL") s.MAL++;
    else s.N++;
  });

  return [...settMap.entries()]
    .sort((a,b) => a[0]-b[0])
    .map(([id, cnt]) => {
      let tc = "0";
      if (cnt.MAT > 0 && cnt.X === 0) tc = "1";
      else if (cnt.MAL > 0 && cnt.X > 0) tc = "2";
      else if (cnt.X > 0) tc = "X";
      const codEv = (tc === "1") ? "MA1" : (tc === "2") ? "MAL" : null;
      return {IdSettimana: id, TipoCopertura: tc, CodiceEvento: codEv};
    });
}
```

### 3b. Calcolo TotaleADebito e TotaleACredito
```javascript
function calcTotDebito(lavs) {
  return Math.round(lavs.reduce((s,l) => s + (parseIt(l.Contributo)||0), 0));
}
function calcTotCredito(lavs) {
  return Math.round(lavs.reduce((s,l) =>
    s + l.InfoAggCausali.reduce((ss,c) => ss + (parseIt(c.ImportoRif)||0), 0), 0));
}
```

---

## FASE 4 — Parser XML (`parsePrivXML`)

Funzione che accetta stringa XML e restituisce `{cfg, aziende}`.

Struttura da parsare:
```
DenunceMensili
  → DatiMittente[@Tipo] → CFPersonaMittente, RagSocMittente, CFMittente, SedeINPS
  → Azienda[] →
      AnnoMeseDenuncia, CFAzienda, RagSocAzienda
      PosContributiva[] →
          Matricola
          DenunciaIndividuale[] →
              tutti i campi anagrafici
              DatiRetributivi[@ForzImpZero] →
                  TipoLavoratore, TipoLavStat, Imponibile, Contributo
                  AltreADebito[] (CausaleADebito, NumOre/NumGG, AltroImponibile, ImportoADebito)
                  RetribTeorica, OreLavorabili
                  Settimana[] (ignorare — ricalcolato al momento dell'export)
                  Giorno[@GG] → Lavorato, TipoCoperturaGiorn, EventoGiorn
                  GiorniRetribuiti, GiorniContribuiti, OreContribuite
                  RispettoMinimale, SettimaneUtili
                  InfoAggCausaliContrib[] → CodiceCausale, IdentMotivoUtilizzoCausale[@TipoIdentMotivoUtilizzo], AnnoMeseRif, ImportoAnnoMeseRif
                  DatiParticolari/ConvBilat/Conv[] → CodConv, Importo[@Periodo]
                  DifferenzeAccredito[] → CodiceEvento, DiffAccredito
                  Maternita/MatACredito → IndMat1Fascia, IndMat2Fascia
              GestioneTFR → BaseCalcoloTFR, BaseCalcoloPrevCompl, DestinazioneTFR (flag)
          DenunciaAziendale → (ignorato in import, ricalcolato)
      ListaCollaboratori → CAP, ISTAT, Collaboratore[]

CRITICO: i giorni GG nel file possono avere leading zero ("01") o no ("1").
Normalizzare gg = parseInt(attr).
```

**Comportamento su import:**
- Settimane XML: **ignorare** (ricalcolo automatico al momento dell'export)
- DenunciaAziendale: **ignorare** (ricalcolo automatico)
- ListaCollaboratori: leggere e conservare, ma non editabile nella v1.0
- File misti con ListaPosPA: ignorare la sezione ListaPosPA

---

## FASE 5 — Builder XML (`buildPrivXML`)

```javascript
function buildPrivXML(cfg, aziende) {
  let x = `<?xml version="1.0" encoding="UTF-8"?>\n<DenunceMensili>\n`;

  // DatiMittente
  x += `  <DatiMittente Tipo="${esc(cfg.TipoMittente)}">\n`;
  x += `    <CFPersonaMittente>${esc(cfg.CFPersonaMittente)}</CFPersonaMittente>\n`;
  x += `    <RagSocMittente>${esc(cfg.RagSocMittente)}</RagSocMittente>\n`;
  x += `    <CFMittente>${esc(cfg.CFMittente)}</CFMittente>\n`;
  x += `    <CFSoftwarehouse>${esc(cfg.CFSoftwarehouse)}</CFSoftwarehouse>\n`;
  if (cfg.SedeINPS) x += `    <SedeINPS>${esc(cfg.SedeINPS)}</SedeINPS>\n`;
  x += `  </DatiMittente>\n`;

  for (const az of aziende) {
    const maxGG = giorniMese(az.AnnoMese);
    x += `  <Azienda>\n`;
    x += `    <AnnoMeseDenuncia>${esc(az.AnnoMese)}</AnnoMeseDenuncia>\n`;
    x += `    <CFAzienda>${esc(az.CFAzienda)}</CFAzienda>\n`;
    x += `    <RagSocAzienda>${esc(az.RagSocAzienda)}</RagSocAzienda>\n`;

    for (const pos of az.poss) {
      x += `    <PosContributiva Composizione="CP">\n`;
      x += `      <Matricola>${esc(pos.Matricola)}</Matricola>\n`;

      for (const lav of pos.lavoratori) {
        x += `      <DenunciaIndividuale>\n`;
        // Campi anagrafici in ordine schema
        // ...CF, Cognome, Nome, Qualifica1..3, TipoContribuzione...
        // QualProf: emetti solo se valorizzato
        // TipoPaga, DivisoreOrarioContr: emetti solo se valorizzati
        // OrarioContrattuale, OrarioGiornMedioContrattuale: sempre
        // TipoApplCongedoParOre: solo se valorizzato
        // TipoRetrMal: sempre
        // PercPartTime: solo se valorizzato
        // PercPartTimeMese: solo se valorizzato E diverso da PercPartTime
        // NumMensilita: sempre
        // Cessazione: solo se hasCessazione
        // Assunzione: solo se hasAssunzione

        // DatiRetributivi
        const forzAttr = lav.ForzImpZero ? ' ForzImpZero="S"' : '';
        x += `        <DatiRetributivi${forzAttr}>\n`;
        x += `          <TipoLavoratore>${esc(lav.TipoLavoratore)}</TipoLavoratore>\n`;
        if (lav.TipoLavStat) x += `          <TipoLavStat>${esc(lav.TipoLavStat)}</TipoLavStat>\n`;

        // Maternità (se NR00 + hasMaternita)
        if (lav.TipoLavStat === "NR00" && lav.hasMaternita) {
          // emetti Maternita/MatACredito
        }

        // Imponibile/Contributo: solo se TipoLavStat !== "NR00"
        if (lav.TipoLavStat !== "NR00") {
          if (lav.Imponibile) x += `          <Imponibile>${esc(lav.Imponibile)}</Imponibile>\n`;
          if (lav.Contributo) x += `          <Contributo>${esc(lav.Contributo)}</Contributo>\n`;
        }

        // AltreADebito
        for (const ad of lav.AltreADebito) {
          x += `          <AltreADebito>\n`;
          x += `            <CausaleADebito>${esc(ad.CausaleADebito)}</CausaleADebito>\n`;
          if (ad.CausaleADebito === "M701" && ad.NumOre)
            x += `            <NumOre>${esc(ad.NumOre)}</NumOre>\n`;
          if (ad.CausaleADebito === "M702" && ad.NumGG)
            x += `            <NumGG>${esc(ad.NumGG)}</NumGG>\n`;
          if (ad.AltroImponibile) x += `            <AltroImponibile>${esc(ad.AltroImponibile)}</AltroImponibile>\n`;
          if (ad.ImportoADebito) x += `            <ImportoADebito>${esc(ad.ImportoADebito)}</ImportoADebito>\n`;
          x += `          </AltreADebito>\n`;
        }

        x += `          <RetribTeorica>${esc(lav.RetribTeorica)}</RetribTeorica>\n`;
        if (lav.OreLavorabili) x += `          <OreLavorabili>${esc(lav.OreLavorabili)}</OreLavorabili>\n`;

        // Settimane: auto-calcolate
        const setts = calcSettimane(az.AnnoMese, lav.giorni);
        for (const s of setts) {
          x += `          <Settimana>\n`;
          x += `            <IdSettimana>${s.IdSettimana}</IdSettimana>\n`;
          x += `            <TipoCopertura>${s.TipoCopertura}</TipoCopertura>\n`;
          if (s.CodiceEvento) x += `            <CodiceEvento>${s.CodiceEvento}</CodiceEvento>\n`;
          x += `          </Settimana>\n`;
        }

        // Giorni: GG="01".."30|31"
        for (const g of lav.giorni) {
          const ggStr = String(g.gg).padStart(2, "0");
          if (g.tipoCoperturaGiorn || g.evento) {
            // Giorno con evento
            x += `          <Giorno GG="${ggStr}">\n`;
            x += `            <Lavorato>${g.lavorato}</Lavorato>\n`;
            if (g.tipoCoperturaGiorn) x += `            <TipoCoperturaGiorn>${g.tipoCoperturaGiorn}</TipoCoperturaGiorn>\n`;
            if (g.evento) {
              x += `            <EventoGiorn>\n`;
              x += `              <CodiceEventoGiorn>${g.evento.codice}</CodiceEventoGiorn>\n`;
              x += `              <InfoAggEvento TipoInfoAggEvento="${g.evento.infoTipo}">${esc(g.evento.infoVal)}</InfoAggEvento>\n`;
              x += `            </EventoGiorn>\n`;
            }
            x += `          </Giorno>\n`;
          } else {
            x += `          <Giorno GG="${ggStr}"><Lavorato>${g.lavorato}</Lavorato></Giorno>\n`;
          }
        }

        // DifferenzeAccredito
        for (const da of lav.DifferenzeAccredito) {
          x += `          <DifferenzeAccredito>\n`;
          x += `            <CodiceEvento>${esc(da.CodiceEvento)}</CodiceEvento>\n`;
          x += `            <DiffAccredito>${esc(da.DiffAccredito)}</DiffAccredito>\n`;
          x += `          </DifferenzeAccredito>\n`;
        }

        x += `          <GiorniRetribuiti>${esc(lav.GiorniRetribuiti)}</GiorniRetribuiti>\n`;
        if (lav.GiorniContribuiti) x += `          <GiorniContribuiti>${esc(lav.GiorniContribuiti)}</GiorniContribuiti>\n`;
        if (lav.OreContribuite) x += `          <OreContribuite>${esc(lav.OreContribuite)}</OreContribuite>\n`;
        x += `          <RispettoMinimale>${esc(lav.RispettoMinimale)}</RispettoMinimale>\n`;
        if (lav.SettimaneUtili) x += `          <SettimaneUtili>${esc(lav.SettimaneUtili)}</SettimaneUtili>\n`;

        // InfoAggCausaliContrib
        for (const c of lav.InfoAggCausali) {
          x += `          <InfoAggCausaliContrib>\n`;
          x += `            <CodiceCausale>${esc(c.CodiceCausale)}</CodiceCausale>\n`;
          x += `            <IdentMotivoUtilizzoCausale TipoIdentMotivoUtilizzo="${esc(c.TipoIdent)}">${esc(c.ValoreIdent)}</IdentMotivoUtilizzoCausale>\n`;
          x += `            <AnnoMeseRif>${esc(c.AnnoMeseRif)}</AnnoMeseRif>\n`;
          x += `            <ImportoAnnoMeseRif>${esc(c.ImportoRif)}</ImportoAnnoMeseRif>\n`;
          x += `          </InfoAggCausaliContrib>\n`;
        }

        // DatiParticolari
        if (lav.DatiParticolari.length > 0) {
          x += `          <DatiParticolari><ConvBilat>\n`;
          for (const dp of lav.DatiParticolari) {
            x += `            <Conv><CodConv>${esc(dp.CodConv)}</CodConv>`;
            x += `<Importo Periodo="${esc(dp.Periodo)}">${esc(dp.Importo)}</Importo></Conv>\n`;
          }
          x += `          </ConvBilat></DatiParticolari>\n`;
        }

        x += `        </DatiRetributivi>\n`;

        // GestioneTFR
        x += `        <GestioneTFR>\n`;
        if (lav.hasDestinazioneTFR) { /* emetti DestinazioneTFR */ }
        x += `          <MeseTFR>\n`;
        x += `            <BaseCalcoloTFR>${esc(lav.BaseCalcoloTFR)}</BaseCalcoloTFR>\n`;
        if (lav.BaseCalcoloPrevCompl) x += `            <BaseCalcoloPrevCompl>${esc(lav.BaseCalcoloPrevCompl)}</BaseCalcoloPrevCompl>\n`;
        if (lav.MisureCompensative.length > 0) {
          x += `            <MisureCompensative>\n`;
          for (const mc of lav.MisureCompensative) {
            x += `              <MisCompACredito>`;
            x += `<CausaleMCACred>${esc(mc.CausaleMCACred)}</CausaleMCACred>`;
            x += `<ImportoMCACred>${esc(mc.ImportoMCACred)}</ImportoMCACred>`;
            x += `</MisCompACredito>\n`;
          }
          x += `            </MisureCompensative>\n`;
        }
        x += `          </MeseTFR>\n`;
        x += `        </GestioneTFR>\n`;
        x += `      </DenunciaIndividuale>\n`;
      } // fine lavoratori

      // DenunciaAziendale (auto-calcolata)
      const nLav = pos.lavoratori.length;
      const totDeb = calcTotDebito(pos.lavoratori);
      const totCred = calcTotCredito(pos.lavoratori);
      x += `      <DenunciaAziendale>\n`;
      x += `        <TrattQuotaLav>S</TrattQuotaLav>\n`;
      x += `        <NumLavoratori>${nLav}</NumLavoratori>\n`;
      x += `        <ForzaAziendale>${nLav}</ForzaAziendale>\n`;
      x += `        <DatiQuadraturaRetrContr>\n`;
      x += `          <NumDenIndiv>${nLav}</NumDenIndiv>\n`;
      x += `          <TotaleADebito>${totDeb}</TotaleADebito>\n`;
      x += `          <TotaleACredito>${totCred}</TotaleACredito>\n`;
      x += `        </DatiQuadraturaRetrContr>\n`;
      x += `      </DenunciaAziendale>\n`;
      x += `    </PosContributiva>\n`;
    } // fine poss

    // ListaCollaboratori (se presenti, solo round-trip — NON editabile)
    // Conservare esattamente come importato

    x += `  </Azienda>\n`;
  } // fine aziende

  x += `</DenunceMensili>`;
  return x;
}
```

---

## FASE 6 — UI

### Struttura layout
```
Header:   ⬛ UniEmens Privatistico Builder v1.0
SubHeader: Multi-azienda · Settore privato · IVS/DS
Toolbar:  [+Azienda] [+Matricola] [Importa XML] [Esporta XML] [Reset]

Layout due colonne:
  Colonna sinistra (280px):
    Lista aziende con badge lavoratori e TotDebito
    Dentro azienda selezionata: lista matricole
    Dentro matricola selezionata: lista lavoratori
  Colonna destra (flex):
    se xLav: form lavoratore + griglia giorni
    else if xPos: riepilogo PosContributiva
    else if xAz: form configurazione azienda
    else: form DatiMittente
```

### Form DatiMittente
- TipoMittente (select 1/2)
- CF Persona Mittente, Rag.Soc. Mittente, CF Mittente
- CF Softwarehouse, SedeINPS (visibile solo se TipoMittente=1)

### Form configurazione azienda
- AnnoMese (input YYYY-MM), CF Azienda, Ragione Sociale Azienda

### Form lavoratore — struttura a 3 sezioni collassabili
**Sezione 1: Anagrafica e contratto**
CF | Cognome | Nome
Qualifica1 (Q1) | Qualifica2 (Q2) | Qualifica3 (Q3)
TipoContribuzione | RegimePost95 | NumMensilita
CodiceComune | CodiceContratto | QualProf
TipoPaga | DivisoreOrarioContr | OrarioContrattuale | OrarioGiornMedio
TipoRetrMal | PercPartTime | PercPartTimeMese
[checkbox Cessazione] → GiornoCessazione + TipoCessazione
[checkbox Assunzione] → GiornoAssunzione + TipoAssunzione

**Sezione 2: Dati retributivi**
TipoLavoratore | TipoLavStat | [checkbox ForzImpZero]
Imponibile | Contributo | RetribTeorica (nascosti se TipoLavStat=NR00)
OreLavorabili | OreContribuite | SettimaneUtili
GiorniRetribuiti | GiorniContribuiti | RispettoMinimale
BaseCalcoloTFR
[se hasMaternita: IndMat1Fascia + IndMat2Fascia]

**Sezione 3: Opzionali**
AltreADebito: lista con pulsante + per aggiungere righe
  per ogni riga: CausaleADebito | NumOre/NumGG | AltroImponibile | ImportoADebito
InfoAggCausali: lista editabile
  per ogni riga: CodiceCausale | TipoIdent(DATA/PUC) | ValoreIdent | AnnoMeseRif | ImportoRif
DatiParticolari: lista editabile
  per ogni riga: CodConv | Importo | Periodo

### GrigliaGiorni
- Celle in numero variabile: giorniMese(az.AnnoMese) celle
- Colori: lavorato=S → verde; N → grigio; evento MAL → arancio; evento MA1 → azzurro
- Click toggle: S ↔ N
- Click lungo (o doppio click): apre mini-popup per assegnare evento MAL/MA1
- Pulsanti: [Tutti S] [Tutti N]
- Footer griglia: "Giorni lavorati: X / Settimane: Y"
- Aggiornamento real-time GiorniRetribuiti con auto-fill sul campo

---

## FASE 7 — Import XML

Pulsante "Importa XML" → file input → parsePrivXML:
- Parsing completo del file (incluse multi-azienda)
- Modal di selezione: mostra struttura aziende/lavoratori
- Opzioni: [Sostituisci tutto] / [Aggiungi aziende]
- Gestione file misti (ListaPosPA ignorata, solo PosContributiva)
- Gestione attributi con spazi nel nome (es. `TipoIdentMotivoUtilizzo='DATA' ` con trailing space)

**ATTENZIONE parser:** gli attributi XML nel file UM102256 hanno talvolta spazi prima di `>`.
Usare `querySelector` / `getAttribute` standard che gestiscono questo correttamente.

---

## FASE 8 — Export XML

Pulsante "Esporta XML" → buildPrivXML → download.
Nome file: `UM{yymm}.xml`
dove yymm = anno2cifre + mese2cifre della prima Azienda.
Esempio: AnnoMese="2026-03" → `UM2603.xml`

---

## VALIDAZIONE OBBLIGATORIA

1. `npm run build` → entrambi i bundle (main + priv) senza errori
2. Import UNIE2511.XML → verifica 18 lavoratori, 2 PosContributiva, giorni corretti
3. Import UM102256.xml → verifica 35+ aziende, lavoratori con eventi (MAL, MA1), InfoAggCausali
4. Export round-trip: importa → esporta → confronta struttura XML
   - TotaleADebito deve matchare il file originale (es. 472 per Monterosso prima PosContributiva)
   - Settimane ricalcolate devono corrispondere ai giorni S del lavoratore
5. Test calcolo settimane ISO:
   - Marzo 2026, gg 1,2,3,4,5,6,7 tutti S → settimana 10 TipoCopertura="X" ✓
   - Giorno 21 MAL + altri S nella settimana → TipoCopertura="2" ✓
6. Verifica che `src/UniEmensBuilder.jsx` e `index.html` siano invariati

---

## OUTPUT ATTESO

File creati/modificati:
- `src/UniEmensPriv.jsx` (nuovo, ~900-1100 righe)
- `priv.html` (nuovo)
- `vite.config.js` (aggiornato con multi-entry)

File NON modificati:
- `src/UniEmensBuilder.jsx`
- `index.html`
- `package.json`
