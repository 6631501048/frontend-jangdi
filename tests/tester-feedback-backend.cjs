const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');const {createRequire}=require('node:module');
const root=path.resolve('../backend/src'),backendRequire=createRequire(path.join(root,'../package.json')),express=backendRequire('express');
const ids={user:'507f1f77bcf86cd799439011',admin:'507f1f77bcf86cd799439012'};
let rows=[],server,base,savedJob;
const members={[ids.user]:{_id:ids.user,fullName:'Tester',email:'tester@example.com',currentRole:'worker',bankAccount:{accountNumber:'PRIVATE'}},[ids.admin]:{_id:ids.admin,fullName:'Admin',isAdmin:true,currentRole:'hirer'}};
const matches=(row,filter)=>Object.entries(filter).every(([key,value])=>String(row[key])===String(value));
function query(data){let fields,populate=false,skip=0,limit=Infinity;return {select(value){fields=value;return this},populate(){populate=true;return this},sort(){return this},skip(value){skip=value;return this},limit(value){limit=value;return this},then(resolve,reject){const project=row=>{if(!row)return null;let out={...row};if(fields)out=Object.fromEntries(['_id',...fields.split(' ')].filter(key=>key in out).map(key=>[key,out[key]]));if(populate){const author=members[row.author];out.author=author?{_id:author._id,fullName:author.fullName,email:author.email}:null}return out};return Promise.resolve(Array.isArray(data)?data.slice(skip,skip+limit).map(project):project(data)).then(resolve,reject)}};}
const model={async create(data){const item={...data,_id:String(rows.length+1).padStart(24,'0'),status:'new',createdAt:new Date()};rows.push(item);return item},async countDocuments(filter){return rows.filter(row=>matches(row,filter)).length},find(filter){return query(rows.filter(row=>matches(row,filter)))},findOneAndUpdate(filter,update){const item=rows.find(row=>matches(row,filter));if(item)Object.assign(item,update.$set);return query(item)},findById(id){return query(rows.find(row=>row._id===id))}};
function load(relative,overrides={}){const filename=path.join(root,relative);const req=createRequire(filename);const mod={exports:{}};vm.runInThisContext('(function(require,module,exports,__dirname){'+fs.readFileSync(filename,'utf8')+'\n})',{filename})(id=>id in overrides?overrides[id]:req(id),mod,mod.exports,path.dirname(filename));return mod.exports;}
const actualAuth=load('middleware/auth.middleware.js',{'../models':{User:{}}});
const auth={protect(req,res,next){const role=req.headers['x-test-role'];if(!['user','admin'].includes(role))return res.status(401).json({message:'Login required'});req.user=members[ids[role]];next()},adminOnly:actualAuth.adminOnly};
const controller=load('controllers/testerFeedback.controller.js',{'../models/TesterFeedback':model});
test.beforeEach(async()=>{
 rows=[];savedJob=null;const app=express();app.use(express.json());
 app.use('/tester-feedback',load('routes/testerFeedback.routes.js',{'../middleware/auth.middleware':auth,'../controllers/testerFeedback.controller':controller}));
 app.use('/admin/tester-feedback',load('routes/adminTesterFeedback.routes.js',{'../middleware/auth.middleware':auth,'../controllers/testerFeedback.controller':controller}));
 app.use((err,req,res,next)=>res.status(500).json({message:err.message}));
 server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});base='http://127.0.0.1:'+server.address().port;
});
test.afterEach(()=>new Promise(resolve=>server.close(resolve)));
async function request(route,{role='user',method='GET',body}={}){const res=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(role?{'x-test-role':role}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,body:await res.json()};}
test('authenticated comments are stored under the sender and available only to admin',async()=>{
 const result=await request('/tester-feedback',{method:'POST',body:{message:'  Good app  ',category:'suggestion',pagePath:'/worker/jobs',author:ids.admin,status:'read'}});assert.equal(result.status,201);assert.equal(rows[0].message,'Good app');assert.equal(rows[0].author,ids.user);assert.equal(rows[0].role,'worker');assert.equal(rows[0].status,'new');
 assert.equal((await request('/admin/tester-feedback')).status,403);assert.equal((await request('/admin/tester-feedback',{role:null})).status,401);
 const list=await request('/admin/tester-feedback',{role:'admin'});assert.equal(list.status,200);assert.equal(list.body.items[0].message,'Good app');assert.equal(list.body.items[0].author.bankAccount,undefined);
});
test('anonymous, empty, oversized and unsafe-context submissions are rejected',async()=>{
 assert.equal((await request('/tester-feedback',{method:'POST',role:null,body:{message:'hello'}})).status,401);
 for(const body of [{message:' '},{message:'a'.repeat(2001)},{message:{text:'bad'}},{message:'hello',category:'wrong'},{message:'hello',pagePath:'//evil.test'},{message:'hello',pagePath:'/reset-password?token=secret'}])assert.equal((await request('/tester-feedback',{method:'POST',body})).status,400);
 assert.equal(rows.length,0);
});
test('admin can filter and mark read idempotently; ordinary users cannot mark read',async()=>{
 await request('/tester-feedback',{method:'POST',body:{message:'Found a bug'}});const id=rows[0]._id;
 assert.equal((await request('/admin/tester-feedback/'+id+'/read',{method:'PATCH'})).status,403);
 const mark=await request('/admin/tester-feedback/'+id+'/read',{method:'PATCH',role:'admin'});assert.equal(mark.status,200);assert.equal(mark.body.item.status,'read');const readAt=mark.body.item.readAt;
 assert.equal((await request('/admin/tester-feedback?status=new',{role:'admin'})).body.total,0);assert.equal((await request('/admin/tester-feedback?status=read',{role:'admin'})).body.total,1);
 assert.equal((await request('/admin/tester-feedback/'+id+'/read',{method:'PATCH',role:'admin'})).body.item.readAt,readAt);
});
test('feedback pagination clamps stale pages and invalid filters are rejected',async()=>{
 for(let i=0;i<25;i++)await model.create({author:ids.user,role:'worker',message:'Feedback '+i});
 const list=await request('/admin/tester-feedback?page=99',{role:'admin'});assert.equal(list.body.page,2);assert.equal(list.body.items.length,5);assert.equal(list.body.total,25);
 assert.equal((await request('/admin/tester-feedback?status=invalid',{role:'admin'})).status,400);
});
test('Hirer job API accepts missing extra notes while still requiring the main description',async()=>{
 const overrides={'../models':{Job:{create:async data=>{savedJob={...data,_id:'job'};return savedJob}}},'../utils/contentFilter':{checkContent:()=>({passed:true})}};
 const filename=path.join(root,'controllers/job.controller.js'),req=createRequire(filename),mod={exports:{}};
 vm.runInThisContext('(function(require,module,exports,__dirname){'+fs.readFileSync(filename,'utf8')+'\n})',{filename})(id=>id in overrides?overrides[id]:id.startsWith('../services/')?new Proxy({},{get:()=>async()=>{}}):req(id),mod,mod.exports,path.dirname(filename));
 const call=async body=>{const res={statusCode:200,status(code){this.statusCode=code;return this},json(body){this.body=body;return this}};await mod.exports.createJob({body,user:members[ids.user],app:{get:()=>null}},res,error=>{throw error});return res};
 const valid={category:'cleaning',title:'Clean room',description:'Please help cleaning',price:100,scheduledAt:new Date(Date.now()+86400000).toISOString(),lat:20,lng:99};
 assert.equal((await call(valid)).statusCode,201);assert.equal(savedJob.notes,undefined);assert.equal((await call({...valid,description:''})).statusCode,400);
});
test('comment endpoint limits repeated submissions per authenticated tester',async()=>{
 for(let i=0;i<10;i++)assert.equal((await request('/tester-feedback',{method:'POST',body:{message:'Comment '+i}})).status,201);
 assert.equal((await request('/tester-feedback',{method:'POST',body:{message:'One more'}})).status,429);assert.equal(rows.length,10);
});
