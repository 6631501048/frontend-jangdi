import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordValidationMessage, recoveryToken } from '../src/services/passwordRecovery.js';

test('new passwords support Thai but reject bcrypt truncation and mismatched confirmation', () => {
  assert.equal(passwordValidationMessage('ก'.repeat(24), 'ก'.repeat(24)), '');
  assert(passwordValidationMessage('ก'.repeat(25), 'ก'.repeat(25)));
  assert(passwordValidationMessage('short', 'short'));
  assert(passwordValidationMessage('good-password', 'different-password'));
  assert.equal(passwordValidationMessage('new-password-123', 'new-password-123'), '');
});

test('reset tokens are extracted only from valid email link fragments', () => {
  const token = 'ab'.repeat(32);
  assert.equal(recoveryToken(`#token=${token}`), token);
  for (const hash of ['', '#token=expired', '#token=null', '#other=anything', '#token=%3Cscript%3E']) assert.equal(recoveryToken(hash), '');
});
