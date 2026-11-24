import { ref, watch, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
export function useWizardSteps(total) {
  const route=useRoute(),router=useRouter(),step=ref(1);
  let furthest=1;
  const read=()=>Number(route.query?.step || 1);
  const destination=(value)=>{
    const query={...route.query};if(value===1)delete query.step;else query.step=String(value);
    return {query};
  };
  // A fresh load has no draft, so never show an empty confirmation step.
  onMounted(()=>{if(read()!==1)router.replace(destination(1));});
  watch(()=>route.query?.step,()=>{
    const value=read();
    if(!Number.isInteger(value)||value<1||value>furthest){router.replace(destination(step.value));return;}
    step.value=value;
  });
  watch(step,async(value)=>{
    furthest=Math.max(furthest,Math.min(value,total));
    if(value!==read())router.push(destination(value));
    await nextTick();
    const heading=document.querySelector?.('.step-body h2, .step-body h3, .content .section-title');
    if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
    window.scrollTo?.({top:0,left:0});
  });
  return step;
}
