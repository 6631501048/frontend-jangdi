import test from 'node:test';
import assert from 'node:assert/strict';
import {mount,walk,text,fire,flush} from './helpers/vueHost.js';
import {resetApi,calls} from './helpers/adminApi.js';
import {resolveBackendAssetUrl} from '../src/services/backendAssets.js';
import {defineComponent,h,ref} from 'vue';
import Avatar from '../src/components/UserAvatar.vue';
import Profile from '../src/views/ProfileView.vue';
window.location={origin:'http://localhost:5173',protocol:'http:'};
const old='/uploads/avatars/old.png',saved='/uploads/avatars/saved.png';
let account,storage;
test.beforeEach(()=>{
 account={_id:'avatar-test',isAdmin:true,fullName:'Test User',email:'fixture@example.com',avatarUrl:old};
 storage=new Map([['jangdi_auth',JSON.stringify({token:'fixture-only',user:account})]]);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
});
function setup(post){resetApi({get:async()=>({data:account}),post});}
const image=view=>walk(view.root).find(n=>n.tag==='img');
const fileInput=view=>walk(view.root).find(n=>n.props.type==='file');
async function upload(view,file){fire(fileInput(view),'change',{target:{files:[file],value:'chosen.png'}});await flush();}
test('avatar paths resolve against the API origin, including legacy paths and Google pictures',()=>{
 assert.equal(resolveBackendAssetUrl(old),'http://localhost:4000'+old);
 assert.equal(resolveBackendAssetUrl(old.slice(1)),'http://localhost:4000'+old);
 assert.equal(resolveBackendAssetUrl('https://lh3.googleusercontent.com/picture'),'https://lh3.googleusercontent.com/picture');
 assert.equal(resolveBackendAssetUrl('//cdn.example.com/avatar.png'),'http://cdn.example.com/avatar.png');
 for(const value of [null,'','javascript:alert(1)','data:image/png;base64,abc'])assert.equal(resolveBackendAssetUrl(value),null);
});
test('a broken avatar shows initials; changing the source recovers the image',async()=>{
 const src=ref(old);const Wrapper=defineComponent({setup:()=>()=>h(Avatar,{src:src.value,name:'Test User'})});
 const view=await mount(Wrapper);
 try {assert.equal(image(view).props.src,'http://localhost:4000'+old);fire(image(view),'error');await flush();assert.equal(image(view),undefined);assert(text(view.root).includes('TU'));src.value=saved;await flush();assert.equal(image(view).props.src,'http://localhost:4000'+saved);}finally{view.unmount();}
});
test('successful profile upload persists the returned avatar and survives reopening the page',async()=>{
 setup(async(url,form)=>{assert.equal(url,'/users/me/avatar');assert.equal(form.get('avatar').type,'image/png');account={...account,avatarUrl:saved};return {data:{avatarUrl:saved}};});
 const view=await mount(Profile);try{await upload(view,new File(['png'],'photo.png',{type:'image/png'}));assert.equal(image(view).props.src,'http://localhost:4000'+saved);assert.equal(JSON.parse(storage.get('jangdi_auth')).user.avatarUrl,saved);}finally{view.unmount();}
 const next=await mount(Profile);try{assert.equal(image(next).props.src,'http://localhost:4000'+saved);}finally{next.unmount();}
});
test('upload failure keeps the saved image and does not persist a misleading preview',async()=>{
 setup(async()=>{throw {response:{data:{message:'Upload failed'}}};});
 const view=await mount(Profile);try{await upload(view,new File(['png'],'photo.png',{type:'image/png'}));assert.equal(image(view).props.src,'http://localhost:4000'+old);assert.equal(JSON.parse(storage.get('jangdi_auth')).user.avatarUrl,old);assert(text(view.root).includes('Upload failed'));assert.equal(fileInput(view).props.disabled,undefined);}finally{view.unmount();}
});
test('non-images and files exceeding the backend 5 MB limit never reach the upload API',async()=>{
 setup(async()=>{throw new Error('Must not upload');});const view=await mount(Profile);
 try{await upload(view,new File(['text'],'photo.txt',{type:'text/plain'}));await upload(view,new File([new Uint8Array(5*1024*1024+1)],'huge.png',{type:'image/png'}));assert.equal(calls.filter(c=>c.method==='post').length,0);assert.equal(image(view).props.src,'http://localhost:4000'+old);}finally{view.unmount();}
});

test('accounts without a display name or avatar still render a safe placeholder',async()=>{
 const view=await mount(Avatar,{src:null,name:null});try{assert.equal(image(view),undefined);assert(text(view.root).includes('👤'));}finally{view.unmount();}
});
