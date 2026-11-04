import {createRenderer,h,nextTick} from 'vue';
import {createPinia} from 'pinia';
// Exercise compiled Vue components and real event handlers without a browser.
// Only the rendering host is replaced; Vue reactivity, directives and lifecycle run normally.
globalThis.Document=class {};
globalThis.ShadowRoot=class {};
globalThis.document=new Document();
document.activeElement=null;
globalThis.window={prompt(){throw new Error('Native prompt must not be used');},confirm(){throw new Error('Native confirm must not be used');},alert(){throw new Error('Native alert must not be used');}};
class Node {
  constructor(tag,text=''){this.tag=tag;this.tagName=tag.toUpperCase();this.type=tag==='textarea'?'textarea':'text';this.text=text;this.children=[];this.parentNode=null;this.props={};this.style={};this.events={};this.defaultValue='';this._inputValue='';this.isConnected=true;}
  addEventListener(type,handler){(this.events[type]??=[]).push(handler);}
  removeEventListener(type,handler){this.events[type]=(this.events[type] || []).filter(item=>item!==handler);}
  dispatchEvent(event){event.target??=this;for(const handler of this.events[event.type] || [])handler(event);return true;}
  getRootNode(){return document;}
  focus(){document.activeElement=this;}
  querySelectorAll(selector){return walk(this).filter(item=>selector.split(',').map(value=>value.trim()).includes(item.tag));}
  get options(){return this.children.filter(item=>item.tag==='option');}
  get value(){return this.tag==='option' && !this._inputValue?text(this):this._inputValue;}
  set value(value){this._inputValue=value;}
}
export function walk(node){return [node,...node.children.flatMap(walk)];}
export function text(node){return node.text+node.children.map(text).join('');}
function remove(node){if(node.parentNode){const siblings=node.parentNode.children;const index=siblings.indexOf(node);if(index>=0)siblings.splice(index,1);}node.parentNode=null;node.isConnected=false;}
const renderer=createRenderer({
  createElement:tag=>new Node(tag),createText:value=>new Node('#text',value),createComment:value=>new Node('#comment',value),
  setText(node,value){node.text=value;},setElementText(node,value){node.text=value;node.children=[];},
  parentNode:node=>node.parentNode,nextSibling(node){if(!node.parentNode)return null;const siblings=node.parentNode.children;return siblings[siblings.indexOf(node)+1] || null;},
  insert(node,parent,anchor=null){remove(node);node.parentNode=parent;node.isConnected=true;const index=parent.children.indexOf(anchor);if(index<0)parent.children.push(node);else parent.children.splice(index,0,node);},
  remove,patchProp(node,key,oldValue,value){node.props[key]=value;if(key==='value')node.value=value;if(key==='type')node.type=value;},
});
export async function flush(){await nextTick();await new Promise(resolve=>setImmediate(resolve));await nextTick();}
export async function mount(component,props={}){
  const root=new Node('root');const app=renderer.createApp(component,props);app.use(createPinia());app.component('RouterLink',{props:['to'],setup(_,ctx){return()=>h('a',{},ctx.slots.default?.());}});
  app.mount(root);await flush();return {root,unmount:()=>app.unmount()};
}
export function find(root,tag,label){const node=walk(root).find(item=>item.tag===tag && (label===undefined || text(item).includes(label)));if(!node)throw new Error(`Cannot find ${tag}: ${label}\n${text(root)}`);return node;}
export function fire(node,type,extra={}){
  const event={type,target:node,currentTarget:node,preventDefault(){},stopPropagation(){},...extra};node.dispatchEvent(event);
  const handler=node.props['on'+type[0].toUpperCase()+type.slice(1)];if(handler){const result=handler(event);if(result?.catch)result.catch(error=>{throw error;});}
}
export async function input(node,value){node.value=value;fire(node,'input');await flush();}
