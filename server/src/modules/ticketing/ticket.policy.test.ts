import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTicketToken, hashTicketToken, shortCodeFromToken } from './ticket.policy';

const secret = 'ticket-token-secret-0123456789abcdef';
const ticket = { id: 42, nonce: 'a1b2c3d4e5f60718293a4b5c6d7e8f90', version: 1 };

test('a ticket token is deterministic and versioned', () => {
    const token = buildTicketToken(secret, ticket);
    assert.equal(buildTicketToken(secret, ticket), token);
    assert.match(token, /^v1\.[A-Za-z0-9_-]+$/);
    assert.notEqual(buildTicketToken(secret, { ...ticket, version: 2 }), token);
});

test('changing the secret or nonce changes the token', () => {
    const token = buildTicketToken(secret, ticket);
    assert.notEqual(buildTicketToken('ticket-token-secret-fffffff', ticket), token);
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
