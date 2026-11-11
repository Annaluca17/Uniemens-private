import { describe, expect, it } from 'vitest';
import {
  leggiEstrazioneVoci, vociImponibile, periodiDaEstrazione,
  parsePeriodi, costruisciPeriodo,
} from './UniEmensPriv.jsx';

/* Estrazione voci di fantasia, nella forma che esce dal gestionale: un .xls che e' una
   tabella HTML. Nomi e codici fiscali sono inventati (repo pubblico). */
const INTEST = ['Ente', 'Matr.', 'Anno', 'Mese', 'Nome', 'Cod.fis.', 'Comune/Regione', 'Liv.', 'Voce',
  'Ore o gg', 'Importo', 'Imponibile', 'Contr.Ente', 'Contr.Dipendente', 'Tipo rapporto', 'Posto lavoro', 'Posiz.INAIL'];
const ROSSI = ['1', '60', 'ROSSI MARIO', 'RSSMRA80A01H501U'];
const BIANCHI = ['1', '70', 'BIANCHI ANNA', 'BNCNNA85C41H501C'];
const riga = ([ente, matr, nome, cf], anno, mese, voce, gg, importo, imponibile, tipo) =>
  [ente, matr, anno, mese, nome, cf, '&nbsp;', 'EX-D5', voce, gg, importo, imponibile, '0,00', '0,00', tipo, '0-', '0'];
const html = (righe) => '<html><body><table><tr><td>Estrazione voci</td><td>11-11-2026 -</td><td>09:46:56</td></tr>' +
  [INTEST, ...righe].map(r => '<tr>' + r.map(c => `<td class="W">${c}</td>`).join('') + '</tr>').join('\r\n') +
  '</table></body></html>';

const ESTRAZIONE = html([
  // settembre: due mensilita' pagate insieme
  riga(ROSSI, 2024, 9, '304-retribuzione mensile', '52,00', '1.698,32', '0,00', '2-TD'),
  riga(ROSSI, 2024, 9, '8103-impon. inps', '0,00', '0,00', '1.698,32', '2-TD'),
  riga(ROSSI, 2024, 9, '8118-ritenute c.p.d.e.l.', '0,00', '0,00', '1.698,32', '2-TD'),
  riga(ROSSI, 2024, 10, '304-retribuzione mensile', '26,00', '849,16', '0,00', '2-TD'),
  riga(ROSSI, 2024, 10, '8103-impon. inps', '0,00', '0,00', '849,16', '2-TD'),
  // il figurativo CPDEL gonfia la 8118 ma non la 8103
  riga(ROSSI, 2024, 10, '8118-ritenute c.p.d.e.l.', '0,00', '0,00', '849,16', '2-TD'),
  riga(ROSSI, 2024, 10, '8118-ritenute c.p.d.e.l.', '0,00', '0,00', '12,50', '2-TD'),
  // novembre: solo addizionali, nessun imponibile
  riga(ROSSI, 2024, 11, '1711-rata addiz.regionale', '0,00', '21,00', '0,00', '2-TD'),
  riga(BIANCHI, 2024, 10, '304-retribuzione mensile', '26,00', '1.500,00', '0,00', '1-TI'),
  riga(BIANCHI, 2024, 10, '8103-impon. inps', '0,00', '0,00', '1.500,00', '1-TI'),
]);

describe('lettura dell\'Estrazione voci Halley', () => {
  const { persone } = leggiEstrazioneVoci(ESTRAZIONE);
  const rossi = persone.find(p => p.cf === 'RSSMRA80A01H501U');

  it('raggruppa per codice fiscale, in ordine di nome', () => {
    expect(persone.map(p => p.nome)).toEqual(['BIANCHI ANNA', 'ROSSI MARIO']);
    expect(Object.keys(rossi.mesi).sort()).toEqual(['2024-09', '2024-10', '2024-11']);
  });

  it('legge gli importi con il punto delle migliaia', () => {
    expect(rossi.mesi['2024-09'].voci['8103'].imponibile).toBe(1698.32);
  });

  it('somma le righe della stessa voce nello stesso mese', () => {
    expect(rossi.mesi['2024-10'].voci['8118'].imponibile).toBe(861.66);
    expect(rossi.mesi['2024-10'].voci['8103'].imponibile).toBe(849.16);
  });

  it('propone solo le voci che portano un imponibile', () => {
    expect(vociImponibile(rossi).map(v => v.cod)).toEqual(['8103', '8118']);
  });

  it('rifiuta un file che non e\' un\'estrazione voci', () => {
    expect(() => leggiEstrazioneVoci('<table><tr><td>altro</td></tr></table>')).toThrow(/Estrazione voci/);
  });
});

describe('dall\'estrazione alle righe dell\'import periodi', () => {
  const { persone } = leggiEstrazioneVoci(ESTRAZIONE);
  const rossi = persone.find(p => p.cf === 'RSSMRA80A01H501U');
  const bianchi = persone.find(p => p.cf === 'BNCNNA85C41H501C');

  it('un mese con imponibile = una riga; i mesi senza imponibile non entrano', () => {
    const r = periodiDaEstrazione(rossi, '8103');
    expect(r.testo).toBe('2024-09\t1698,32\t\t26\n2024-10\t849,16\t\t26');
  });

  it('le righe prodotte si rileggono con l\'incolla, aliquota di default compresa', () => {
    const p = parsePeriodi(periodiDaEstrazione(rossi, '8103').testo);
    expect(p.map(x => [x.AnnoMese, x.imponibile, x.aliquota, x.GiorniRetribuiti]))
      .toEqual([['2024-09', 1698.32, 1.61, '26'], ['2024-10', 849.16, 1.61, '26']]);
  });

  it('segnala le mensilita\' doppie invece di scrivere 52 giorni', () => {
    const r = periodiDaEstrazione(rossi, '8103');
    expect(r.avvisi['2024-09'][0]).toMatch(/52 giorni/);
    expect(r.avvisi['2024-10']).toBeUndefined();
  });

  it('cambiando voce cambia l\'imponibile', () => {
    expect(periodiDaEstrazione(rossi, '8118').testo).toContain('2024-10\t861,66');
  });

  it('mette da parte i mesi a tempo indeterminato', () => {
    const r = periodiDaEstrazione(bianchi, '8103');
    expect(r.nonTD).toEqual(['2024-10']);
    expect(r.avvisi['2024-10'][0]).toMatch(/1-TI/);
  });
});

describe('incolla con il formato migliaia di Excel', () => {
  it('1.062,61 vale milleSessantadue, non uno', () => {
    expect(parsePeriodi('2020-12\t1.062,61')[0].imponibile).toBe(1062.61);
  });
});

describe('assunzione e cessazione indicate a mano', () => {
  const cfg = { TipoMittente: '5', CFMittente: '00000000000', RagSocMittente: 'COMUNE DI PROVA' };
  // il modello ha un quadro Assunzione rimasto dal mese da cui e' stato importato
  const lav = {
    id: 'L1', CFLavoratore: 'RSSMRA80A01H501U', Cognome: 'ROSSI', Nome: 'MARIO',
    Qualifica1: '2', Qualifica2: 'F', Qualifica3: 'D', giorni: [], EmettiSettimane: true,
    AdeguaSettimane: true, SettimaneOverride: {}, AltreADebito: [],
    hasAssunzione: true, GiornoAssunzione: '5', TipoAssunzione: '1',
    hasCessazione: false, GiornoCessazione: '', TipoCessazione: '1B',
  };
  const pos = { id: 'P1', Matricola: '1800000000', lavoratori: [] };
  const az = { id: 'A1', AnnoMese: '', CFAzienda: '00000000000', RagSocAzienda: 'COMUNE DI PROVA', poss: [], collaboratori: [] };
  const fai = (testo, rapporto) => costruisciPeriodo(cfg, az, pos, lav, parsePeriodi(testo)[0], rapporto);
  const RAPPORTO = { assunzione: '2024-09-09', cessazione: '2025-03-10' };

  it('senza date resta quel che dice il modello', () => {
    const e = fai('2024-10\t849,16');
    expect(e.lav.hasAssunzione).toBe(true);
    expect(e.lav.GiornoAssunzione).toBe('5');
    expect(e.fuori).toBe(false);
  });

  it('il quadro Assunzione esce solo nel mese di assunzione', () => {
    const sett = fai('2024-09\t600,00', RAPPORTO), ott = fai('2024-10\t849,16', RAPPORTO);
    expect([sett.lav.hasAssunzione, sett.lav.GiornoAssunzione]).toEqual([true, '9']);
    expect([ott.lav.hasAssunzione, ott.lav.GiornoAssunzione]).toEqual([false, '']);
    expect(ott.lav.hasCessazione).toBe(false);
  });

  it('il quadro Cessazione esce solo nel mese di cessazione, con il tipo del modello', () => {
    const e = fai('2025-03\t300,00', RAPPORTO);
    expect([e.lav.hasCessazione, e.lav.GiornoCessazione, e.lav.TipoCessazione]).toEqual([true, '10', '1B']);
    expect(e.lav.hasAssunzione).toBe(false);
  });

  it('i mesi prima dell\'assunzione e dopo la cessazione sono fuori dal rapporto', () => {
    expect(fai('2024-08\t100,00', RAPPORTO).fuori).toBe(true);
    expect(fai('2025-04\t100,00', RAPPORTO).fuori).toBe(true);
    expect(fai('2024-09\t100,00', RAPPORTO).fuori).toBe(false);
    expect(fai('2025-03\t100,00', RAPPORTO).fuori).toBe(false);
  });

  it('nel mese parziale conta i giorni lavorabili del rapporto, se non sono dichiarati', () => {
    // settembre 2024 dal 9: 19 giorni lun-sab; marzo 2025 fino al 10: 8
    expect(fai('2024-09\t600,00', RAPPORTO).lav.GiorniRetribuiti).toBe('19');
    expect(fai('2025-03\t300,00', RAPPORTO).lav.GiorniRetribuiti).toBe('8');
  });

  it('i giorni scritti a mano non si toccano', () => {
    expect(fai('2024-09\t600,00\t\t12', RAPPORTO).lav.GiorniRetribuiti).toBe('12');
  });

  it('le settimane del mese parziale partono dal giorno di assunzione', () => {
    const e = fai('2024-09\t600,00', RAPPORTO);
    // 9 settembre 2024 e' lunedi': la settimana che contiene l'1-7 non c'e'
    expect(e.setts.length).toBe(4);
    expect(e.voci.filter(v => v.liv === 'E')).toEqual([]);
  });
});
