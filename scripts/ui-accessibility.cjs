// Runs inside Chrome through Runtime.evaluate; keep this function self-contained.
function auditAccessibility() {
  const visible=el=>{const rect=el.getBoundingClientRect(),style=getComputedStyle(el);return rect.width>0&&rect.height>0&&style.visibility!=='hidden'&&style.display!=='none';};
  const describe=el=>`${el.tagName.toLowerCase()}${el.id?'#'+el.id:'.'+String(el.className).trim().replaceAll(' ','.')}`;
  const failures=[],unnamed=[],small=[];
  const rgba=value=>{const numbers=value.match(/[\d.]+/g)?.map(Number)||[0,0,0];return [...numbers.slice(0,3),numbers[3]??1];};
  const blend=(foreground,background)=>foreground.slice(0,3).map((value,i)=>value*foreground[3]+background[i]*(1-foreground[3]));
  const luminance=color=>color.map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;}).reduce((total,value,i)=>total+value*[.2126,.7152,.0722][i],0);
  const background=el=>{
    const ancestors=[];let parent=el;
    while(parent){ancestors.unshift(parent);parent=parent.parentElement;}
    return ancestors.reduce((color,node)=>blend(rgba(getComputedStyle(node).backgroundColor),color),[255,255,255]);
  };
  for(const el of document.querySelectorAll('.app-shell *, .notification-panel, .notification-panel *')) {
    if(!visible(el)||el.closest('[inert]'))continue;
    const style=getComputedStyle(el);
    const content=[...el.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent.trim()).join('');
    if(content&&!['SCRIPT','STYLE','OPTION','SVG','PATH'].includes(el.tagName)&&!el.closest('button:disabled, input:disabled, select:disabled')) {
      const bg=background(el),fg=rgba(style.color);
      let opacity=1,parent=el;
      while(parent){opacity*=Number(getComputedStyle(parent).opacity);parent=parent.parentElement;}
      fg[3]*=opacity;
      const text=blend(fg,bg),a=luminance(text),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      const large=parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.66&&Number(style.fontWeight)>=700);
      const threshold=large?3:4.5;
      if(ratio<threshold&&content!=='★')failures.push({element:describe(el),text:content.slice(0,65),color:style.color,background:style.backgroundColor,ratio:+ratio.toFixed(2),threshold});
    }
    if(el.matches('button,input,select,textarea')) {
      const name=el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||el.getAttribute('title')||el.textContent.trim()||(el.labels?.length&&[...el.labels].some(label=>label.textContent.trim()));
      if(!name&&!el.matches('input[type=hidden]'))unnamed.push({element:describe(el),placeholder:el.getAttribute('placeholder'),type:el.type});
    }
    if(el.matches('button,a[class*="btn"],a.primary,a.apply')) {
      const rect=el.getBoundingClientRect();
      if(rect.height<43||rect.width<43)small.push({element:describe(el),text:el.textContent.trim().slice(0,40),width:+rect.width.toFixed(1),height:+rect.height.toFixed(1)});
    }
  }
  return {contrast:failures,unnamed,smallTargets:small};
}
module.exports={auditAccessibility};
