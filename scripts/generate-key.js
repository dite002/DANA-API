import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('keys', { recursive: true });

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

writeFileSync('keys/private.pem', privateKey, { mode: 0o600 });
console.log('Created keys/private.pem');
console.log('IMPORTANT: Never commit this file or share the private key.');
console.log('Register/upload the corresponding public key with DANA Sandbox as required by your DANA onboarding.');
