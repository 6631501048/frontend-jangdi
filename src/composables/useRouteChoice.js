import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
// Keep list tabs in the URL so Back/Forward and direct links restore the same view.
export function useRouteChoice(key, values, initial) {
  const route=useRoute(), router=useRouter();
  const read=()=>values.includes(route.query?.[key]) ? route.query[key] : initial;
  const choice=ref(read());
  watch(()=>route.query?.[key],()=>{ choice.value=read(); });
  watch(choice,value=>{
    if(value===read())return;
    const query={...route.query};
    if(value===initial)delete query[key];else query[key]=value;
    router.push({query});
  });
  return choice;
}
