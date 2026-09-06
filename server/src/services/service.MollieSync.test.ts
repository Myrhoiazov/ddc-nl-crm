import assert from 'node:assert/strict';
import test from 'node:test';
import {
    resolveSyncStatus,
    buildMandateUpsertArgs,
    buildSubscriptionUpsertArgs,
} from './service.MollieSync';

test('resolveSyncStatus is skipped when the Mollie record has no id', () => {
    assert.equal(resolveSyncStatus(null, new Set()), 'skipped');
    assert.equal(resolveSyncStatus(undefined, new Set(['mdt_1'])), 'skipped');
});

test('resolveSyncStatus is created when the id is not in the existing set', () => {
    assert.equal(resolveSyncStatus('mdt_1', new Set(['mdt_2'])), 'created');
});

test('resolveSyncStatus is updated when the id is already in the existing set', () => {
    assert.equal(resolveSyncStatus('mdt_1', new Set(['mdt_1', 'mdt_2'])), 'updated');
});

test('buildMandateUpsertArgs shapes a valid upsert for a new mandate', () => {
    const args = buildMandateUpsertArgs(7, {
        id: 'mdt_1',
        status: 'valid',
        method: 'directdebit',
        signatureDate: '2026-01-01',
        mandateReference: 'ref-1',
    } as never);

    assert.deepEqual(args.where, { mollieId: 'mdt_1' });
    assert.equal(args.create.customerId, 7);
    assert.equal(args.create.mollieId, 'mdt_1');
    assert.equal(args.create.mandateReference, 'ref-1');
    assert.equal(args.update.customerId, 7);
    assert.equal(args.update.status, 'valid');
});

test('buildMandateUpsertArgs falls back to null mandateReference on create, undefined on update', () => {
    const args = buildMandateUpsertArgs(1, {
        id: 'mdt_2',
        status: 'valid',
        method: 'directdebit',
        signatureDate: null,
        mandateReference: null,
    } as never);

    assert.equal(args.create.mandateReference, null);
    assert.equal(args.update.mandateReference, undefined);
});

test('buildSubscriptionUpsertArgs carries the resolved local mandate id', () => {
    const args = buildSubscriptionUpsertArgs(3, {
        id: 'sub_1',
        description: 'Monthly plan',
        amount: { value: '50.00', currency: 'EUR' },
        interval: '1 month',
        metadata: null,
        startDate: '2026-01-01',
        nextPaymentDate: '2026-02-01',
        status: 'active',
        times: null,
        mandateId: 'mdt_1',
    } as never, 42);

    assert.equal(args.create.mandateId, 42);
    assert.equal(args.update.mandateId, 42);
    assert.equal(args.create.customerId, 3);
    assert.equal(args.create.amountValue, '50.00');
});

test('buildSubscriptionUpsertArgs falls back to null/undefined mandateId when unresolved', () => {
    const args = buildSubscriptionUpsertArgs(3, {
        id: 'sub_2',
        description: 'No mandate',
        amount: { value: '10.00', currency: 'EUR' },
        interval: '1 month',
        metadata: null,
        startDate: null,
        nextPaymentDate: null,
        status: 'active',
        times: null,
        mandateId: null,
    } as never, null);

    assert.equal(args.create.mandateId, null);
    assert.equal(args.update.mandateId, undefined);
});
