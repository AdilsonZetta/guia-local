import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  businessTelHref,
  businessWhatsappHref,
  telLink,
  whatsappLink,
} from '../src/lib/utils.ts'

describe('whatsappLink', () => {
  it('builds wa.me with country code and digits only', () => {
    assert.equal(
      whatsappLink('(34) 99680-9491'),
      'https://wa.me/5534996809491',
    )
    assert.equal(whatsappLink('34996809491'), 'https://wa.me/5534996809491')
    assert.equal(
      whatsappLink('+55 (34) 99680-9491'),
      'https://wa.me/5534996809491',
    )
  })

  it('strips a leading trunk zero without doubling 55', () => {
    assert.equal(whatsappLink('034996809491'), 'https://wa.me/5534996809491')
    assert.equal(
      whatsappLink('055 (34) 99680-9491'),
      'https://wa.me/5534996809491',
    )
    assert.equal(
      whatsappLink('55 0 34 99680-9491'),
      'https://wa.me/5534996809491',
    )
    assert.equal(
      whatsappLink('55 55 34 99680-9491'),
      'https://wa.me/5534996809491',
    )
  })

  it('keeps area code 55 distinct from the country code', () => {
    assert.equal(
      whatsappLink('(55) 99999-9999'),
      'https://wa.me/5555999999999',
    )
    assert.equal(
      whatsappLink('5555999999999'),
      'https://wa.me/5555999999999',
    )
  })

  it('hides the link when the number is not a mobile', () => {
    assert.equal(whatsappLink('3433138617'), null)
    assert.equal(whatsappLink('0800 110 0000'), null)
    assert.equal(whatsappLink('99999-9999'), null)
    assert.equal(whatsappLink(''), null)
    assert.equal(whatsappLink(null), null)
    assert.equal(whatsappLink('não informado'), null)
  })

  it('adds a prefilled message when one is given', () => {
    assert.equal(
      whatsappLink('34996809491', 'Olá'),
      'https://wa.me/5534996809491?text=Ol%C3%A1',
    )
  })
})

describe('telLink', () => {
  it('normalizes landlines and mobiles', () => {
    assert.equal(telLink('(34) 3313-8617'), 'tel:+553433138617')
    assert.equal(telLink('034996809491'), 'tel:+5534996809491')
    assert.equal(telLink('55 55 34 3313-8617'), 'tel:+553433138617')
  })

  it('keeps 0800 numbers as national calls', () => {
    assert.equal(telLink('8001100000'), 'tel:08001100000')
    assert.equal(telLink('0800 110 0000'), 'tel:08001100000')
  })
})

describe('business contact hrefs', () => {
  const mobile = {
    name: 'Davi Chaveiro',
    phone: '34996809491',
    whatsapp: null,
    show_whatsapp: true,
  }

  it('uses the phone when whatsapp is empty', () => {
    assert.match(
      businessWhatsappHref(mobile) ?? '',
      /^https:\/\/wa\.me\/5534996809491\?text=/,
    )
  })

  it('prefers a valid whatsapp number over the phone', () => {
    assert.match(
      businessWhatsappHref({
        ...mobile,
        phone: '3433138617',
        whatsapp: '(34) 99999-0000',
      }) ?? '',
      /^https:\/\/wa\.me\/5534999990000\?text=/,
    )
  })

  it('hides WhatsApp when the business turns it off or has no mobile', () => {
    assert.equal(
      businessWhatsappHref({ ...mobile, show_whatsapp: false }),
      null,
    )
    assert.equal(
      businessWhatsappHref({
        name: 'Escritório',
        phone: '3433138617',
        whatsapp: null,
        show_whatsapp: true,
      }),
      null,
    )
    assert.equal(businessTelHref({ phone: '3433138617', whatsapp: null }), 'tel:+553433138617')
  })
})
