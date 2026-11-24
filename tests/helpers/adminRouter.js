import {reactive} from 'vue';
export const route=reactive({query:{},path:'/admin/payments'});
export const routerCalls=[];
export const routerHistory={back:null};
const router={options:{history:{state:routerHistory}},push(destination){routerCalls.push({method:'push',destination});},replace(destination){routerCalls.push({method:'replace',destination});},back(){routerCalls.push({method:'back'});},currentRoute:{value:route}};
export const useRoute=()=>route;
export const useRouter=()=>router;
export default router;
