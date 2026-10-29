// Uavhengige kontrollberegninger for revisjonen. Ingen endringer i modellene.
import { readFile, writeFile } from 'node:fs/promises';
import { lagSnoforsok, overflateOgVolum } from '../../modeller/naturfag/overflate-og-volum/modell.js';
import { lagKar, kanGjoreArbeid } from '../../modeller/naturfag/energi-som-sprer-seg/modell.js';
import { lagVarmegitter } from '../../felles/js/varmegitter.js';
const data=JSON.parse(await readFile(new URL('../../felles/data/materialer.json',import.meta.url),'utf8'));
const m=data.materialer;
const out={date:'2026-10-29',contact:[],snow:[],energy:[],convergence:[],contrast:[]};
const skin=Math.sqrt(m.hud.k*m.hud.rho*m.hud.c);
for(const name of ['kobber','aluminium','rustfritt_stal','glass','tre','isopor']) {
  const e=Math.sqrt(m[name].k*m[name].rho*m[name].c);
  out.contact.push({name,effusivity:e,semiInfiniteContact:(skin*33+e*20)/(skin+e),tableTarget:data.valideringsmal[name]});
}
for(const underlag of [false,true]) {
 const f=lagSnoforsok(data,{oppdeling:'1',underlag});
 const initial=f.gitter.totalEnergi();
 while(f.hjorneNullVed===null&&f.tid<4000)f.steg(1);
 const {x,y,b,h}=f.biter[0];
 const corners=[[x,y],[x+b-1,y],[x,y+h-1],[x+b-1,y+h-1]].map(([a,b])=>f.gitter.temperatur(a,b));
 const r=f.gitter.energiregnskap;
 out.snow.push({underlag,time:f.tid,corners,markedCorner:f.gitter.temperatur(...f.merkedeCeller.hjorne),markedSide:f.gitter.temperatur(...f.merkedeCeller.side),energyResidual:f.gitter.totalEnergi()-initial-(r.luft+r.effekt+r.laast+r.underlag-r.fjernet),sliceMass:f.startMasse,fullMass:f.startMasse*16});
}
out.geometry=['1','4','16','64','spredt'].map(id=>({id,...overflateOgVolum(id)}));
for(const [name,nx,ny] of [['lite',15,15],['middels',20,15],['mye',25,20]]) {
 for(const hot of [40,90]) {
  const Ck=49*m.kobber.rho*m.kobber.c*.004**3;
  const Cw=(nx*ny-49)*m.vann.rho*m.vann.c*.004**3;
  const arithmetic=(Ck*hot+Cw*10)/(Ck+Cw);
  // Finn reversibel sluttemperatur numerisk fra entropibalansen, uten modellens lukkede formel.
  let lo=283.15,hi=hot+273.15;
  for(let n=0;n<100;n++){const mid=(lo+hi)/2;const entropy=Ck*Math.log(mid/(hot+273.15))+Cw*Math.log(mid/283.15);if(entropy>0)hi=mid;else lo=mid;}
  const reversible=(lo+hi)/2;
  const W=Ck*(hot+273.15-reversible)+Cw*(283.15-reversible);
  const model=lagKar(data,{vannmengde:name,klossT:hot});
  out.energy.push({name,hot,Ck,Cw,independentEquilibrium:arithmetic,modelEquilibrium:model.blandingstemperatur,reversibleFinalC:reversible-273.15,independentMaxWork:W,modelMaxWork:kanGjoreArbeid([[Ck,hot],[Cw,10]]),initialWorkPercent:100*W/(Ck*(hot-10))});
 }
}
// Tidsoppløsning: samme to celler, flere ytre steglengder. Ikke romlig gitterkonvergens.
for(const dt of [.0001,.001,.01,.1]) {
 const g=lagVarmegitter({nx:2,ny:1,dx:.01,data,h:0,kantErLuft:false});
 g.fyllRektangel(0,0,1,1,'aluminium',80);g.fyllRektangel(1,0,1,1,'rustfritt_stal',10);
 const initial=g.totalEnergi(); for(let i=0;i<Math.round(10/dt);i++)g.steg(dt);
 out.convergence.push({dt,t:g.tid,left:g.temperatur(0,0),right:g.temperatur(1,0),residual:g.totalEnergi()-initial});
}
function luminance(hex){const v=hex.match(/\w\w/g).map(h=>parseInt(h,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];}
for(const color of ['#009E73','#CC79A7','#17487f','#5b616b'])out.contrast.push({color,onWhite:1.05/(luminance(color)+.05)});
await writeFile(new URL('kontrollberegninger.json',import.meta.url),JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
