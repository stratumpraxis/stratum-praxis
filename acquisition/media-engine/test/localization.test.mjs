import test from 'node:test';
import assert from 'node:assert/strict';

import { LOCALIZATION_ELEMENTS, checkLocalization, detectLanguage, structuralAlignment } from '../lib/localize.mjs';
import { loadDerivations, loadMediaContext } from '../lib/context.mjs';

const context = await loadMediaContext();
const doc = await loadDerivations();
const en = doc.derivations.find((d) => d.desk_id === 'en_desk');
const es = doc.derivations.find((d) => d.desk_id === 'es_desk');

test('the Spanish desk is a first-class contract held at TEST for a stated reason', () => {
  const desk = context.desks.es_desk;
  assert.equal(desk.state, 'TEST');
  assert.ok(desk.state_reason.length > 40);
  assert.equal(desk.requires_localization_review, true);
  assert.equal(desk.spanish_variant, 'INTERNATIONAL');
  assert.ok(desk.english_only_destination_rule);
});

test('language detection separates the two desks', () => {
  assert.equal(detectLanguage(es.body).language, 'es');
  assert.equal(detectLanguage(en.body).language, 'en');
});

test('the shipped Spanish output passes the localization gate', () => {
  const result = checkLocalization(es, { desk: context.desks.es_desk, sibling: en, destinationLanguage: 'en' });
  assert.deepEqual(result.failures, [], JSON.stringify(result.failures, null, 2));
  assert.equal(result.detected_language, 'es');
  assert.equal(result.localized_elements.length, LOCALIZATION_ELEMENTS.length);
});

test('a literal translation of the English output is rejected', () => {
  // Same sentence count, same order, same numbers and proper nouns in the same slots.
  const literal = {
    derivation_id: 'literal-es',
    language: 'es',
    title: 'Antes de la proxima renovacion, alguien tiene que nombrar el numero',
    hook: 'La parte dificil de una revision de suscripciones de IA no es encontrar el desperdicio.',
    body: es.body,
    cta_text: es.cta_text,
    localization: Object.fromEntries(LOCALIZATION_ELEMENTS.map((e) => [e, 'adapted'])),
    destination_language_note: 'La pagina de destino esta en ingles.'
  };
  const sibling = { ...literal, derivation_id: 'literal-en', language: 'en' };
  const result = checkLocalization(literal, { desk: context.desks.es_desk, sibling, destinationLanguage: 'en' });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((f) => f.check === 'STRUCTURE'),
    `expected a STRUCTURE failure, got ${result.failures.map((f) => f.check).join(', ')}`);
});

test('structural alignment recognises a sentence-for-sentence translation', () => {
  const original = 'The renewal is in March 2027. The Zylo report puts waste at 30%. Ask who owns the total.';
  const translated = 'La renovacion es en March 2027. El informe Zylo situa el desperdicio en 30%. Pregunta quien es el responsable del total.';
  const alignment = structuralAlignment(original, translated);
  assert.equal(alignment.sentence_delta, 0);
  assert.ok(alignment.positional_token_overlap >= 0.5);
  assert.equal(alignment.aligned, true);
});

test('poor localization fails even when the Spanish is grammatical', () => {
  const thin = {
    derivation_id: 'thin-es',
    language: 'es',
    title: 'Revisa tus suscripciones',
    hook: 'Un recordatorio para los que trabajan por su cuenta.',
    body: 'Muchas de las herramientas que usas se renuevan solas. La pregunta es cuanto de ese gasto podrias quitar sin cambiar como trabajas. Revisa las fechas antes de que se cobren.',
    cta_text: 'Calcula tu gasto reducible. La herramienta esta en ingles.',
    localization: { framing: 'adapted', hook: 'adapted' }
  };
  const result = checkLocalization(thin, { desk: context.desks.es_desk, destinationLanguage: 'en' });
  assert.equal(result.ok, false);
  const failure = result.failures.find((f) => f.check === 'LOCALIZATION');
  assert.ok(failure, 'a thin localization must fail the LOCALIZATION check');
  assert.ok(failure.missing.includes('currency_context'));
});

test('an English-only destination must be stated in the Spanish CTA', () => {
  const silent = {
    ...es,
    derivation_id: 'silent-es',
    cta_text: 'Calcula tu gasto reducible antes de la proxima renovacion.',
    destination_language_note: null
  };
  const result = checkLocalization(silent, { desk: context.desks.es_desk, destinationLanguage: 'en' });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((f) => f.check === 'DESTINATION_LANGUAGE'));
});

test('English text submitted to the Spanish desk is rejected', () => {
  const wrongLanguage = { ...es, derivation_id: 'english-on-es-desk', body: en.body, title: en.title, hook: en.hook, cta_text: en.cta_text };
  const result = checkLocalization(wrongLanguage, { desk: context.desks.es_desk, destinationLanguage: 'en' });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((f) => f.check === 'LANGUAGE'));
});

test('the Spanish output carries localization the English one does not have', () => {
  // The currency point is the clearest example: it exists only where it matters.
  assert.match(es.localization.currency_context, /exchange|USD/i);
  assert.ok(!/exchange rate/i.test(en.body), 'the English output should not carry the Spanish-specific currency framing');
});
