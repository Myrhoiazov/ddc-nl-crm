import assert from 'node:assert/strict';
import test from 'node:test';
import {
    clearFlowState, getFlowState, hasActiveFlow, setFlowState,
} from './telegram-admin-bot.state';

// No REDIS_URL is set in this test environment, so these exercise the in-memory fallback path —
// the same convention auth/auth.rate-limit.service.ts already uses and is already tested under.

test('getFlowState returns null for a user with no state', async () => {
    assert.equal(await getFlowState('no-such-user'), null);
    assert.equal(await hasActiveFlow('no-such-user'), false);
});

test('setFlowState then getFlowState round-trips the stored state', async () => {
    const userId = 'user-1';
    await setFlowState(userId, { flow: 'create-student', step: 'FIRST_NAME', data: {}, chatId: '555' });
    const state = await getFlowState(userId);
    assert.deepEqual(state, { flow: 'create-student', step: 'FIRST_NAME', data: {}, chatId: '555' });
    assert.equal(await hasActiveFlow(userId), true);
});

test('clearFlowState removes the stored state', async () => {
    const userId = 'user-2';
    await setFlowState(userId, { flow: 'payment-link', step: 'AMOUNT', data: { clientId: 7 }, chatId: '555' });
    await clearFlowState(userId);
    assert.equal(await getFlowState(userId), null);
    assert.equal(await hasActiveFlow(userId), false);
});

test('state is isolated per Telegram user id', async () => {
    await setFlowState('user-a', { flow: 'a', step: '1', data: {}, chatId: '1' });
    await setFlowState('user-b', { flow: 'b', step: '1', data: {}, chatId: '1' });
    assert.equal((await getFlowState('user-a'))?.flow, 'a');
    assert.equal((await getFlowState('user-b'))?.flow, 'b');
});
