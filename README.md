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

## Struttura

```
src/UniEmensPriv.jsx   componente React: parser XML, validazione,
                       generatore XML, UI
src/mainPriv.jsx       entry point
vendor/                React, ReactDOM e Babel per la build standalone
docs/                  specifica privatistica e prompt di partenza
samples/               XML di prova ed esiti errore del validatore INPS
_archivio/             copie superate (vedi il LEGGIMI lì dentro)
```
