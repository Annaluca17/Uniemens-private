# UniEmens Privatistico Builder

Compilazione assistita di flussi UniEmens del settore **privato** (denunce
individuali: dati retributivi, settimane, TipoLavStat, calendario giornaliero).
Tutto nel browser, nessun server.

Il builder per i flussi a variazione e le DMA2 degli enti pubblici è un
progetto distinto, in `../uniemens-builder-dma2`: i due non condividono codice.

## Avvio

```bash
npm install
npm run dev
```

Altri comandi: `npm run build`, `npm run preview`.

## Versione standalone

`standalone.html` è un unico file HTML auto-contenuto (React + Babel + sorgente
inline) che si apre con doppio click, senza Node né Vite — è la forma in cui il
tool viene consegnato a chi non ha un ambiente di sviluppo. Va **rigenerato dopo
ogni modifica** a `src/UniEmensPriv.jsx`:

```bash
powershell -File build-standalone.ps1
```

## Import periodi (una persona, molti mesi)

Per le ricostruzioni di periodi scoperti: un flusso per ogni mese, tutti uguali
tranne due numeri. `Import periodi` prende anagrafica, qualifiche, matricola e
frontespizio dal lavoratore gia' caricato, e dall'incolla legge solo cio' che
cambia — una riga per mese:

```
Mese      Imponibile   Aliquota %   Giorni retribuiti
2020-12   1062,61      1,61         26
2021-01   950,09
```

Aliquota e giorni sono opzionali (default 1,61% e 26). Il separatore e' il TAB —
quello che Excel mette negli appunti quando copi un intervallo — oppure il punto
e virgola del CSV italiano; la virgola resta il decimale.

**L'imponibile va scritto coi centesimi.** Nell'XML `<Imponibile>` ci finisce
intero, ma il contributo si calcola sul valore reale: su 951,56 fa 15,32, mentre
partendo da 952 farebbe 15,33, e sui flussi trasmessi vale il primo. La divergenza
capita circa una volta su venti.

I giorni sono da calendario, lunedi-sabato lavorati. `GiorniRetribuiti` resta
invece quello dichiarato, anche quando i giorni di calendario sono meno (febbraio).

Prima di produrre qualsiasi cosa compare l'anteprima riga per riga con imponibile,
contributo, settimane e giorni dedotti, piu' l'esito dei controlli — gli stessi
`validaLav` e `checkSettimane` del resto del builder, non una seconda copia delle
regole. Le righe con errori bloccanti (anagrafica incompleta, 07780E, mese
ripetuto) spengono il pulsante; resta la possibilita' di generare solo le valide.
Gli avvisi non bloccano: un 02570E, per esempio, si vede ma si puo' accettare.

L'uscita e' un unico ZIP con dentro un file per mese (`UNIE2012.xml`,
`UNIE2101.xml`, ...). Lo ZIP e' scritto senza compressione dal builder stesso, per
non aggiungere una libreria a uno standalone che pesa gia' 3 MB.

Il caso opposto — un mese, molti lavoratori — non passa di qui: li' cambia la
struttura di ogni lavoratore, e conviene importare l'XML del mese precedente e
ritoccare i valori.

## Struttura

```
src/UniEmensPriv.jsx   componente React: parser XML, validazione,
                       generatore XML, import periodi, scrittore ZIP, UI
src/periodi.test.js    test sull'import periodi, confrontati con flussi reali
src/mainPriv.jsx       entry point
vendor/                React, ReactDOM e Babel per la build standalone
docs/                  specifica privatistica e prompt di partenza
samples/               XML di prova ed esiti errore del validatore INPS
_archivio/             copie superate (vedi il LEGGIMI lì dentro)
```
