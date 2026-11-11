import { describe, expect, it } from 'vitest';
import {
  leggiEstrazioneVoci, vociImponibile, periodiDaEstrazione,
  parsePeriodi, costruisciPeriodo, dividiNominativo, flussiPerMese, buildPrivXML,
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
    expect(r.testo).toBe('2024-09\t1698,32\t\t26\tRSSMRA80A01H501U\n2024-10\t849,16\t\t26\tRSSMRA80A01H501U');
  });

  it('le righe prodotte si rileggono con l\'incolla, aliquota di default compresa', () => {
    const p = parsePeriodi(periodiDaEstrazione(rossi, '8103').testo);
    expect(p.map(x => [x.AnnoMese, x.imponibile, x.aliquota, x.GiorniRetribuiti, x.cf]))
      .toEqual([['2024-09', 1698.32, 1.61, '26', 'RSSMRA80A01H501U'], ['2024-10', 849.16, 1.61, '26', 'RSSMRA80A01H501U']]);
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

  it('i mesi prima dell\'assunzione sono fuori; quelli dopo la cessazione no, sono NFOR', () => {
    expect(fai('2024-08\t100,00', RAPPORTO).fuori).toBe(true);
    expect(fai('2025-04\t100,00', RAPPORTO).fuori).toBe(false);
    expect(fai('2025-04\t100,00', RAPPORTO).nfor).toBe(true);
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

describe('colonne facoltative dell\'incolla: codice fiscale, cognome, nome', () => {
  it('senza codice fiscale la riga resta del lavoratore modello', () => {
    expect(parsePeriodi('2021-01\t950,09')[0].cf).toBe('');
  });
  it('legge codice fiscale e nominativo anche con aliquota e giorni vuoti', () => {
    const r = parsePeriodi('2021-02\t800,00\t\t\trssmra80a01h501u\tROSSI\tMARIO')[0];
    expect([r.cf, r.cognome, r.nome, r.aliquota, r.giorniDefault]).toEqual(['RSSMRA80A01H501U', 'ROSSI', 'MARIO', 1.61, true]);
  });
});

describe('cognome e nome dal nominativo unico dell\'estrazione', () => {
  it('il caso semplice', () => {
    expect(dividiNominativo('ROSSI MARIO', 'RSSMRA80A01H501U')).toEqual({ cognome: 'ROSSI', nome: 'MARIO', certo: true });
  });
  it('cognome composto: il taglio lo decide il codice fiscale', () => {
    // DE LUCA -> DLC, ANNA -> NNA
    expect(dividiNominativo('DE LUCA ANNA', 'DLCNNA85C41H501X')).toEqual({ cognome: 'DE LUCA', nome: 'ANNA', certo: true });
  });
  it('nome composto: il taglio lo decide il codice fiscale', () => {
    // VERDI -> VRD, MARIA VITTORIA -> MVT (quattro consonanti: prima, terza, quarta)
    expect(dividiNominativo('VERDI MARIA VITTORIA', 'VRDMVT68D54H501X')).toEqual({ cognome: 'VERDI', nome: 'MARIA VITTORIA', certo: true });
  });
  it('se il codice fiscale non torna, ultima parola = nome e lo segnala', () => {
    expect(dividiNominativo('DE LUCA ANNA', 'XXXXXX85C41H501X')).toEqual({ cognome: 'DE LUCA', nome: 'ANNA', certo: false });
  });
});

describe('un flusso per mese con tutti i dipendenti', () => {
  const cfg = { TipoMittente: '5', CFMittente: '00000000000', RagSocMittente: 'COMUNE DI PROVA' };
  const base = {
    id: 'L1', CFLavoratore: 'RSSMRA80A01H501U', Cognome: 'ROSSI', Nome: 'MARIO',
    Qualifica1: '2', Qualifica2: 'F', Qualifica3: 'D', giorni: [], EmettiSettimane: true,
    AdeguaSettimane: true, SettimaneOverride: {}, AltreADebito: [], hasAssunzione: false, hasCessazione: false,
  };
  const bianchi = { ...base, CFLavoratore: 'BNCNNA85C41H501C', Cognome: 'BIANCHI', Nome: 'ANNA' };
  const pos = { id: 'P1', Matricola: '1800000000', lavoratori: [] };
  const az = { id: 'A1', AnnoMese: '', CFAzienda: '00000000000', RagSocAzienda: 'COMUNE DI PROVA', poss: [], collaboratori: [] };
  const fai = (lav, testo) => costruisciPeriodo(cfg, az, pos, lav, parsePeriodi(testo)[0]);
  const flussi = flussiPerMese([
    fai(base, '2024-10\t849,16'), fai(base, '2024-09\t600,00'), fai(bianchi, '2024-10\t1500,00'),
  ]);

  it('i mesi escono in ordine, uno per file', () => {
    expect(flussi.map(f => [f.AnnoMese, f.nome])).toEqual([['2024-09', 'UNIE2409.xml'], ['2024-10', 'UNIE2410.xml']]);
  });
  it('nello stesso mese i dipendenti stanno nella stessa matricola', () => {
    expect(flussi[1].az.poss).toHaveLength(1);
    expect(flussi[1].az.poss[0].lavoratori.map(l => l.Cognome)).toEqual(['ROSSI', 'BIANCHI']);
    expect(flussi[0].az.poss[0].lavoratori.map(l => l.Cognome)).toEqual(['ROSSI']);
  });
  it('ognuno tiene il suo imponibile e il suo contributo', () => {
    expect(flussi[1].az.poss[0].lavoratori.map(l => [l.Imponibile, l.Contributo])).toEqual([['849', '13,67'], ['1500', '24,15']]);
  });
});

describe('NFOR: dopo la cessazione, senza riassunzione', () => {
  const cfg = { TipoMittente: '1', CFMittente: '00000000000', RagSocMittente: 'COMUNE DI PROVA' };
  const lav = {
    id: 'L1', CFLavoratore: 'RSSMRA80A01H501U', Cognome: 'ROSSI', Nome: 'MARIO',
    Qualifica1: '2', Qualifica2: 'F', Qualifica3: 'D', giorni: [], EmettiSettimane: true,
    AdeguaSettimane: true, SettimaneOverride: {}, AltreADebito: [], InfoAggCausali: [],
    DatiParticolari: [], DifferenzeAccredito: [], MisureCompensative: [],
    hasAssunzione: false, hasCessazione: false, TipoCessazione: '1B', TipoAssunzione: '1', TipoLavStat: '',
  };
  const pos = { id: 'P1', Matricola: '1800000000', lavoratori: [], AltrePartiteADebito: [] };
  const az = { id: 'A1', AnnoMese: '', CFAzienda: '00000000000', RagSocAzienda: 'COMUNE DI PROVA', poss: [], collaboratori: [] };
  const fai = (testo, rapporto, modello = lav) => costruisciPeriodo(cfg, az, pos, modello, parsePeriodi(testo)[0], rapporto);
  const DUE = { periodi: [
    { assunzione: '2022-03-14', cessazione: '2022-12-31' },
    { assunzione: '2024-02-01', cessazione: '2024-06-30' },
  ] };

  it('dentro un rapporto il mese e\' normale', () => {
    const e = fai('2022-06\t800,00', DUE);
    expect([e.nfor, e.fuori, e.lav.TipoLavStat, e.lav.GiorniRetribuiti]).toEqual([false, false, '', '26']);
    expect(e.setts.length).toBeGreaterThan(0);
  });

  it('fra una cessazione e la riassunzione e\' NFOR', () => {
    const e = fai('2023-05\t150,00', DUE);
    expect([e.nfor, e.fuori, e.lav.TipoLavStat]).toEqual([true, false, 'NFOR']);
  });

  it('dopo l\'ultima cessazione e\' NFOR', () => {
    expect(fai('2025-01\t90,00', DUE).nfor).toBe(true);
  });

  it('con la riassunzione torna normale, col quadro Assunzione del secondo rapporto', () => {
    const e = fai('2024-02\t700,00', DUE);
    expect([e.nfor, e.lav.hasAssunzione, e.lav.GiornoAssunzione]).toEqual([false, true, '1']);
  });

  it('ogni rapporto ha la sua cessazione', () => {
    expect(fai('2022-12\t700,00', DUE).lav.GiornoCessazione).toBe('31');
    expect(fai('2024-06\t700,00', DUE).lav.GiornoCessazione).toBe('30');
  });

  it('prima della prima assunzione il mese non si crea', () => {
    const e = fai('2022-01\t100,00', DUE);
    expect([e.fuori, e.nfor]).toEqual([true, false]);
  });

  it('il mese NFOR tiene imponibile e contributo ma non giorni, settimane, assunzione o cessazione', () => {
    const e = fai('2023-05\t150,00', DUE);
    expect([e.lav.Imponibile, e.lav.Contributo, e.lav.GiorniRetribuiti]).toEqual(['150', '2,42', '']);
    expect(e.setts).toEqual([]);
    expect([e.lav.hasAssunzione, e.lav.hasCessazione]).toEqual([false, false]);
    expect(e.voci.filter(v => v.liv === 'E')).toEqual([]);
  });

  it('nell\'XML del mese NFOR non ci sono Giorno, Settimana e GiorniRetribuiti (10240E)', () => {
    const xml = buildPrivXML(cfg, [fai('2023-05\t150,00', DUE).az]);
    expect(xml).toContain('<TipoLavStat>NFOR</TipoLavStat>');
    expect(xml).toContain('<Imponibile>150</Imponibile>');
    expect(xml).not.toMatch(/<Giorno |<Settimana>|<GiorniRetribuiti>/);
  });

  it('nell\'XML del mese normale ci sono tutti e tre', () => {
    const xml = buildPrivXML(cfg, [fai('2022-06\t800,00', DUE).az]);
    expect(xml).not.toContain('TipoLavStat');
    expect(xml).toMatch(/<Giorno /);
    expect(xml).toMatch(/<Settimana>/);
    expect(xml).toContain('<GiorniRetribuiti>26</GiorniRetribuiti>');
  });

  it('la scelta a mano comanda sul calcolo, in tutti e due i versi', () => {
    expect(fai('2022-06\t800,00', { ...DUE, nfor: true }).lav.TipoLavStat).toBe('NFOR');
    const e = fai('2023-05\t150,00', { ...DUE, nfor: false });
    expect([e.nfor, e.lav.TipoLavStat, e.lav.GiorniRetribuiti]).toEqual([false, '', '26']);
  });

  it('un profilo preso da un flusso NFOR non rende NFOR i mesi lavorati', () => {
    const profiloNfor = { ...lav, TipoLavStat: 'NFOR', EmettiSettimane: false };
    const e = fai('2022-06\t800,00', DUE, profiloNfor);
    expect([e.lav.TipoLavStat, e.lav.EmettiSettimane]).toEqual(['', true]);
    expect(buildPrivXML(cfg, [e.az])).toMatch(/<Settimana>/);
  });

  it('senza date vale il profilo: se e\' NFOR, il mese esce NFOR e coerente', () => {
    const profiloNfor = { ...lav, TipoLavStat: 'NFOR', EmettiSettimane: false };
    const e = fai('2022-06\t800,00', undefined, profiloNfor);
    expect(e.nfor).toBe(true);
    expect(buildPrivXML(cfg, [e.az])).not.toMatch(/<Giorno |<GiorniRetribuiti>/);
  });
});
