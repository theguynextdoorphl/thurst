import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pairUp, positionFit, scorePair, type Candidate } from '../src/matching/score.js';

const base = (id: string, over: Partial<Candidate> = {}): Candidate => ({
  id,
  age: 30,
  profile: {},
  prefs: {},
  lat: 40.7128,
  lng: -74.006,
  reputation: null,
  waitingSince: Date.now(),
  ...over,
});

test('position fit favours complementary positions', () => {
  assert.equal(positionFit('Top', 'Bottom'), 1);
  assert.equal(positionFit('Versatile', 'Versatile'), 1);
  assert.equal(positionFit('Top', 'Top'), 0);
  assert.equal(positionFit(undefined, 'Top'), 0.5);
});

test('pairs outside either radius are rejected', () => {
  const a = base('a', { prefs: { distance: 5 } });
  const b = base('b', { lat: 40.9, lng: -74.006 }); // about 13 miles north
  assert.equal(scorePair(a, b), null);
  assert.notEqual(scorePair({ ...a, prefs: { distance: 20 } }, b), null);
});

test('age range and list filters are mutual', () => {
  const a = base('a', { prefs: { ageMin: 35 } });
  assert.equal(scorePair(a, base('b', { age: 30 })), null);
  assert.equal(scorePair(base('b', { age: 30 }), a), null);

  const wantsTop = base('c', { prefs: { positions: ['Top'] } });
  assert.equal(scorePair(wantsTop, base('d', { profile: { position: 'Bottom' } })), null);
  assert.notEqual(scorePair(wantsTop, base('e', { profile: { position: 'Top' } })), null);
  // An unanswered field does not fail a filter.
  assert.notEqual(scorePair(wantsTop, base('f')), null);
});

test('must-have likes need every like', () => {
  const a = base('a', { prefs: { mustHaveLikes: ['Kissing', 'Oral'] } });
  assert.equal(scorePair(a, base('b', { profile: { likes: ['Kissing'] } })), null);
  assert.notEqual(scorePair(a, base('c', { profile: { likes: ['Oral', 'Kissing', 'Feet'] } })), null);
});

test('bareback-only and condoms-only never match', () => {
  const a = base('a', { profile: { saferSex: 'Raw - Bareback Only' } });
  const b = base('b', { profile: { saferSex: 'Safely - Condoms Are a Must' } });
  assert.equal(scorePair(a, b), null);
});

test('pairUp takes the best pairs first and uses each user once', () => {
  const top = base('top', { profile: { position: 'Top' } });
  const bottom = base('bottom', { profile: { position: 'Bottom' } });
  const top2 = base('top2', { profile: { position: 'Top' } });
  const pairs = pairUp([top, top2, bottom], () => false);
  assert.equal(pairs.length, 1);
  assert.ok(pairs[0]!.a.id === 'bottom' || pairs[0]!.b.id === 'bottom');
});

test('excluded pairs are skipped', () => {
  const pairs = pairUp([base('a'), base('b')], () => true);
  assert.equal(pairs.length, 0);
});
