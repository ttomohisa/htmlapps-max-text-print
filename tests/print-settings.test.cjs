'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {test}=require('node:test');
const {boot}=require('./interaction-harness.cjs');
const targets=process.argv.slice(2);
if(!targets.length) targets.push('src/index.template.html');
for(const target of targets) for(const language of ['ja','en']) {
 const file=path.resolve(__dirname,'..',target), label=`${target}/${language}`;
 const change=(app,id,value)=>{const el=app.el(id);assert.ok(el,`${id} exists`);if(typeof value==='boolean')el.checked=value;else el.value=value;el.dispatch('change');app.fit();};
 test(`${label}: old saved settings inherit wrapping, paper and independent-size defaults`,()=>{
  const stored=new Map([['max-text-print:v1',JSON.stringify({text:'sign',language})]]),app=boot(file,language,stored);
  assert.equal(app.el('paperSize')?.value,'A4');assert.equal(app.el('autoWrapToggle')?.checked,true);assert.equal(app.el('uniformFontToggle')?.checked,false);
 });
 test(`${label}: paper dimensions and native page rule follow selected paper`,()=>{
  const app=boot(file,language);app.type('Paper');app.setting('orientationGroup','portrait');
  for(const [paper,w,h] of [['A3',297,420],['A5',148,210],['Letter',215.9,279.4]]) {
   change(app,'paperSize',paper);const page=app.el('pagesContainer').children[0];assert.equal(page.style.width,`${w}mm`);assert.equal(page.style.height,`${h}mm`);assert.ok(app.el('printPageStyle').textContent.includes(`${w}mm ${h}mm`));
  }
 });
 test(`${label}: wrapping OFF preserves explicit lines and persists through reload/reset Undo`,()=>{
  const app=boot(file,language);app.type('Long line\nSecond line');change(app,'autoWrapToggle',false);
  assert.equal(app.el('measureBox').style.whiteSpace,'pre');assert.equal(app.el('pagesContainer').children[0].children[0].children[0].style.whiteSpace,'pre');
  assert.equal(app.el('pagesContainer').children[0].children[0].children[0].textContent,'Long line\nSecond line');
  assert.equal(boot(file,language,app.stored).el('autoWrapToggle').checked,false);
  app.el('resetSettingsButton').click();assert.equal(app.el('autoWrapToggle').checked,true);app.el('appToastAction').click();assert.equal(app.el('autoWrapToggle').checked,false);
 });
 test(`${label}: all new output settings cancel an already queued native print`,()=>{
  for(const [id,value] of [['paperSize','A5'],['autoWrapToggle',false],['uniformFontToggle',true]]) {
   const app=boot(file,language);let prints=0;app.window.print=()=>prints++;app.type('a\nb');app.fit();app.el('printButton').click();app.frame();change(app,id,value);app.flushFrames();assert.equal(prints,0,id);
  }
 });
 test(`${label}: malformed new persisted settings fall back safely`,()=>{
  const stored=new Map([['max-text-print:v1',JSON.stringify({text:'test',paperSize:'bad',autoWrap:'false',uniformFontSize:'true'})]]),app=boot(file,language,stored);
  assert.equal(app.el('paperSize')?.value,'A4');assert.equal(app.el('autoWrapToggle')?.checked,true);assert.equal(app.el('uniformFontToggle')?.checked,false);
 });
 test(`${label}: common sizing chooses the smallest page maximum and Auto optimizes it`,()=>{
  const app=boot(file,language),m=app.el('measureBox');
  // The real fit/search runs; this deterministic geometry isolates its aggregation policy.
  Object.defineProperty(m,'scrollHeight',{get(){const landscape=parseFloat(m.style.width)>parseFloat(m.style.height);const limit=m.textContent==='short'?(landscape?80:100):(landscape?60:50);return parseFloat(m.style.fontSize)>limit?200:100;}});
  app.type('short\nlong');app.setting('pageSplitGroup','line');app.setting('orientationGroup','portrait');app.fit();
  let sizes=app.el('pagesContainer').children.map(p=>parseFloat(p.children[0].children[0].style.fontSize));assert.ok(sizes[0]>sizes[1]);
  change(app,'uniformFontToggle',true);sizes=app.el('pagesContainer').children.map(p=>parseFloat(p.children[0].children[0].style.fontSize));assert.deepEqual(sizes,[49.5,49.5]);
  app.setting('orientationGroup','auto');app.fit();sizes=app.el('pagesContainer').children.map(p=>parseFloat(p.children[0].children[0].style.fontSize));assert.deepEqual(sizes,[59.5,59.5]);
 });
 test(`${label}: vertical writing stays distinct from paper orientation and survives reset Undo`,()=>{
  const app=boot(file,language);app.type('「受付」ABC\n二階へ。');app.setting('orientationGroup','landscape');change(app,'writingMode','vertical-rl');
  const paper=app.el('pagesContainer').children[0],text=paper.children[0].children[0];assert.equal(paper.style.width,'297mm');assert.equal(text.style.writingMode,'vertical-rl');assert.equal(text.style.textOrientation,'mixed');assert.equal(app.el('measureBox').style.writingMode,'vertical-rl');
  assert.equal(boot(file,language,app.stored).el('writingMode').value,'vertical-rl');app.el('resetSettingsButton').click();assert.equal(app.el('writingMode').value,'horizontal-tb');app.el('appToastAction').click();assert.equal(app.el('writingMode').value,'vertical-rl');
 });
 test(`${label}: summary reflects print job and conditional warnings`,()=>{
  const app=boot(file,language);app.type('a\nb');app.setting('pageSplitGroup','line');change(app,'paperSize','Letter');
  assert.ok(app.el('printJobSummary')?.textContent.includes('Letter'));assert.ok(app.el('printJobSummary').textContent.includes('2'));assert.ok(app.el('printJobSummary').textContent.includes('10 mm'));
  assert.equal(app.el('printBackgroundWarning').classList.contains('show'),false);app.el('backgroundColor').value='#eeeeee';app.el('backgroundColor').dispatch('input');app.fit();assert.equal(app.el('printBackgroundWarning').classList.contains('show'),true);
  app.setting('marginGroup','0');app.fit();assert.equal(app.el('printEdgeWarning').classList.contains('show'),true);
 });
 test(`${label}: slider accessible names are localized and refresh with language`,()=>{
  const app=boot(file,language);assert.equal(app.el('lineHeight').getAttribute('aria-label'),language==='ja'?'行間':'Line height');assert.equal(app.el('letterSpacing').getAttribute('aria-label'),language==='ja'?'文字間隔':'Letter spacing');
  app.el('languageButton').click();assert.equal(app.el('lineHeight').getAttribute('aria-label'),language==='ja'?'Line height':'行間');
 });
 test(`${label}: queued printing cancels after changing writing direction`,()=>{
  const app=boot(file,language);let prints=0;app.window.print=()=>prints++;app.type('hello');app.fit();app.el('printButton').click();change(app,'writingMode','vertical-rl');app.flushFrames();assert.equal(prints,0);
 });
}
