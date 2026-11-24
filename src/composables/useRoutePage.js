import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
export function useRoutePage(onHistoryChange) {
  const route=useRoute(),router=useRouter();
  const read=()=>{const value=Number(route.query?.page || 1);return Number.isSafeInteger(value)&&value>0?value:1;};
  const page=ref(read());
  watch(()=>route.query?.page,()=>{const next=read();if(next!==page.value){page.value=next;onHistoryChange?.();}});
  watch(page,value=>{
    if(value===read())return;
    const query={...route.query};if(value===1)delete query.page;else query.page=String(value);
    router.push({query});
  });
  return page;
}
