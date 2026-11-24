// Run from frontend: node scripts/check-stripe-test.cjs [--online]
// Reads backend configuration, never prints secrets, and never creates payments.
const path = require('node:path');
const {createRequire} = require('node:module');
const backend = path.resolve(__dirname,'../../backend');
const backendRequire = createRequire(path.join(backend,'package.json'));
backendRequire('dotenv').config({path:path.join(backend,'.env'),override:true});
const stripe = backendRequire('./src/services/stripe.service');

async function main() {
  const status = {
    testKeyConfigured:/^sk_test_/.test(process.env.STRIPE_SECRET_KEY || ''),
    webhookConfigured:!!process.env.STRIPE_WEBHOOK_SECRET,
    returnUrlConfigured:!!process.env.CLIENT_URL,
  };
  console.log(JSON.stringify(status,null,2));
  if (!stripe.configured() || !status.returnUrlConfigured) {
    console.error('NOT_READY: Set STRIPE_SECRET_KEY (sk_test_), STRIPE_WEBHOOK_SECRET and CLIENT_URL in backend/.env.');
    process.exitCode=2;return;
  }
  const url = new URL(process.env.CLIENT_URL);
  if (!['http:','https:'].includes(url.protocol)) throw new Error('Invalid CLIENT_URL');
  if (process.argv.includes('--online')) {
    const balance = await stripe.request('balance');
    if (balance.livemode !== false) throw new Error('Expected test-mode balance');
    console.log('TEST_ACCOUNT_OK: Read-only Stripe API check passed.');
  } else console.log('CONFIG_PRESENT: Use --online to verify the key with Stripe.');
  console.log('Webhook delivery, Checkout and refunds still require the project-account UAT checklist.');
}
main().catch(()=>{console.error('CHECK_FAILED: Check test credentials, CLIENT_URL and network access. No secrets printed.');process.exitCode=1;});
