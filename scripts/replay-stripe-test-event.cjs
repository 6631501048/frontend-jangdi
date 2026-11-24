// Local test recovery only: retrieve a genuine Stripe event and deliver it to
// the local webhook with a fresh, locally generated signature. No new payment.
// Usage: node scripts/replay-stripe-test-event.cjs evt_... --deliver
const path=require('node:path');
const crypto=require('node:crypto');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'../../backend'),backendRequire=createRequire(path.join(root,'package.json'));
backendRequire('dotenv').config({path:path.join(root,'.env'),override:true});
const stripe=backendRequire('./src/services/stripe.service');
async function main(){
  const eventId=process.argv[2];
  if(!/^evt_[A-Za-z0-9]+$/.test(eventId||'') || process.env.NODE_ENV==='production' || !stripe.configured())throw new Error('LOCAL_TEST_CONFIGURATION_REQUIRED');
  const event=await stripe.request('events/'+eventId);
  if(event.id!==eventId || event.livemode!==false || !['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))throw new Error('EXPECTED_TEST_CHECKOUT_EVENT');
  const session=event.data?.object;
  if(session?.payment_status!=='paid' || session.currency!=='thb' || !session.client_reference_id)throw new Error('EXPECTED_PAID_THB_SESSION');
  // Confirm the current object in the same sandbox before delivering old event data.
  const current=await stripe.request('checkout/sessions/'+session.id);
  if(current.livemode!==false || current.payment_status!=='paid' || current.amount_total!==session.amount_total || current.currency!==session.currency || current.client_reference_id!==session.client_reference_id)throw new Error('CURRENT_SESSION_MISMATCH');
  console.log(JSON.stringify({verifiedStripeEvent:true,type:event.type,paymentStatus:current.payment_status,totalTHB:current.amount_total/100}));
  if(!process.argv.includes('--deliver')){console.log('Read-only check. Add --deliver for local test replay.');return;}
  const port=Number(process.env.PORT||4000);
  if(!Number.isInteger(port) || port<1 || port>65535)throw new Error('INVALID_LOCAL_PORT');
  const body=JSON.stringify(event),timestamp=Math.floor(Date.now()/1000);
  const signature=crypto.createHmac('sha256',process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest('hex');
  const response=await fetch(`http://127.0.0.1:${port}/api/payments/stripe/webhook`,{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':`t=${timestamp},v1=${signature}`},body,signal:AbortSignal.timeout(30000),redirect:'error'});
  console.log(JSON.stringify({localReplay:true,webhookHttpStatus:response.status}));
  if(!response.ok)throw new Error(response.status===400?'CHECK_BACKEND_SIGNING_SECRET_AND_RESTART':'LOCAL_WEBHOOK_REJECTED');
  const mongoose=backendRequire('mongoose');
  try{
    await mongoose.connect(process.env.MONGO_URI,{serverSelectionTimeoutMS:15000,autoIndex:false,autoCreate:false});
    const payment=await mongoose.connection.collection('payments').findOne({stripeSessionId:session.id,paymentMode:'stripe_test'},{projection:{status:1}});
    console.log(JSON.stringify({paymentStatusInDatabase:payment?.status||'not_found'}));
    if(!payment || payment.status==='pending')throw new Error('PAYMENT_NOT_UPDATED_CHECK_DATABASE_AND_SESSION');
  }finally{await mongoose.disconnect();}
}
main().catch(error=>{const known=/^[A-Z0-9_]+$/.test(error.message||'')?error.message:'CHECK_STRIPE_ACCESS_NETWORK_AND_LOCAL_BACKEND';console.error(known);process.exitCode=1;});
