(()=>{'use strict';const photos=[["pa-home-nursery.jpg","ดูแลไม้ดอกในเรือนเพาะชำ"],["pa-home-food-waste.jpg","เก็บเศษอาหารประจำวัน"],["pa-home-compost.jpg","ดูแลกองปุ๋ย"]],labels=["รูปก่อนหน้า","รูปถัดไป","หยุด","เล่น"];
const root=document.getElementById('landscape-guest-gallery'),dialog=document.getElementById('profile-dialog');if(!root||!dialog)return;
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
const frame=el('figure'),image=el('img'),caption=el('figcaption'),tools=el('div');tools.className='guest-gallery-tools';image.decoding='async';
const buttons=[el('button',labels[0]),el('button',labels[1]),el('button',labels[2])];for(const b of buttons)b.type='button';
let current=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,timer;
function display(){const [file,title]=photos[current];image.src='common/'+file;image.alt=title;caption.textContent=title;buttons[2].textContent=paused?labels[3]:labels[2];}
function schedule(){clearTimeout(timer);root.hidden=!dialog.open||!document.body.classList.contains('profile-required');if(root.hidden)return;if(!image.getAttribute('src'))display();if(!paused&&!document.hidden)timer=setTimeout(()=>advance(1),6500);}
function advance(delta){current=(current+delta+photos.length)%photos.length;display();schedule();}
buttons[0].addEventListener('click',()=>advance(-1));buttons[1].addEventListener('click',()=>advance(1));buttons[2].addEventListener('click',()=>{paused=!paused;display();schedule();});
frame.append(image,caption);tools.append(...buttons);root.append(frame,tools);
const observer=new MutationObserver(schedule);observer.observe(dialog,{attributes:true,attributeFilter:['open']});observer.observe(document.body,{attributes:true,attributeFilter:['class']});document.addEventListener('visibilitychange',schedule);schedule();
})();
