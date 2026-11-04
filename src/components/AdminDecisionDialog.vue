<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
const props = defineProps({
  title: {type:String,required:true}, message:String, requireReason:Boolean,
  minLength: {type:Number,default:5}, maxLength: {type:Number,default:1000},
  initialValue: {type:String,default:''}, confirmLabel: {type:String,default:'ยืนยัน'},
});
const emit = defineEmits(['confirm','cancel']);
const notes=ref(props.initialValue),error=ref(''),panel=ref(null),reasonInput=ref(null),confirmButton=ref(null);
const previousFocus=typeof document!=='undefined'?document.activeElement:null;
const titleId=`admin-decision-${Math.random().toString(36).slice(2)}`;
onMounted(()=>nextTick(()=>{(props.requireReason?reasonInput.value:confirmButton.value)?.focus();}));
onUnmounted(()=>previousFocus?.isConnected && previousFocus.focus?.());
function submit(){
  const value=notes.value.trim();
  if(props.requireReason && (value.length<props.minLength || value.length>props.maxLength)){
    error.value=`กรุณาระบุเหตุผล ${props.minLength}–${props.maxLength} ตัวอักษร`;reasonInput.value?.focus();return;
  }
  emit('confirm',value);
}
function keydown(event){
  if(event.key==='Escape'){event.preventDefault();emit('cancel');}
  if(event.key!=='Tab')return;
  const elements=Array.from(panel.value?.querySelectorAll('button, textarea') || []);
  const first=elements[0],last=elements.at(-1);
  if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
}
</script>
<template>
  <div class="decision-backdrop" @click.self="emit('cancel')" @keydown="keydown">
    <section ref="panel" class="decision-panel" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <h2 :id="titleId">{{title}}</h2><p v-if="message">{{message}}</p>
      <form novalidate @submit.prevent="submit">
        <label v-if="requireReason" class="decision-field">เหตุผล / หมายเหตุ ({{minLength}}–{{maxLength}} ตัวอักษร)<textarea ref="reasonInput" v-model="notes" rows="4" :maxlength="maxLength" :aria-invalid="!!error" @input="error=''" /></label>
        <p v-if="error" class="decision-error" role="alert">{{error}}</p>
        <div class="decision-actions"><button type="button" @click="emit('cancel')">ยกเลิก</button><button ref="confirmButton" type="submit" class="decision-confirm">{{confirmLabel}}</button></div>
      </form>
    </section>
  </div>
</template>
<style scoped>
.decision-backdrop{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:#10182880;padding:18px;overflow:auto}.decision-panel{width:min(100%,440px);max-height:90dvh;overflow:auto;border-radius:14px;background:#fff;color:#17212f;padding:20px;box-shadow:0 16px 48px #0003}.decision-panel h2{margin:0 0 10px;font-size:18px}.decision-panel p{font-size:14px;line-height:1.7}.decision-field{display:grid;gap:8px;font-size:13px}.decision-field textarea{width:100%;font:inherit;border:1px solid #98a2b3;border-radius:8px;padding:10px;resize:vertical}.decision-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}.decision-actions button{min-height:44px;padding:10px 16px;font:inherit;border:1px solid #d0d5dd;border-radius:8px;background:#fff;cursor:pointer}.decision-actions .decision-confirm{background:#ffc629;border-color:#ffc629;font-weight:700;color:#342600}.decision-error{color:#b42318}
</style>
