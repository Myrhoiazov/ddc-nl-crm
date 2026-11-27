import assert from 'node:assert/strict';
import test from 'node:test';
import server from '../../app';

process.env.SECRET_SALT ||= 'test-secret-salt';

const listen = () => new Promise<number>((resolve) => {
    server.listen(0, () => {
        const address = server.address();
        resolve(typeof address === 'object' && address ? address.port : 0);
    });
});

const close = () => new Promise<void>((resolve) => server.close(() => resolve()));

// Без флага продаж публичный API закрыт целиком и до базы данных не доходит.
test('the public ticketing API answers 503 while sales are disabled', async () => {
    delete process.env.TICKETING_SALES_ENABLED;
    const port = await listen();
    const base = `http://127.0.0.1:${port}/api/v1/ticketing/public`;

    try {
        const map = await fetch(`${base}/sessions/1`);
        const checkout = await fetch(`${base}/orders`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });

        assert.equal(map.status, 503);
        assert.equal(checkout.status, 503);
    } finally {
        await close();
    }
});
