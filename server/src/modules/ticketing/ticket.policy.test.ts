import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTicketToken, hashTicketToken, restoreTicketToken, shortCodeFromToken } from './ticket.policy';

const secret = 'a'.repeat(32);
const ticket = { id: 42, nonce: 'a1b2c3d4e5f60718293a4b5c6d7e8f90', version: 1 };

test('a ticket token is deterministic and versioned', () => {
    const token = buildTicketToken(secret, ticket);
    assert.equal(buildTicketToken(secret, ticket), token);
    assert.match(token, /^v1\.[A-Za-z0-9_-]+$/);
    assert.notEqual(buildTicketToken(secret, { ...ticket, version: 2 }), token);
});

test('changing the secret or nonce changes the token', () => {
    const token = buildTicketToken(secret, ticket);
    assert.notEqual(buildTicketToken('b'.repeat(32), ticket), token);
    assert.notEqual(buildTicketToken(secret, { ...ticket, nonce: '0'.repeat(32) }), token);
});

test('only the hash and a short manual code are stored', () => {
    const token = buildTicketToken(secret, ticket);
    const hash = hashTicketToken(token);
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.match(shortCodeFromToken(token), /^[0-9A-F]{8}$/);
    assert.notEqual(hash, token);
});

test('the token carries no buyer details', () => {
    const token = buildTicketToken(secret, ticket);
    assert.equal(token.includes('anna@example.com'), false);
    assert.equal(token.includes('Anna'), false);
});

test('a stored ticket restores its token only with the original secret and nonce', () => {
    const token = buildTicketToken(secret, ticket);
    const stored = { ...ticket, codeHash: hashTicketToken(token) };

    assert.equal(restoreTicketToken(secret, stored), token);
    assert.equal(restoreTicketToken('c'.repeat(32), stored), null);
    assert.equal(restoreTicketToken(secret, { ...stored, nonce: '0'.repeat(32) }), null);
    assert.equal(restoreTicketToken(secret, { ...stored, codeHash: 'f'.repeat(64) }), null);
});
