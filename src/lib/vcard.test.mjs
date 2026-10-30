// node --test src/lib/vcard.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVCard, vcardEscape, vcardFileName, safeHttpUrl, phoneDigits, whatsAppUrl, telHref,
  publicCardUrl, CARD_CODE_RE,
} from './vcard.mjs';

const card = {
  code: 'rahul-sharma-k7m2q',
  name: 'Rahul Kumar Sharma',
  designation: 'Sales Head',
  companyName: 'Balaji Developers, Pune',
  phone: '98765 43210',
  email: 'rahul@balaji.in',
  website: 'https://balaji.in',
  reraAgentNo: 'A52100012345',
  address: { line: 'Shop 4; Baner Road', city: 'Pune', state: 'Maharashtra', pinCode: '411045' },
};

describe('vcardEscape', () => {
  test('escapes backslash first, then comma, semicolon and newlines', () => {
    assert.equal(vcardEscape('a\\b,c;d\ne\r\nf\rg'), 'a\\\\b\\,c\\;d\\ne\\nf\\ng');
  });
  test('null and undefined become empty', () => {
    assert.equal(vcardEscape(null), '');
    assert.equal(vcardEscape(undefined), '');
  });
});

describe('buildVCard', () => {
  const v = buildVCard(card);
  const lines = v.split('\r\n');

  test('uses CRLF everywhere and ends with CRLF', () => {
    assert.ok(v.endsWith('END:VCARD\r\n'));
    assert.equal(v.replace(/\r\n/g, '').includes('\n'), false);
    assert.equal(v.replace(/\r\n/g, '').includes('\r'), false);
  });

  test('has the 3.0 header and the expected fields', () => {
    assert.equal(lines[0], 'BEGIN:VCARD');
    assert.equal(lines[1], 'VERSION:3.0');
    assert.ok(lines.includes('N:Sharma;Rahul Kumar;;;'));
    assert.ok(lines.includes('FN:Rahul Kumar Sharma'));
    assert.ok(lines.includes('ORG:Balaji Developers\\, Pune'));
    assert.ok(lines.includes('TITLE:Sales Head'));
    assert.ok(lines.includes('TEL;TYPE=CELL:+919876543210'));
    assert.ok(lines.includes('EMAIL;TYPE=INTERNET:rahul@balaji.in'));
    assert.ok(lines.includes('URL:https://balaji.in/'));
  });

  test('ADR escapes inside components but keeps the ; separators', () => {
    assert.ok(lines.includes('ADR;TYPE=WORK:;;Shop 4\\; Baner Road;Pune;Maharashtra;411045;India'));
  });

  test('NOTE carries RERA no and the card link, newline escaped', () => {
    assert.ok(lines.includes('NOTE:RERA Agent No: A52100012345\\nDigital card: https://homeintown.in/card/rahul-sharma-k7m2q'));
  });

  test('leaves out empty fields and non-http websites', () => {
    const m = buildVCard({ name: 'Asha', phone: '', website: 'javascript:alert(1)', address: {} });
    assert.ok(m.includes('N:;Asha;;;\r\n'));
    for (const prop of ['ORG', 'TITLE', 'TEL', 'EMAIL', 'URL', 'ADR', 'NOTE']) {
      assert.equal(m.includes(`\r\n${prop}`), false, prop);
    }
  });
});

describe('links', () => {
  test('10-digit numbers get 91, others are sent as digits', () => {
    assert.equal(phoneDigits('98765 43210'), '919876543210');
    assert.equal(phoneDigits('+91 98765-43210'), '919876543210');
    assert.equal(phoneDigits('+1 415 555 0100'), '14155550100');
    assert.equal(whatsAppUrl('9876543210'), 'https://wa.me/919876543210');
    assert.equal(telHref('9876543210'), 'tel:+919876543210');
    assert.equal(whatsAppUrl(''), null);
    assert.equal(telHref(null), null);
  });

  test('safeHttpUrl only lets http(s) through', () => {
    assert.equal(safeHttpUrl('https://x.in/a'), 'https://x.in/a');
    assert.equal(safeHttpUrl('http://x.in'), 'http://x.in/');
    assert.equal(safeHttpUrl('javascript:alert(1)'), null);
    assert.equal(safeHttpUrl('data:text/html,hi'), null);
    assert.equal(safeHttpUrl('x.in'), null);
    assert.equal(safeHttpUrl(null), null);
  });

  test('public card URL and code pattern', () => {
    assert.equal(publicCardUrl('rahul-sharma-k7m2q'), 'https://homeintown.in/card/rahul-sharma-k7m2q');
    assert.ok(CARD_CODE_RE.test('rahul-sharma-k7m2q'));
    assert.equal(CARD_CODE_RE.test('ab'), false);
    assert.equal(CARD_CODE_RE.test('Rahul'), false);
    assert.equal(CARD_CODE_RE.test('a/../b'), false);
    assert.equal(CARD_CODE_RE.test('a'.repeat(49)), false);
  });

  test('vcardFileName keeps the name and drops unsafe characters', () => {
    assert.equal(vcardFileName('Rahul Sharma'), 'Rahul Sharma.vcf');
    assert.equal(vcardFileName('a/b:c*?'), 'abc.vcf');
    assert.equal(vcardFileName('  '), 'contact.vcf');
  });
});
