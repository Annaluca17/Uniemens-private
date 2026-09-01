import { describe, expect, it } from 'vitest';
import { TIPO_CONTRIB, TIPO_ASSUN, TIPO_PAGA, TIPO_RETR_MAL, TIPO_LAV, buildPrivXML } from './UniEmensPriv.jsx';

/* Anagrafica fittizia: qui contano i tag emessi, non chi sia il lavoratore. */
const lav = (patch) => ({
  id: 'L1', CFLavoratore: 'RSSMRA80A01H501U', Cognome: 'ROSSI', Nome: 'MARIO',
  Qualifica1: '2', Qualifica2: 'F', Qualifica3: 'D',
  TipoContribuzione: '00', RegimePost95: 'N', Cittadinanza: '000',
  UnitaOperativa: '0', UnitaProduttiva: '0', CodiceComune: 'H501',
  CodiceContratto: '', TipoCodiceContratto: '02', TipoPaga: 'H',
  OrarioContrattuale: '4000', OrarioGiornMedioContrattuale: '800',
  PercPartTime: '', PercPartTimeMese: '', NumMensilita: '14000',
  TipoLavoratore: '00', TipoRetrMal: '1', RispettoMinimale: 'S',
  Imponibile: '1000', Contributo: '10,00', RetribTeorica: '1000',
  AltreADebito: [], giorni: [], EmettiSettimane: false, AdeguaSettimane: true,
  SettimaneOverride: {}, GiorniRetribuiti: '26', GiorniContribuiti: '',
  OreContribuite: '', SettimaneUtili: '', InfoAggCausali: [], DatiParticolari: [],
  DifferenzeAccredito: [], MisureCompensative: [],
  hasCessazione: false, hasAssunzione: false, hasMaternita: false,
  hasDestinazioneTFR: false, ForzImpZero: false,
  ...patch,
});

const xmlDi = (patch) => buildPrivXML(
  { TipoMittente: '1', CFMittente: '00000000000', RagSocMittente: 'PROVA',
    CFPersonaMittente: '', CFSoftwarehouse: '', SedeINPS: '' },
  [{ id: 'A1', AnnoMese: '2026-03', CFAzienda: '00000000000', RagSocAzienda: 'PROVA',
     CAP: '', ISTAT: '', collaboratori: [],
     poss: [{ id: 'P1', Matricola: '1234567890', TrattQuotaLav: 'S', ForzaAziendale: '1',
              AltrePartiteADebito: [], lavoratori: [lav(patch)] }] }],
);

describe('TipoContribuzione si puo lasciare non impostato', () => {
  it('la lista offre il vuoto come scelta esplicita', () => {
    expect(TIPO_CONTRIB.some(o => o.v === '')).toBe(true);
  });

  it('il vuoto sta in cima, prima dei codici', () => {
    expect(TIPO_CONTRIB[0].v).toBe('');
  });

  it('col vuoto il tag non viene emesso', () => {
    expect(xmlDi({ TipoContribuzione: '' })).not.toContain('<TipoContribuzione>');
  });

  it('con un codice il tag torna', () => {
    expect(xmlDi({ TipoContribuzione: '71' })).toContain('<TipoContribuzione>71</TipoContribuzione>');
  });

  it('i codici gia in uso restano tutti disponibili', () => {
    const codici = TIPO_CONTRIB.map(o => o.v);
    for (const c of ['00', 'H0', 'J1', 'J2', '55', '71']) expect(codici).toContain(c);
  });
});

describe('TipoAssunzione: codice 9 - Altre motivazioni', () => {
  it('la lista lo prevede', () => {
    const nove = TIPO_ASSUN.find(o => o.v === '9');
    expect(nove).toBeTruthy();
    expect(nove.l).toMatch(/Altre motivazioni/i);
  });

  it('non ha soppiantato la prima assunzione', () => {
    expect(TIPO_ASSUN.some(o => o.v === '1')).toBe(true);
  });

  it('finisce nell XML quando l assunzione e dichiarata', () => {
    const x = xmlDi({ hasAssunzione: true, GiornoAssunzione: '15', TipoAssunzione: '9' });
    expect(x).toContain('<TipoAssunzione>9</TipoAssunzione>');
  });

  it('senza blocco assunzione non compare', () => {
    expect(xmlDi({ hasAssunzione: false, TipoAssunzione: '9' })).not.toContain('<TipoAssunzione>');
  });
});

describe.each([
  ['TipoPaga', TIPO_PAGA, 'TipoPaga', 'M', ['H', 'M']],
  ['TipoRetrMal', TIPO_RETR_MAL, 'TipoRetrMal', '2', ['1', '2']],
  ['TipoLavoratore', TIPO_LAV, 'TipoLavoratore', 'PB', ['00', 'PB']],
])('%s si puo lasciare non impostato', (nome, lista, tag, codice, codiciAttesi) => {
  it('la lista offre il vuoto, in cima', () => {
    expect(lista[0].v).toBe('');
  });

  it('col vuoto il tag non viene emesso', () => {
    expect(xmlDi({ [nome]: '' })).not.toContain(`<${tag}>`);
  });

  it('con un codice il tag torna', () => {
    expect(xmlDi({ [nome]: codice })).toContain(`<${tag}>${codice}</${tag}>`);
  });

  it('i codici gia in uso restano tutti disponibili', () => {
    const codici = lista.map(o => o.v);
    for (const c of codiciAttesi) expect(codici).toContain(c);
  });
});
