import { describe, expect, it } from 'vitest';
import {
  parsePeriodi, normalizzaAnnoMese, costruisciPeriodo, zipStore,
  calcSettimane, checkSettimane,
} from './UniEmensPriv.jsx';

/* I valori attesi vengono da flussi reali gia' passati al validatore INPS
   (ricostruzione 2020-2026 di un dipendente comunale part-time al 22,22%).
   Anagrafica e matricola qui sono fittizie: cambiano il nome nell'XML, non i calcoli. */

const cfg = {
  TipoMittente: '5', CFPersonaMittente: 'RSSMRA80A01H501U',
  RagSocMittente: 'COMUNE DI PROVA', CFMittente: '00000000000',
  CFSoftwarehouse: '00000000000', SedeINPS: '180000',
};

const lavModello = {
  id: 'L1', CFLavoratore: 'RSSMRA80A01H501U', Cognome: 'ROSSI', Nome: 'MARIO',
  Qualifica1: '2', Qualifica2: 'M', Qualifica3: 'D',
  TipoContribuzione: '71', RegimePost95: 'S', Cittadinanza: '000',
  UnitaOperativa: '0', UnitaProduttiva: '0', CodiceComune: 'A049',
  CodiceContratto: 'CPUB', TipoCodiceContratto: '02',
  TipoPaga: 'H', OrarioContrattuale: '3600', OrarioGiornMedioContrattuale: '800',
  PercPartTime: '2222', PercPartTimeMese: '2222', NumMensilita: '13000',
  TipoLavoratore: '00', TipoRetrMal: '1', RispettoMinimale: 'S',
  Imponibile: '', Contributo: '', RetribTeorica: '', AltreADebito: [],
  giorni: [], EmettiSettimane: true, AdeguaSettimane: true, SettimaneOverride: {},
  GiorniRetribuiti: '26', GiorniContribuiti: '', OreContribuite: '3466',
  SettimaneUtili: '96', InfoAggCausali: [], DatiParticolari: [],
  DifferenzeAccredito: [], MisureCompensative: [],
  hasCessazione: false, hasAssunzione: false, hasMaternita: false,
  hasDestinazioneTFR: false, ForzImpZero: false,
};
const posModello = {
  id: 'P1', Matricola: '1802883624', lavoratori: [], TrattQuotaLav: 'N',
  ForzaAziendale: '1', AltrePartiteADebito: [],
};
const azModello = {
  id: 'A1', AnnoMese: '', CFAzienda: '00000000000',
  RagSocAzienda: 'COMUNE DI PROVA', poss: [], collaboratori: [], CAP: '', ISTAT: '',
};

const costruisci = (riga) => costruisciPeriodo(cfg, azModello, posModello, lavModello, riga);
const unaRiga = (testo) => parsePeriodi(testo)[0];
const settimaneDi = (e) => e.setts.map(s => `${s.IdSettimana}${s.TipoCopertura}`).join(' ');

describe('lettura dell\'incolla', () => {
  it('accetta il TAB di Excel e il punto e virgola del CSV', () => {
    expect(parsePeriodi('2021-01\t950,09')[0].imponibile).toBe(950.09);
    expect(parsePeriodi('2021-01;950,09')[0].imponibile).toBe(950.09);
  });

  it('non scambia la virgola dei decimali per un separatore', () => {
    const r = unaRiga('2022-04\t951,56');
    expect(r.imponibile).toBe(951.56);
  });

  it('riconosce le forme comuni del mese', () => {
    expect(normalizzaAnnoMese('2021-1')).toBe('2021-01');
    expect(normalizzaAnnoMese('01/2021')).toBe('2021-01');
    expect(normalizzaAnnoMese('202101')).toBe('2021-01');
    expect(normalizzaAnnoMese('gennaio')).toBeNull();
  });

  it('salta l\'intestazione del modello ma segnala una riga sporca in mezzo', () => {
    const r = parsePeriodi('Mese\tImponibile\n2021-01\t950,09\npippo\t100');
    expect(r).toHaveLength(2);
    expect(r[0].AnnoMese).toBe('2021-01');
    expect(r[1].errore).toMatch(/non e un mese valido|non è un mese valido/);
  });

  it('applica i default 1,61% e 26 giorni, e li lascia sovrascrivere', () => {
    expect(unaRiga('2021-01\t950,09').aliquota).toBe(1.61);
    expect(unaRiga('2021-01\t950,09').GiorniRetribuiti).toBe('26');
    expect(unaRiga('2021-01\t950,09\t2,5\t24').aliquota).toBe(2.5);
    expect(unaRiga('2021-01\t950,09\t2,5\t24').GiorniRetribuiti).toBe('24');
  });

  it('rifiuta un imponibile non numerico invece di generare uno zero', () => {
    expect(parsePeriodi('2021-01\t\n2021-02\tabc')[0].errore).toBeTruthy();
  });
});

describe('valori calcolati, confrontati con flussi reali', () => {
  /* [mese, imponibile incollato, Imponibile atteso, Contributo atteso] */
  const casi = [
    ['2020-12', '1062,61', '1063', '17,11'],
    ['2021-01', '950,09', '950', '15,30'],
    ['2021-12', '1444,93', '1445', '23,26'],
    ['2022-04', '951,56', '952', '15,32'],
    ['2026-07', '1293,26', '1293', '20,82'],
  ];
  it.each(casi)('%s -> Imponibile %s, Contributo %s', (mese, inc, imp, con) => {
    const e = costruisci(unaRiga(`${mese}\t${inc}`));
    expect(e.lav.Imponibile).toBe(imp);
    expect(e.lav.RetribTeorica).toBe(imp);
    expect(e.lav.Contributo).toBe(con);
  });

  it('calcola il contributo sull\'imponibile REALE, non sull\'intero che finisce nell\'XML', () => {
    // 951,56 x 1,61% = 15,32 ; 952 x 1,61% = 15,33. Il flusso trasmesso porta 15,32.
    const e = costruisci(unaRiga('2022-04\t951,56'));
    expect(e.lav.Imponibile).toBe('952');
    expect(e.lav.Contributo).toBe('15,32');
  });

  it('rispetta un\'aliquota diversa da 1,61', () => {
    expect(costruisci(unaRiga('2021-01\t1000,00\t2,00')).lav.Contributo).toBe('20,00');
  });
});

describe('settimane, confrontate con flussi reali', () => {
  const casi = [
    ['2020-12', '1062,61', '49X 50X 51X 52X 53X'],
    ['2021-01', '950,09', '1X 2X 3X 4X 5X 60'],   // la 6 e' la sola domenica 31
    ['2021-02', '950,09', '6X 7X 8X 9X 10X'],     // la 10 promossa per il vincolo 02570E
    ['2021-10', '950,09', '40X 41X 42X 43X 44X 450'],
    ['2026-07', '1293,26', '27X 28X 29X 30X 31X'],
  ];
  it.each(casi)('%s -> %s', (mese, inc, atteso) => {
    expect(settimaneDi(costruisci(unaRiga(`${mese}\t${inc}`)))).toBe(atteso);
  });

  it('a gennaio 2021 la prima settimana e la 1, non la 53 ISO', () => {
    const e = costruisci(unaRiga('2021-01\t950,09'));
    expect(e.setts[0].IdSettimana).toBe(1);
  });

  it('febbraio 2026 sta in quattro settimane e fa scattare il 02570E', () => {
    const e = costruisci(unaRiga('2026-02\t947,53'));
    expect(settimaneDi(e)).toBe('6X 7X 8X 9X');
    expect(checkSettimane(e.setts, e.lav).join(' ')).toMatch(/02570E/);
  });
});

describe('griglia dei giorni', () => {
  it('lavora da lunedi a sabato e riposa la domenica', () => {
    const e = costruisci(unaRiga('2021-02\t950,09'));
    expect(e.lav.giorni).toHaveLength(28);
    // febbraio 2021: domeniche il 7, 14, 21, 28
    expect(e.lav.giorni.filter(g => g.lavorato === 'N').map(g => g.gg)).toEqual([7, 14, 21, 28]);
    expect(e.giorniLav).toBe(24);
  });

  it('GiorniRetribuiti resta quello chiesto anche quando i giorni di calendario sono meno', () => {
    const e = costruisci(unaRiga('2021-02\t950,09'));
    expect(e.lav.GiorniRetribuiti).toBe('26');
    expect(e.giorniLav).toBe(24);
  });

  it('ogni giorno lavorato ricade in una settimana coperta (07780E)', () => {
    for (const mese of ['2021-01', '2021-02', '2021-07', '2022-03', '2024-06', '2026-02']) {
      const e = costruisci(unaRiga(`${mese}\t950,00`));
      const coperte = new Set(e.setts.filter(s => s.TipoCopertura !== '0').map(s => s.IdSettimana));
      const setts = calcSettimane(e.az.AnnoMese, e.lav.giorni, e.lav);
      expect(setts.map(s => s.IdSettimana)).toEqual(e.setts.map(s => s.IdSettimana));
      expect(e.voci.filter(v => v.liv === 'E').map(v => v.msg).join(' ')).not.toMatch(/07780E/);
      expect(coperte.size).toBeGreaterThan(0);
    }
  });
});

describe('nomi e struttura dei flussi prodotti', () => {
  it('un periodo = un flusso, con il suo nome di file', () => {
    const e = costruisci(unaRiga('2021-03\t950,09'));
    expect(e.az.AnnoMese).toBe('2021-03');
    expect(e.az.poss).toHaveLength(1);
    expect(e.az.poss[0].lavoratori).toHaveLength(1);
    expect(e.nome).toBe('UNIE2103.xml');
  });

  it('non trascina i collaboratori del modello dentro ogni mese', () => {
    const conCollab = { ...azModello, collaboratori: [{ id: 'c1' }] };
    const e = costruisciPeriodo(cfg, conCollab, posModello, lavModello, unaRiga('2021-03\t950,09'));
    expect(e.az.collaboratori).toEqual([]);
  });

  it('ogni periodo ha identificativi propri: non condivide oggetti col modello', () => {
    const a = costruisci(unaRiga('2021-03\t950,09'));
    const b = costruisci(unaRiga('2021-04\t950,09'));
    expect(a.lav.id).not.toBe(b.lav.id);
    expect(a.az.id).not.toBe(b.az.id);
    expect(a.lav.giorni).not.toBe(b.lav.giorni);
  });
});

describe('archivio ZIP', () => {
  const leggi = async (blob) => new Uint8Array(await blob.arrayBuffer());

  it('produce un archivio con la firma giusta e un elemento per file', async () => {
    const b = zipStore([{ name: 'UNIE2101.xml', text: '<a/>' }, { name: 'UNIE2102.xml', text: '<b/>' }]);
    const u = await leggi(b);
    expect([u[0], u[1], u[2], u[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]); // "PK\x03\x04"
    const coda = u.slice(-22);
    expect([coda[0], coda[1], coda[2], coda[3]]).toEqual([0x50, 0x4b, 0x05, 0x06]);
    expect(coda[10] | (coda[11] << 8)).toBe(2); // elementi nel direttorio centrale
  });

  it('conserva i nomi e il contenuto dei file', async () => {
    const testo = '<?xml version="1.0"?><DenunceMensili/>';
    const u = await leggi(zipStore([{ name: 'UNIE2012.xml', text: testo }]));
    const tutto = new TextDecoder().decode(u);
    expect(tutto).toContain('UNIE2012.xml');
    expect(tutto).toContain(testo);
  });

  it('regge un archivio da 68 mesi', async () => {
    const files = Array.from({ length: 68 }, (_, i) => ({
      name: `UNIE${2000 + i}.xml`, text: `<x>${i}</x>`,
    }));
    const u = await leggi(zipStore(files));
    const coda = u.slice(-22);
    expect(coda[10] | (coda[11] << 8)).toBe(68);
  });
});
