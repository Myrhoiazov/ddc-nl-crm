import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildCreateStudentConfirmText, parseNameInput, parseSkippableInput,
} from './telegram-admin-bot.student-create.flow';

test('parseNameInput splits first token as firstName and the rest as lastName', () => {
    const result = parseNameInput('Anna Maria Petrova');
    assert.deepEqual(result, { firstName: 'Anna', lastName: 'Maria Petrova' });
});

test('parseNameInput accepts a single word as firstName only', () => {
    const result = parseNameInput('Anna');
    assert.deepEqual(result, { firstName: 'Anna', lastName: undefined });
});

test('parseNameInput rejects empty input', () => {
    const result = parseNameInput('   ');
    assert.ok('error' in result);
});

test('parseSkippableInput treats "-" and blank as skip', () => {
    assert.equal(parseSkippableInput('-'), undefined);
    assert.equal(parseSkippableInput('   '), undefined);
    assert.equal(parseSkippableInput(' anna@example.com '), 'anna@example.com');
});

test('buildCreateStudentConfirmText renders skipped fields as a dash and escapes HTML', () => {
    const text = buildCreateStudentConfirmText({ firstName: 'Anna', lastName: '<b>X</b>' });
    assert.match(text, /Anna &lt;b&gt;X&lt;\/b&gt;/);
    assert.match(text, /Телефон: —/);
    assert.match(text, /Email: —/);
});
