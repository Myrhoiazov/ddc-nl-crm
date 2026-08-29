import assert from 'node:assert/strict';
import test from 'node:test';
import { addressesToJson } from './service.EmailImap';

test('addressesToJson keeps only entries with an address, dropping the rest', () => {
    const result = addressesToJson([
        { address: 'a@example.com', name: 'A' },
        { name: 'No address here' },
        { address: 'b@example.com' },
    ]);

    assert.deepEqual(result, [
        { address: 'a@example.com', name: 'A' },
        { address: 'b@example.com', name: undefined },
    ]);
});

test('addressesToJson returns an empty array for missing/undefined input', () => {
    assert.deepEqual(addressesToJson(undefined), []);
    assert.deepEqual(addressesToJson(null), []);
    assert.deepEqual(addressesToJson([]), []);
});
