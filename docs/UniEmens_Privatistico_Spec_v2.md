# UniEmens Privatistico Builder — Specifiche Tecniche v2.0

**Data analisi:** 07/05/2026  
**File di riferimento analizzati:**
- `UNIE2511.XML` — Monterosso Almo, cantieri di lavoro, 11/2025 (ente locale, formato semplice)
- `UM102256.xml` — Consulente del lavoro, multi-azienda, 03/2026 (formato completo, settore privato)

---

## 1. Differenze strutturali tra i due file campione

| Aspetto | UNIE2511 (cantieri) | UM102256 (multi-azienda) |
|---|---|---|
| `DatiMittente Tipo` | `1` (azienda) | `2` (persona fisica / consulente) |
| `SedeINPS` | presente | **assente** |
| Numero `<Azienda>` | 1 | **35+** (multi-azienda) |
| `UnitaProduttiva` | assente | `0` (presente sempre) |
| `QualProf` | assente | presente (codice ISTAT es. `5.2.2.4.0`) |
| `TipoPaga` | assente | `H` (orario) / `M` (mensile) |
| `DivisoreOrarioContr` | assente | presente (es. 17200, 17300, 16800) |
| `OrarioGiornMedioContrattuale` | assente | presente (es. 800, 666) |
| `TipoApplCongedoParOre` | assente | `N` |
| `TipoRetrMal` | assente | `1` o `2` |
| `TipoContribuzione` | assente | `00`, `H0`, `J1`, `J2`, `55` |
| `TipoLavoratore` | assente | `00`, `PB` (borsa lavoro) |
| `OreContribuite` | assente | presente |
| `SettimaneUtili` | assente | presente (es. 180, 260) |
| `OreLavorabili` | assente | presente |
| Giorni | GG="01".."30" | GG="01".."31" |
| `GiorniContribuiti` | assente | presente in alcuni |
| `InfoAggCausaliContrib` | assente | presente (DPMI, 0058) |
| `AltreADebito` | assente | presente (M701, M702) |
| `DatiParticolari / ConvBilat` | assente | presente (EBNA, EST1, ART1) |
| `ForzImpZero` | assente | attributo su DatiRetributivi |
| `EventoGiorn` (MAL, MA1) | assente | presente con TipoCoperturaGiorn |
| `DifferenzeAccredito` | assente | presente |
| `Maternita / MatACredito` | assente | presente |
| `Assunzione` | assente | presente (GiornoAssunzione, TipoAssunzione) |
| `GestioneTFR / DestinazioneTFR` | assente | presente |
| `GestioneTFR / MisureCompensative` | assente | presente |
| `ListaCollaboratori` | assente | presente (separato da PosContributiva) |
| `AltrePartiteADebito` | assente | presente in DenunciaAziendale |
| `TotaleACredito` | sempre 0 | può essere >0 |
| `ForzaAziendale` | = NumLavoratori | può differire |
| `PercPartTimeMese` | assente | presente (può differire da PercPartTime) |

---

## 2. Schema XML completo — tutti i campi reali

```xml
<DenunceMensili>
  <DatiMittente Tipo="1|2">
    <CFPersonaMittente/>
    <RagSocMittente/>
    <CFMittente/>
    <CFSoftwarehouse/>
    <SedeINPS/>            <!-- opzionale: presente se Tipo=1 -->
  </DatiMittente>

  <!-- UNA O PIÙ <Azienda> (multi-azienda per consulenti) -->
  <Azienda>
    <AnnoMeseDenuncia>YYYY-MM</AnnoMeseDenuncia>
    <CFAzienda/>
    <RagSocAzienda/>

    <!-- PosContributiva: una per matricola INPS -->
    <PosContributiva Composizione="CP">
      <Matricola/>

      <!-- N DenunciaIndividuale -->
      <DenunciaIndividuale>
        <CFLavoratore/>
        <Cognome/>
        <Nome/>
        <Qualifica1>1|2|5</Qualifica1>    <!-- 1=operaio, 2=impiegato, 5=apprendista -->
        <Qualifica2>F|P|V|M</Qualifica2>  <!-- F=full, P=part, V=verticale, M=misto -->
        <Qualifica3>D|I</Qualifica3>       <!-- D=dipendente, I=intermittente -->
        <TipoContribuzione>00|H0|J1|J2|55</TipoContribuzione>
        <RegimePost95>N|S</RegimePost95>
        <Cittadinanza>000</Cittadinanza>
        <UnitaOperativa>0</UnitaOperativa>
        <UnitaProduttiva>0</UnitaProduttiva>  <!-- opzionale -->
        <CodiceComune/>
        <CodiceContratto/>
        <TipoCodiceContratto>02</TipoCodiceContratto>
        <QualProf/>                        <!-- es. 5.2.2.4.0, opzionale -->
        <TipoPaga>H|M</TipoPaga>           <!-- opzionale -->
        <DivisoreOrarioContr/>             <!-- opzionale, es. 17200 -->
        <OrarioContrattuale/>              <!-- es. 4000 = 40h/sett -->
        <OrarioGiornMedioContrattuale/>    <!-- es. 800 = 8h/giorno -->
        <TipoApplCongedoParOre>N</TipoApplCongedoParOre>  <!-- opzionale -->
        <TipoRetrMal>1|2</TipoRetrMal>    <!-- opzionale -->
        <PercPartTime/>                    <!-- es. 4500 = 45% -->
        <PercPartTimeMese/>                <!-- opzionale, può differire da PercPartTime -->
        <NumMensilita>12000|13000|14000</NumMensilita>

        <Cessazione>                       <!-- opzionale -->
          <GiornoCessazione/>
          <TipoCessazione>1B|1C|3</TipoCessazione>
        </Cessazione>

        <Assunzione>                       <!-- opzionale -->
          <GiornoAssunzione/>
          <TipoAssunzione/>
        </Assunzione>

        <DatiRetributivi ForzImpZero="S">  <!-- attributo opzionale -->
          <TipoLavoratore>00|PB</TipoLavoratore>
          <TipoLavStat>NR00|NFOR</TipoLavStat>  <!-- opzionale -->

          <!-- Solo se TipoLavStat=NR00 e maternità -->
          <Maternita>
            <MatACredito>
              <IndMat1Fascia/>
              <IndMat2Fascia/>
            </MatACredito>
          </Maternita>

          <Imponibile/>                    <!-- assente se TipoLavStat=NR00 -->
          <Contributo/>                    <!-- assente se TipoLavStat=NR00 -->

          <!-- AltreADebito: opzionale, ripetibile -->
          <AltreADebito>
            <CausaleADebito>M701|M702</CausaleADebito>
            <NumOre/>                      <!-- o <NumGG/> -->
            <AltroImponibile/>
            <ImportoADebito/>
          </AltreADebito>

          <RetribTeorica/>
          <OreLavorabili/>                 <!-- opzionale -->

          <!-- Settimane coperte: IdSettimana = numero ISO settimana -->
          <Settimana>
            <IdSettimana/>
            <TipoCopertura>X|0|1|2</TipoCopertura>
            <!-- X=lavorato, 0=non cop., 1=maternità, 2=malattia parz. -->
            <CodiceEvento>MAL|MA1</CodiceEvento>  <!-- opzionale -->
          </Settimana>

          <!-- Giorni: sempre GG="01"..GG="30|31" -->
          <Giorno GG="01">
            <Lavorato>S|N</Lavorato>
            <TipoCoperturaGiorn>0|1</TipoCoperturaGiorn>  <!-- opzionale -->
            <EventoGiorn>                  <!-- opzionale -->
              <CodiceEventoGiorn>MAL|MA1</CodiceEventoGiorn>
              <InfoAggEvento TipoInfoAggEvento="CM|DT">...</InfoAggEvento>
            </EventoGiorn>
          </Giorno>

          <!-- DifferenzeAccredito: opzionale -->
          <DifferenzeAccredito>
            <CodiceEvento/>
            <DiffAccredito/>
            <InfoEvento>
              <MotivoEvento TipoMotivoEvento="CM">...</MotivoEvento>
              <DiffAccreditoEvento/>
            </InfoEvento>
          </DifferenzeAccredito>

          <GiorniRetribuiti/>
          <GiorniContribuiti/>             <!-- opzionale, presente se TipoPaga=M -->
          <OreContribuite/>                <!-- opzionale -->
          <RispettoMinimale>S|N</RispettoMinimale>
          <SettimaneUtili/>                <!-- opzionale -->

          <!-- InfoAggCausaliContrib: opzionale, ripetibile -->
          <InfoAggCausaliContrib>
            <CodiceCausale>DPMI|0058</CodiceCausale>
            <IdentMotivoUtilizzoCausale TipoIdentMotivoUtilizzo="DATA|PUC">...</IdentMotivoUtilizzoCausale>
            <AnnoMeseRif/>
            <ImportoAnnoMeseRif/>
          </InfoAggCausaliContrib>

          <!-- DatiParticolari: opzionale -->
          <DatiParticolari>
            <ConvBilat>
              <Conv>
                <CodConv>EBNA|EST1|ART1</CodConv>
                <Importo Periodo="YYYY-MM"/>
              </Conv>
            </ConvBilat>
          </DatiParticolari>

        </DatiRetributivi>

        <GestioneTFR>
          <!-- DestinazioneTFR: opzionale -->
          <DestinazioneTFR>
            <TipoScelta>T2</TipoScelta>
            <DataScelta/>
            <ProfiloLav>
              <IscrizPrevObbl/>
              <IscrizPrevCompl>NO</IscrizPrevCompl>
            </ProfiloLav>
            <SceltaDest>
              <SceltaTFR>
                <FondoTesoreria>NO</FondoTesoreria>
              </SceltaTFR>
            </SceltaDest>
          </DestinazioneTFR>
          <MeseTFR>
            <BaseCalcoloTFR/>
            <BaseCalcoloPrevCompl/>          <!-- opzionale -->
            <MisureCompensative>             <!-- opzionale -->
              <MisCompACredito>
                <CausaleMCACred>TF01|TF13</CausaleMCACred>
                <ImportoMCACred/>
              </MisCompACredito>
            </MisureCompensative>
          </MeseTFR>
        </GestioneTFR>
      </DenunciaIndividuale>

      <!-- DenunciaAziendale: obbligatoria, una per PosContributiva -->
      <DenunciaAziendale>
        <TrattQuotaLav>S|N</TrattQuotaLav>
        <NumLavoratori/>
        <ForzaAziendale/>       <!-- può differire da NumLavoratori -->

        <!-- AltrePartiteADebito: opzionale, ripetibile -->
        <AltrePartiteADebito>
          <CausaleADebito>M980|M900</CausaleADebito>
          <NumDip/>
          <Retribuzione/>
          <SommaADebito/>
        </AltrePartiteADebito>

        <DatiQuadraturaRetrContr>
          <NumDenIndiv/>
          <TotaleADebito/>      <!-- intero, Math.round(sum(Contributo)) -->
          <TotaleACredito/>     <!-- può essere >0 per DPMI/credits -->
        </DatiQuadraturaRetrContr>
      </DenunciaAziendale>
    </PosContributiva>

    <!-- ListaCollaboratori: opzionale, separato da PosContributiva -->
    <ListaCollaboratori>
      <CAP/>
      <ISTAT/>
      <Collaboratore>
        <CFCollaboratore/>
        <Cognome/>
        <Nome/>
        <CodiceComune/>
        <TipoRapporto>1E</TipoRapporto>
        <Imponibile/>
        <Aliquota/>
        <AltraAss/>             <!-- opzionale -->
        <Dal>YYYY-MM-DD</Dal>
        <Al>YYYY-MM-DD</Al>
      </Collaboratore>
    </ListaCollaboratori>
  </Azienda>
</DenunceMensili>
```

---

## 3. Data model interno aggiornato

```javascript
const EMPTY_CONFIG = {
  TipoMittente: "1",           // "1"=azienda, "2"=persona fisica
  CFPersonaMittente: "",
  RagSocMittente: "",
  CFMittente: "",
  CFSoftwarehouse: "",
  SedeINPS: "",                // opzionale, solo Tipo=1
};

const EMPTY_AZIENDA = {
  id: uid(),
  AnnoMese: "",                // "YYYY-MM"
  CFAzienda: "",
  RagSocAzienda: "",
  poss: [],                    // array PosContributiva
  collaboratori: [],           // array Collaboratore (ListaCollaboratori)
  CAP: "",                     // per ListaCollaboratori
  ISTAT: "",                   // per ListaCollaboratori
};

const mkPosContributiva = () => ({
  id: uid(),
  Matricola: "",
  lavoratori: [],
});

const mkLavoratore = () => ({
  id: uid(),
  // Anagrafica
  CFLavoratore: "",
  Cognome: "",
  Nome: "",
  Qualifica1: "1",             // "1"|"2"|"5"
  Qualifica2: "F",             // "F"|"P"|"V"|"M"
  Qualifica3: "D",             // "D"|"I"
  TipoContribuzione: "00",     // "00"|"H0"|"J1"|"J2"|"55"
  RegimePost95: "N",
  Cittadinanza: "000",
  UnitaOperativa: "0",
  UnitaProduttiva: "0",
  CodiceComune: "",
  CodiceContratto: "",
  TipoCodiceContratto: "02",
  QualProf: "",
  TipoPaga: "H",               // "H"|"M"
  DivisoreOrarioContr: "",     // es. "17200"
  OrarioContrattuale: "4000",
  OrarioGiornMedioContrattuale: "800",
  TipoApplCongedoParOre: "N",
  TipoRetrMal: "1",
  PercPartTime: "",
  PercPartTimeMese: "",
  NumMensilita: "14000",
  // Cessazione
  hasCessazione: false,
  GiornoCessazione: "",
  TipoCessazione: "1C",
  // Assunzione
  hasAssunzione: false,
  GiornoAssunzione: "",
  TipoAssunzione: "1",
  // DatiRetributivi
  ForzImpZero: false,
  TipoLavoratore: "00",        // "00"|"PB"
  TipoLavStat: "",             // ""|"NR00"|"NFOR"
  Imponibile: "",
  Contributo: "",
  AltreADebito: [],            // [{CausaleADebito, NumOre, NumGG, AltroImponibile, ImportoADebito}]
  RetribTeorica: "",
  OreLavorabili: "",
  giorni: Array.from({length:31}, (_,i) => ({
    gg: i+1, lavorato: "N",
    tipoCoperturaGiorn: "",    // ""|"0"|"1"
    evento: null,              // null | {codice:"MAL"|"MA1", infoTipo:"CM"|"DT", infoVal:""}
  })),
  GiorniRetribuiti: "",
  GiorniContribuiti: "",
  OreContribuite: "",
  RispettoMinimale: "N",
  SettimaneUtili: "",
  InfoAggCausali: [],          // [{CodiceCausale, TipoIdent, ValoreIdent, AnnoMeseRif, ImportoRif}]
  DatiParticolari: [],         // [{CodConv, Importo, Periodo}]
  // DifferenzeAccredito
  DifferenzeAccredito: [],     // [{CodiceEvento, DiffAccredito}]
  // Maternità
  hasMaternita: false,
  IndMat1Fascia: "",
  IndMat2Fascia: "",
  // GestioneTFR
  BaseCalcoloTFR: "",
  BaseCalcoloPrevCompl: "",
  hasDestinazioneTFR: false,
  DestinazioneTFR: null,
  MisureCompensative: [],      // [{CausaleMCACred, ImportoMCACred}]
});

const mkCollaboratore = () => ({
  id: uid(),
  CFCollaboratore: "",
  Cognome: "",
  Nome: "",
  CodiceComune: "",
  TipoRapporto: "1E",
  Imponibile: "",
  Aliquota: "",
  AltraAss: "",
  Dal: "",
  Al: "",
});
```

---

## 4. Enumerazioni rilevate dai file reali

### TipoContribuzione
- `00` — standard
- `H0` — vigilanza/istituti sicurezza
- `J1` — apprendistato regime ridotto
- `J2` — apprendistato
- `55` — ex contratti formazione lavoro

### TipoLavoratore
- `00` — standard
- `PB` — prestatore di borsa lavoro / tirocinio

### TipoCopertura settimana
- `X` — settimana lavorata
- `0` — settimana non coperta
- `1` — maternità/congedo obbligatorio
- `2` — malattia parziale nella settimana

### CodiceEvento giorno
- `MAL` — malattia, `InfoAggEvento TipoInfoAggEvento='CM'` = numero certificato
- `MA1` — maternità 1ª fascia, `InfoAggEvento TipoInfoAggEvento='DT'` = data inizio

### CodiceCausale InfoAggCausaliContrib
- `DPMI` — decontribuzione per produttività / premi
- `0058` — altro sgravio

### CausaleADebito (AltreADebito)
- `M701` — contributo aggiuntivo orario (NumOre)
- `M702` — contributo aggiuntivo giornaliero (NumGG)

### CausaleADebito (AltrePartiteADebito)
- `M980` — contributo ente bilaterale EBNA/ART1
- `M900` — fondo solidarietà

### CodConv (ContrattiCollettivi bilaterali)
- `EBNA` — ente bilaterale nazionale artigianato
- `EST1` — ente bilaterale turismo
- `ART1` — artigianato

### TipoAssunzione
- `1` — prima assunzione

### TipoCessazione
- `1B` — fine contratto a termine
- `1C` — fine contratto a termine (cantieri)
- `3` — dimissioni

---

## 5. Logiche di calcolo

### 5.1 Settimane ISO
```javascript
function calcSettimane(annoMese, giorni, maxGG) {
  // Per ogni giorno con lavorato="S" o con evento (tipoCoperturaGiorn non vuoto)
  // calcola settimana ISO e assegna TipoCopertura appropriato
  // Giorni con evento MAL → TipoCopertura="2" se c'è anche un S nella settimana, altrimenti "0"
  // Giorni con evento MA1 → TipoCopertura="1"
}
```

### 5.2 TotaleADebito
```javascript
Math.round(sum(lav.Contributo))
// NON include AltreADebito (quelle vanno in AltrePartiteADebito)
```

### 5.3 TotaleACredito
```javascript
sum(lav.InfoAggCausali.filter(c => c.CodiceCausale === 'DPMI' || c.CodiceCausale === '0058')
    .map(c => parseIt(c.ImportoRif)))
// Arrotondato a intero
```

### 5.4 OreContribuite
In caso di part-time orizzontale semplice:
```
OreContribuite = OreLavorabili × (GiorniRetribuiti / GiorniMese)
```
Valore da compilare manualmente nell'UI dato che dipende da logiche contrattuali.

### 5.5 SettimaneUtili
```
SettimaneUtili = count(settimane con TipoCopertura="X") × DivisoreSettimane
```
Dove DivisoreSettimane dipende da OrarioContrattuale (non calcolabile automaticamente).
Campo inserito manualmente nell'UI.

---

## 6. Architettura applicativa

### 6.1 Modalità operative del tool
Il file UM102256 rivela che il tool viene usato da **consulenti del lavoro** che gestiscono decine di aziende nello stesso file. Il tool deve supportare:

1. **Modalità ente/azienda singola** (Monterosso): una Azienda, una PosContributiva
2. **Modalità multi-azienda** (UM102256): N Aziende, ognuna con la propria PosContributiva e opzionale ListaCollaboratori

### 6.2 Gestione giorni
I giorni sono `GG="01"..GG="30"` o `GG="01"..GG="31"` in base al mese.
L'array `giorni` nel data model deve avere dimensione variabile (28/29/30/31) calcolata da AnnoMese.

### 6.3 Campi obbligatori vs opzionali per scope v1.0

**Obbligatori (sempre emessi)**:
- Tutti i campi anagrafici (da CFLavoratore a NumMensilita)
- DatiRetributivi: TipoLavoratore, RetribTeorica, Giorni×31/30, GiorniRetribuiti, RispettoMinimale
- GestioneTFR: BaseCalcoloTFR
- DenunciaAziendale: tutti i campi

**Opzionali scope v1.0 (parser sì, builder solo se valorizzati)**:
- QualProf, TipoPaga, DivisoreOrarioContr, OrarioGiornMedioContrattuale
- TipoApplCongedoParOre, TipoRetrMal
- OreContribuite, SettimaneUtili, GiorniContribuiti
- InfoAggCausaliContrib, DatiParticolari, AltreADebito
- ForzImpZero, TipoLavStat (solo NR00 e NFOR)
- EventoGiorn (MAL/MA1) con TipoCoperturaGiorn
- DifferenzeAccredito, Maternita
- Assunzione, DestinazioneTFR, MisureCompensative
- AltrePartiteADebito in DenunciaAziendale

**Esclusi da scope v1.0 (solo parser)**:
- ListaCollaboratori (lettura sì, builder no)
- AltreADebito avanzato (M702 con NumGG vs NumOre)

---

## 7. UI — Componenti principali

### Layout principale
```
[Header: UniEmens Privatistico Builder v1.0]
[SubHeader: Multi-azienda · Settore privato e cantieri · IVS/DS]
[Toolbar: +Azienda | +Matricola | Importa XML | Esporta XML | Reset]
┌─────────────────┬──────────────────────────────────┐
│ Lista Aziende   │ Pannello corrente                │
│ [333 S.R.L.]   │  ┌──────────────────────────┐   │
│ [BABYHOUSE]     │  │ Config Azienda           │   │
│ [BAR ELIOS]     │  └──────────────────────────┘   │
│ ...             │  ┌──────────────────────────┐   │
│                 │  │ Lista Matricole          │   │
│                 │  │  [MAT: 211394...]        │   │
│                 │  └──────────────────────────┘   │
│                 │  ┌──────────────────────────┐   │
│                 │  │ Lista Lavoratori          │   │
│                 │  │ Form Lavoratore           │   │
│                 │  └──────────────────────────┘   │
└─────────────────┴──────────────────────────────────┘
```

### Pannello Config DatiMittente (globale)
Campi: TipoMittente (1/2), CF Persona, CF Mittente, RagSoc, CF Softwarehouse, SedeINPS

### Pannello Config Azienda
Campi: AnnoMese, CFAzienda, RagSocAzienda

### Form Lavoratore — tab base
CF, Cognome, Nome | Qualifica1/2/3 | TipoContribuzione | RegimePost95
CodiceComune, CodiceContratto | QualProf, TipoPaga | OrarioContrattuale
PercPartTime | NumMensilita | TipoRetrMal | DivisoreOrarioContr
Cessazione (checkbox + campi) | Assunzione (checkbox + campi)

### Form Lavoratore — tab dati retributivi
TipoLavoratore | TipoLavStat | ForzImpZero
Imponibile, Contributo, RetribTeorica
OreLavorabili, SettimaneUtili
GiorniRetribuiti, GiorniContribuiti, OreContribuite
RispettoMinimale

### GrigliaGiorni (31 celle, variabile per mese)
Celle: S (verde) / N (grigio) / MAL (arancio) / MA1 (azzurro)
Pulsanti: Tutti S | Tutti N | Copia da precedente
Auto-calcola: GiorniRetribuiti, settimane coperte

### Form Lavoratore — tab opzionali
AltreADebito (lista editabile) | InfoAggCausaliContrib | DatiParticolari
BaseCalcoloTFR | Maternità (se TipoLavStat=NR00)

---

## 8. Export XML

### Nome file
```
UM{CFMITTENTE_LAST6}{yymm}.xml   — se multi-azienda consulente
UNIE{yymm}.xml                   — se azienda singola
```

### TotaleACredito
Calcolato automaticamente summing `ImportoAnnoMeseRif` di tutti i `InfoAggCausaliContrib` della PosContributiva.

---

## 9. Architettura tecnica

**File:** `src/UniEmensPriv.jsx` (nuovo, standalone)  
**Entry:** `priv.html`  
**Stima righe v1.0:** ~900-1.100 (base senza funzionalità eventi malattia/maternità avanzate)  
**Stima righe v1.1:** ~1.300 (con EventoGiorn, DifferenzeAccredito, AltreADebito completo)

**Raccomandazione scope v1.0:** implementare parser completo (round-trip) ma builder solo per le strutture obbligatorie e le opzionali comuni (InfoAggCausali, DatiParticolari, AltreADebito M701). EventoGiorn MAL/MA1 in lettura, non in scrittura.
