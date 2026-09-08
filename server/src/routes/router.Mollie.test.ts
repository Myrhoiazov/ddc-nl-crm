import test from 'node:test';
import assert from 'node:assert/strict';
import mollieRouter from './router.Mollie';

type RouteLayer = {
    route?: {
        path?: string;
        methods?: Record<string, boolean>;
    };
};

const hasRoute = (method: string, path: string) => {
    const layers = (mollieRouter as { stack?: RouteLayer[] }).stack ?? [];

    return layers.some((layer) => layer.route?.path === path && Boolean(layer.route?.methods?.[method]));
};

test('Mollie router exposes DELETE /customers/:customerId', () => {
    assert.equal(hasRoute('delete', '/customers/:customerId'), true);
});

test('Mollie router exposes DELETE /subscriptions/:subscriptionId', () => {
    assert.equal(hasRoute('delete', '/subscriptions/:subscriptionId'), true);
});
