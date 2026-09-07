import test from 'node:test';
import assert from 'node:assert/strict';
import mollieRouter from './router.Mollie';

const hasRoute = (method: string, path: string) => {
    const stack = (mollieRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }).stack;

    return stack.some((layer) => layer.route?.path === path && layer.route.methods[method]);
};

test('Mollie router exposes DELETE /customers/:customerId', () => {
    assert.equal(hasRoute('delete', '/customers/:customerId'), true);
});
