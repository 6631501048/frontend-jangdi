import {reactive} from 'vue';
export const route=reactive({query:{},path:'/admin/payments'});
export const useRoute=()=>route;
export const useRouter=()=>({push(){},back(){}});
export default {currentRoute:{value:route}};
