import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeClientData } from './clients.service';

test('strips protected/computed fields to prevent mass-assignment', () => {
    const result = normalizeClientData({
        id: 99,
        status: 'ACTIVE',
        createdAt: new Date('2020-01-01'),
        expiresAt: new Date('2026-01-01'),
        image_3d: true,
        document: true,
        anamnesis: 'peanut allergy',
        description: 'internal note',
        firstName: 'Ada',
    } as never);

    assert.equal('id' in result, false);
    assert.equal('status' in result, false);
    assert.equal('createdAt' in result, false);
    assert.equal('expiresAt' in result, false);
    assert.equal('image_3d' in result, false);
    assert.equal('document' in result, false);
    assert.equal('anamnesis' in result, false);
    assert.equal('description' in result, false);
    assert.equal(result.firstName, 'Ada');
});

test('normalizes a valid positive branchId string to a number', () => {
    const result = normalizeClientData({ branchId: '3' } as never);
    assert.equal(result.branchId, 3);
});

test('normalizes an invalid, zero, or negative branchId to null', () => {
    assert.equal(normalizeClientData({ branchId: '0' } as never).branchId, null);
    assert.equal(normalizeClientData({ branchId: '-5' } as never).branchId, null);
    assert.equal(normalizeClientData({ branchId: 'not-a-number' } as never).branchId, null);
});

test('leaves branchId untouched when not present in the payload', () => {
    const result = normalizeClientData({ firstName: 'Ada' } as never);
    assert.equal('branchId' in result, false);
});

test('trims whitespace from string fields', () => {
    const result = normalizeClientData({
        firstName: '  Ada  ',
        lastName: '  Lovelace ',
        phoneNumber: ' +31 6 12345678 ',
    } as never);

    assert.equal(result.firstName, 'Ada');
    assert.equal(result.lastName, 'Lovelace');
    assert.equal(result.phoneNumber, '+31 6 12345678');
});

test('normalizes an empty or whitespace-only string field to null', () => {
    const result = normalizeClientData({ email: '   ' } as never);
    assert.equal(result.email, null);
});

test('leaves a string field untouched when not present in the payload', () => {
    const result = normalizeClientData({ firstName: 'Ada' } as never);
    assert.equal('lastName' in result, false);
});
