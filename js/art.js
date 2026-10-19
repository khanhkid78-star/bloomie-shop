/* ---------- flower illustration kit (all vector, no photos) ---------- */
let uid=0;
const f=v=>Math.round(v*10)/10;
const rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const G={a:'#5f8a5e',b:'#76a072',c:'#4a7352',d:'#8fb58a'};
const PAL={
  red:{b:'#b8142b',m:'#d12a40',l:'#ea5b6d',d:'#760a1a'},
  hot:{b:'#d9365f',m:'#e8537a',l:'#f58aa6',d:'#98183a'},
  pink:{b:'#ef9fb1',m:'#f5b8c5',l:'#fbd9e0',d:'#c46a84'},
  cream:{b:'#f1d3c2',m:'#f7e2d5',l:'#fdf1e9',d:'#cf9f86'}
};
const PAPER={
  black:{back:'#2b282c',front:'#18161a'},pink:{back:'#efb7bf',front:'#f8cfd3'},kraft:{back:'#b98f63',front:'#d3af87'},
  cream:{back:'#e5d9c6',front:'#f6efe3'},blush:{back:'#f0c3c1',front:'#fbdfdb'},sage:{back:'#9db79d',front:'#c3d6c1'}
};
const leaf=(x,y,L,rot,c)=>`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})"><path d="M0 0C${f(L*.35)} ${f(-L*.2)} ${f(L*.34)} ${f(-L*.78)} 0 ${f(-L)}C${f(-L*.34)} ${f(-L*.78)} ${f(-L*.35)} ${f(-L*.2)} 0 0Z" fill="${c}"/><path d="M0 0V${f(-L*.9)}" stroke="#fff" stroke-opacity=".28" stroke-width=".7"/></g>`;
const rose=(x,y,r,p,rot)=>{const a=r*.3;return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})"><circle r="${f(r)}" fill="${p.b}" stroke="${p.d}" stroke-opacity=".5" stroke-width=".7"/><path d="M${f(-r*.8)} ${f(-r*.25)}Q${f(-r*.45)} ${f(-r*.95)} 0 ${f(-r*.9)}Q${f(r*.6)} ${f(-r*.88)} ${f(r*.82)} ${f(-r*.1)}" fill="none" stroke="${p.l}" stroke-width="${f(r*.14)}" stroke-linecap="round" opacity=".75"/><circle r="${f(r*.68)}" fill="${p.m}" stroke="${p.d}" stroke-opacity=".45" stroke-width=".6"/><circle cx="${f(r*.05)}" cy="${f(r*.04)}" r="${f(r*.42)}" fill="${p.b}" stroke="${p.d}" stroke-opacity=".55" stroke-width=".6"/><path d="M${f(-a)} 0a${f(a)} ${f(a)} 0 1 1 ${f(a*1.6)} ${f(a*.7)}a${f(a*.5)} ${f(a*.5)} 0 1 1 ${f(-a*.7)} ${f(-a)}" fill="none" stroke="${p.d}" stroke-width="${f(r*.07)}" stroke-linecap="round"/></g>`};
const sunflower=(x,y,r,rot)=>{let s=`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">`;
  for(let k=0;k<2;k++)for(let i=0;i<13;i++)s+=`<ellipse cy="${f(-r*(k?.66:.72))}" rx="${f(r*.19)}" ry="${f(r*.36)}" transform="rotate(${f(i*360/13+k*14)})" fill="${k?'#fcc82e':'#ee9d0c'}"/>`;
  s+=`<circle r="${f(r*.45)}" fill="#6b3b15"/><circle r="${f(r*.31)}" fill="#47260f"/>`;
  for(let i=0;i<9;i++){const a=i*2.4,d=(r*.05+r*.2*Math.sqrt(i/9))*1.3;s+=`<circle cx="${f(Math.cos(a)*d)}" cy="${f(Math.sin(a)*d)}" r="${f(r*.035)}" fill="#8f5a26"/>`}
  return s+'</g>'};
const lily=(x,y,r,rot)=>{let s=`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">`;
  for(let i=0;i<6;i++){const L=r*(i%2?.88:1);s+=`<path transform="rotate(${i*60})" d="M0 0C${f(L*.3)} ${f(-L*.28)} ${f(L*.24)} ${f(-L*.78)} 0 ${f(-L)}C${f(-L*.24)} ${f(-L*.78)} ${f(-L*.3)} ${f(-L*.28)} 0 0Z" fill="${i%2?'#f4efe4':'#fffdf8'}" stroke="#d8d1c0" stroke-width=".6"/><path transform="rotate(${i*60})" d="M0 ${f(-L*.1)}V${f(-L*.62)}" stroke="#d9e5b8" stroke-width="${f(r*.05)}" stroke-linecap="round"/>`}
  s+=`<circle r="${f(r*.12)}" fill="#e9efc9"/>`;
  for(let i=0;i<5;i++){const a=(i*72+17)*Math.PI/180,d=r*.42,px=f(Math.sin(a)*d),py=f(-Math.cos(a)*d);s+=`<path d="M0 0L${px} ${py}" stroke="#c9d79a" stroke-width=".7"/><circle cx="${px}" cy="${py}" r="${f(r*.045)}" fill="#e0902f"/>`}
  return s+'</g>'};
const daisy=(x,y,r,rot)=>{let s=`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">`;
  for(let i=0;i<12;i++)s+=`<ellipse cy="${f(-r*.62)}" rx="${f(r*.14)}" ry="${f(r*.36)}" transform="rotate(${i*30})" fill="#fffefb" stroke="#e6e1d6" stroke-width=".4"/>`;
  return s+`<circle r="${f(r*.3)}" fill="#f2bf12"/><circle cx="${f(-r*.05)}" cy="${f(-r*.05)}" r="${f(r*.14)}" fill="#f9d94c"/></g>`};
const tulip=(x,y,r,p,rot)=>{const w=r*.5,L=r*1.25,P=`M0 0C${f(-w)} ${f(-L*.2)} ${f(-w*.9)} ${f(-L*.82)} 0 ${f(-L)}C${f(w*.9)} ${f(-L*.82)} ${f(w)} ${f(-L*.2)} 0 0Z`,st=`stroke="${p.d}" stroke-opacity=".5" stroke-width=".6"`;
  return `<g transform="translate(${f(x)} ${f(y+L*.45)}) rotate(${f(rot)})"><path d="${P}" transform="rotate(-18)" fill="${p.m}" ${st}/><path d="${P}" transform="rotate(18)" fill="${p.m}" ${st}/><path d="${P}" fill="${p.b}" ${st}/><path d="M0 ${f(-L*.15)}V${f(-L*.8)}" stroke="${p.l}" stroke-opacity=".6" stroke-width="${f(r*.08)}" stroke-linecap="round"/></g>`};
const baby=(x,y,r,R)=>{let s='';for(let i=0;i<8;i++){const a=R()*6.28,d=R()*r;s+=`<circle cx="${f(x+Math.cos(a)*d)}" cy="${f(y+Math.sin(a)*d)}" r="${f(r*.16+R()*r*.08)}" fill="#fffdf8" stroke="#e8e1d3" stroke-width=".3"/>`}return s};
const spike=(x0,y0,x1,y1)=>{let s=`<path d="M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}" stroke="#6f9a68" stroke-width="1.4" stroke-linecap="round"/>`;
  for(let i=0;i<11;i++){const t=.5+i*.05,px=x0+(x1-x0)*t,py=y0+(y1-y0)*t,sd=i%2?1:-1,cx=f(px+sd*2.4);s+=`<ellipse cx="${cx}" cy="${f(py)}" rx="2.4" ry="3.6" transform="rotate(${sd*25} ${cx} ${f(py)})" fill="${i%3?'#8c6fc6':'#a58be0'}"/>`}
  return s+`<ellipse cx="${f(x1)}" cy="${f(y1-3)}" rx="2.2" ry="3.8" fill="#9a7fd6"/>`};
const lv=(R,n,cx,cy,len)=>{let s='';for(let i=0;i<n;i++){const a=-85+170*i/(n-1)+(R()-.5)*14;s+=leaf(cx+Math.sin(a*Math.PI/180)*20,cy,len*(.8+R()*.4),a,[G.a,G.b,G.c][i%3])}return s};
const draw=(it,R)=>{const r=it.r*(.9+R()*.2),rot=R()*360;
  switch(it.t){case'rose':return rose(it.x,it.y,r,PAL[it.p],rot);case'sun':return sunflower(it.x,it.y,r,rot);case'lily':return lily(it.x,it.y,r,rot);
  case'daisy':return daisy(it.x,it.y,r,rot);case'tulip':return tulip(it.x,it.y,r,PAL[it.p],(R()-.5)*30);case'baby':return baby(it.x,it.y,r,R);
  case'lav':return spike(150+(it.x-150)*.25,122,it.x,it.y-14)}return''};

function bouquet(sp,seed,o={}){
  const R=rng(seed*97+13),id='g'+(++uid),P=PAPER[sp.paper],cx=150,cy=90,rx=84,ry=54;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" preserveAspectRatio="${o.hero?'xMidYMax meet':'xMidYMid slice'}" ${o.hero?'aria-hidden="true"':`role="img" aria-label="${sp.alt}"`}>`;
  if(!o.hero){
    s+=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sp.bg[0]}"/><stop offset="1" stop-color="${sp.bg[1]}"/></linearGradient></defs><rect width="300" height="200" fill="url(#${id})"/>`;
    for(let i=0;i<7;i++)s+=`<circle cx="${f(R()*300)}" cy="${f(R()*110)}" r="${f(10+R()*22)}" fill="#fff" opacity="${f(.1+R()*.14)}"/>`;
  }
  s+=`<polygon points="40,102 78,58 150,48 222,58 260,102 198,200 102,200" fill="${P.back}"/>`;
  s+=lv(R,9,150,106,sp.leaf||74);
  const items=[];sp.fl.forEach(g=>{for(let i=0;i<g.n;i++)items.push({...g})});
  const N=items.length;
  items.forEach((it,i)=>{const rr=Math.sqrt((i+.5)/N),a=i*2.399963+R()*.6;it.x=cx+rx*rr*Math.cos(a);it.y=cy+ry*rr*Math.sin(a)});
  items.sort((a,b)=>a.y-b.y).forEach(it=>{s+=draw(it,R)});
  s+=`<polygon points="72,114 150,98 228,114 194,200 106,200" fill="${P.front}"/><polygon points="150,98 228,114 194,200 150,200" fill="#000" opacity=".07"/><polygon points="72,114 150,98 128,200 106,200" fill="#fff" opacity=".12"/><path d="M72 114L150 98L228 114" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>`;
  const rb=sp.ribbon;
  s+=`<path d="M106 146Q150 158 194 146" stroke="${rb}" stroke-width="6" fill="none"/><g transform="translate(150 152)"><path d="M0 0C-26 -16 -34 6 -22 10C-12 13 -4 4 0 0Z" fill="${rb}"/><path d="M0 0C26 -16 34 6 22 10C12 13 4 4 0 0Z" fill="${rb}"/><path d="M-3 4L-16 34L-7 30L-3 38Z" fill="${rb}"/><path d="M3 4L16 34L7 30L3 38Z" fill="${rb}"/><circle r="5.5" fill="${rb}"/><circle cx="-1.5" cy="-1.5" r="2" fill="#fff" opacity=".35"/></g>`;
  if(o.tag)s+=`<g transform="translate(222 130) rotate(-12)"><rect x="-27" y="-15" width="54" height="30" rx="2" fill="#fffaf5" stroke="#eadcd0"/><text x="0" y="4" text-anchor="middle" font-family="Dancing Script,cursive" font-size="12" fill="#9a7b6a">Just for you</text></g>`;
  return s+'</svg>';
}

const stem=(c='#4f7d52')=>`<path d="M50 56V95" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`;
function ico(k){const R=rng(k.length*31+k.charCodeAt(0));let s='<svg viewBox="0 0 100 100" aria-hidden="true">';
  switch(k){
    case'hong':s+=stem()+leaf(50,84,22,-55,G.b)+leaf(50,72,20,50,G.a)+rose(50,40,24,PAL.red,20);break;
    case'huongduong':s+=stem()+leaf(50,86,20,-60,G.b)+leaf(50,78,18,55,G.a)+sunflower(50,42,31,10);break;
    case'ly':s+=stem()+leaf(50,88,22,-50,G.b)+lily(50,42,35,-10);break;
    case'tulip':s+=leaf(50,96,48,-12,G.b)+leaf(50,96,44,14,G.a)+tulip(50,26,27,PAL.hot,0);break;
    case'khaitruong':s+=lv(R,7,50,62,34)+rose(37,44,13,PAL.pink,0)+rose(61,42,13,PAL.hot,40)+rose(50,54,13,PAL.cream,80)+daisy(28,58,8,0)+daisy(72,56,8,0)+baby(50,30,10,R)+'<polygon points="30,66 70,66 58,98 42,98" fill="#f6c9cc"/>';break;
    case'sinhnhat':s+=lv(R,7,50,70,30)+daisy(36,44,16,0)+daisy(64,42,16,20)+daisy(50,64,16,40)+daisy(26,66,11,0)+daisy(74,64,11,0);break;
    case'tinhyeu':s+=lv(R,7,50,66,30)+rose(50,32,14,PAL.pink,0)+rose(34,48,16,PAL.hot,20)+rose(66,48,16,PAL.hot,50)+rose(50,66,16,PAL.pink,80)+baby(24,34,8,R)+baby(78,34,8,R);break;
    case'chiabuon':s+=lv(R,6,50,70,28)+lily(36,50,24,-20)+lily(64,54,22,15)+daisy(50,32,12,0)+baby(50,76,10,R);break;
    case'mua':s+=leaf(50,98,34,-35,G.b)+leaf(50,98,34,35,G.a)+spike(50,96,26,24)+spike(50,96,40,14)+spike(50,96,52,10)+spike(50,96,64,16)+spike(50,96,76,26);break;
  }return s+'</svg>'}

