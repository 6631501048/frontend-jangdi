export const calls=[];
let handlers={};
export function resetApi(next={}){calls.length=0;handlers=next;}
const request=method=>async(url,...args)=>{calls.push({method,url,args});if(!handlers[method])throw new Error(`Unexpected ${method} ${url}`);return handlers[method](url,...args);};
export default {get:request('get'),post:request('post'),patch:request('patch')};
