'use strict';
// Runs the real inline app with deterministic DOM, storage and timer boundaries.
// Geometry and native dialog focus are checked separately in browser QA.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { gunzipSync } = require('node:zlib');
function loadHtml(file) {
  let html = fs.readFileSync(file, 'utf8');
  const payload = html.match(/<script id="self-extract-payload"[^>]*>([\s\S]*?)<\/script>/);
  return payload ? gunzipSync(Buffer.from(payload[1].replace(/\s/g, ''), 'base64')).toString('utf8') : html;
}
function boot(file, language='en', stored=new Map()) {
  const html=loadHtml(file), timers=new Map(), nodes=new Map(), groups=new Map();
  let serial=0, focused=null;
  const frames=[];
  class Element {
    constructor(tag='div', attributes='') {
      this.clientWidth=100;this.clientHeight=100;this.scrollWidth=100;this.scrollHeight=100;this.tagName=tag.toUpperCase();this.listeners=new Map();this.children=[];this.style={};this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.open=false;
      this.attrs=new Map([...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
      this.dataset=Object.fromEntries([...this.attrs].filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v]));
      const classes=new Set((this.attrs.get('class')||'').split(/\s+/));
      Object.defineProperty(this,'className',{get:()=>[...classes].join(' '),set:value=>{classes.clear();String(value).split(/\s+/).forEach(x=>classes.add(x));}});
      this.classList={add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle:(x,on=!classes.has(x))=>{on?classes.add(x):classes.delete(x);return on;}};
    }
    addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list);}
    dispatch(type,extra={}){const event={target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...extra};for(const fn of this.listeners.get(type)||[])fn(event);this['on'+type]?.(event);return event;}
    click(){if(!this.disabled)this.dispatch('click');}
    focus(){focused=this;}
    showModal(){this.open=true;}
    close(){this.open=false;}
    setAttribute(k,v){this.attrs.set(k,String(v));}
    getAttribute(k){return this.attrs.get(k)??null;}
    appendChild(el){this.children.push(el);return el;}
    replaceChildren(...els){this.children=els.flatMap(el=>el.tagName==='FRAGMENT'?el.children:[el]);}
    querySelector(selector){return this.children.find(el=>selector==='.paper.is-preview-active'&&el.classList.contains('is-preview-active'))||null;}
    getBoundingClientRect(){return {left:10,top:10,right:500,bottom:500};}
  }
  class Input extends Element {} class Textarea extends Element {} class Select extends Element {}
  for(const m of html.matchAll(/<(\w+)\s+([^>]*\bid="([^"]+)"[^>]*)>/g)){
    const Class={input:Input,textarea:Textarea,select:Select}[m[1]]||Element;nodes.set('#'+m[3],new Class(m[1],m[2]));
  }
  for(const id of ['pageSplitGroup','orientationGroup','marginGroup']) {
    const block=html.slice(html.indexOf(`id="${id}"`)).split('</div>')[0];
    groups.set(id,[...block.matchAll(/<button\s+([^>]+)>/g)].map(m=>new Element('button',m[1])));
  }
  const document=new Element('document');document.documentElement={};document.body=new Element('body');
  document.querySelector=s=>s==='dialog[open]'?[...nodes.values()].find(el=>el.tagName==='DIALOG'&&el.open)||null:nodes.get(s)||null;
  document.querySelectorAll=s=>{
    const m=s.match(/^#(\w+) button/);if(m)return groups.get(m[1])||[];
    if(s==='.paper[data-page-index]')return nodes.get('#pagesContainer').children;
    const attr=s.match(/^\[([^\]]+)\]$/);return attr?[...nodes.values()].filter(el=>el.attrs.has(attr[1])):[];
  };
  document.createElement=tag=>new Element(tag);document.createDocumentFragment=()=>new Element('fragment');
  const window=new Element('window');window.scrollTo=()=>{};
  const context=vm.createContext({document,window,navigator:{language},Intl,Blob,URL,Uint8Array,atob,
    HTMLInputElement:Input,HTMLTextAreaElement:Textarea,HTMLSelectElement:Select,
    localStorage:{getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v)},
    setTimeout:(fn,delay)=>{timers.set(++serial,{fn,delay});return serial;},clearTimeout:id=>timers.delete(id),
    requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},matchMedia:()=>({matches:true})});
  let script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('const translations ='))[1];
  script=script.replace('__APP_CONFIG_JSON__',fs.readFileSync(path.join(__dirname,'../app.config.json'),'utf8')).replace('__BUILD_MANIFEST_JSON__','{}').replace('__EMBEDDED_ASSET_BUNDLE_JSON__','{}');
  vm.runInContext(script,context,{filename:file});
  return {html,stored,timers,document,window,el:id=>nodes.get('#'+id),get focused(){return focused;},
    frame(){const pending=frames.splice(0);pending.forEach(fn=>fn());},
    flushFrames(){let count=0;while(frames.length){if(++count>100)throw new Error('Animation frame loop');this.frame();}},
    type(value,event='input'){nodes.get('#editor').value=value;nodes.get('#editor').dispatch(event);},
    press(key,target=document.body,extra={}){return document.dispatch('keydown',{key,target,...extra});},
    setting(group,value){groups.get(group).find(b=>b.dataset.value===value).click();},
    fit(){for(const [id,t] of [...timers])if(t.delay===25){timers.delete(id);t.fn();}},
    expire(){for(const [id,t] of [...timers])if(t.delay>=1000){timers.delete(id);t.fn();}},
    saved(){return JSON.parse(stored.get('max-text-print:v1'));},
  };
}
module.exports={boot,loadHtml};
