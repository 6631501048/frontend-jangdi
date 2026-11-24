// A separate backend process uses the public test origin without changing backend/.env.
const path=require('node:path');
const {createRequire}=require('node:module');
const backend=path.resolve(__dirname,'../../backend');
process.chdir(backend);
const req=createRequire(path.join(backend,'package.json'));
req('./server.js');
const io=req('./src/app.js').get('io');
const {protect}=req('./src/middleware/auth.middleware.js');
// Public sessions may join only their authenticated account's notification room.
io.removeAllListeners('connection');
io.use((socket,next)=>{
 const token=socket.handshake.auth?.token;
 if(typeof token!=='string')return next(new Error('Authentication required'));
 const res={status(){return this},json(){next(new Error('Authentication required'));}};
 const request={headers:{authorization:`Bearer ${token}`}};
 protect(request,res,error=>{if(error)return next(error);socket.data.accountId=String(request.user._id);next();});
});
io.on('connection',socket=>socket.join(`user:${socket.data.accountId}`));
req('mongoose').connection.once('connected',()=>process.send?.('db-ready'));
