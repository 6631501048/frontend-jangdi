import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {parse,compileScript}=require('@vue/compiler-sfc');
const apiUrl=new URL('./helpers/adminApi.js',import.meta.url).href;
const routerUrl=new URL('./helpers/adminRouter.js',import.meta.url).href;
export async function resolve(specifier,context,nextResolve){
  if(specifier==='vue-router')return {url:routerUrl,shortCircuit:true};
  if(specifier.startsWith('.')){
    const url=new URL(specifier,context.parentURL);
    if(url.pathname.endsWith('/src/services/api') || url.pathname.endsWith('/src/services/api.js'))return {url:apiUrl,shortCircuit:true};
    if(!/\.[a-z]+$/i.test(url.pathname) && existsSync(new URL(url.href+'.js')))return {url:url.href+'.js',shortCircuit:true};
  }
  return nextResolve(specifier,context);
}
export async function load(url,context,nextLoad){
  if(url.endsWith('.vue')){
    const source=await readFile(new URL(url),'utf8');const {descriptor}=parse(source,{filename:url});
    const script=compileScript(descriptor,{id:'test-component',inlineTemplate:true,templateOptions:{compilerOptions:{hoistStatic:false}}});
    return {format:'module',source:script.content,shortCircuit:true};
  }
  return nextLoad(url,context);
}
