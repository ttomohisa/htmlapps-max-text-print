'use strict';
// Real Chromium layout/PDF checks. Dev-only packages; no runtime dependencies.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {PDFDocument}=require('pdf-lib');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa-artifacts');
fs.mkdirSync(out,{recursive:true});
const failures=[],results=[];
const check=(ok,label,details)=>{results.push({label,ok,details});if(!ok)failures.push({label,details});};
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1360,height:900},locale:'ja-JP'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const source=process.env.PREVIEW_URL||pathToFileURL(path.join(root,'dist/index.html')).href;
 await page.goto(source);await page.locator('#editor').fill('「受付」ABC 123、。\nご案内（２階）');
 const ready=()=>page.waitForFunction(()=>!document.querySelector('#printButton').disabled);
 const setting=async(id,value)=>{await page.locator('#'+id).selectOption(value);await ready();};
 const geometry=()=>page.evaluate(()=>{
  const p=document.querySelector('.paper.is-preview-active'),c=p.querySelector('.paper-content'),t=p.querySelector('.paper-text');
  const r=document.createRange();r.selectNodeContents(t);const cr=c.getBoundingClientRect();
  return {paper:{width:p.style.width,height:p.style.height},font:parseFloat(t.style.fontSize),writing:getComputedStyle(t).writingMode,text:t.textContent,
   outside:[...r.getClientRects()].filter(b=>b.width&&b.height&&(b.left<cr.left-.8||b.right>cr.right+.8||b.top<cr.top-.8||b.bottom>cr.bottom+.8)).map(b=>({left:b.left-cr.left,right:b.right-cr.right,top:b.top-cr.top,bottom:b.bottom-cr.bottom}))};
 });
 await ready();
 for(const language of ['ja','en']){
  if(await page.locator('html').getAttribute('lang')!==language) await page.locator('#languageButton').click();
  check(await page.locator('#lineHeight').getAttribute('aria-label')===(language==='ja'?'行間':'Line height'),`slider name ${language}`);
  for(const width of [1360,320]){
   await page.setViewportSize({width,height:900});
   if(width===320){await page.locator('[data-mobile-target="settings"]').click();}
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no horizontal page overflow ${language}/${width}`);
   await page.locator('#helpButton').click();await page.keyboard.press('Escape');
   check(!(await page.locator('#helpDialog').evaluate(el=>el.open)),`Help Esc ${language}/${width}`);
  }
 }
 await page.setViewportSize({width:1360,height:900});
 for(const paper of ['A3','A4','A5','Letter'])for(const orientation of ['portrait','landscape'])for(const writing of ['horizontal-tb','vertical-rl'])for(const wrap of [true,false]){
  await setting('paperSize',paper);await page.locator(`#orientationGroup [data-value="${orientation}"]`).click();await setting('writingMode',writing);await page.locator('#autoWrapToggle').setChecked(wrap);await ready();
  await page.locator('#editor').fill('「受付」ABC 123、。\nご案内（２階）');await ready();
  const g=await geometry();check(!g.outside.length,`fit ${paper}/${orientation}/${writing}/wrap${wrap}`,g);
 }
 await setting('paperSize','A4');await page.locator('#autoWrapToggle').uncheck();
 for(const writing of ['horizontal-tb','vertical-rl'])for(const alignment of ['left','center','right'])for(const vertical of ['start','center','end']){
  await setting('writingMode',writing);await setting('textAlign',alignment);await setting('verticalAlign',vertical);
  await page.locator('#editor').fill('日本語ABCDE'.repeat(30));await ready();const g=await geometry();check(!g.outside.length,`nowrap alignment ${writing}/${alignment}/${vertical}`,g);
 }
 await setting('textAlign','center');await setting('verticalAlign','center');await page.locator('#autoWrapToggle').check();
 await page.locator('#pageSplitGroup [data-value="line"]').click();await page.locator('#editor').fill('受付\nこちらでご案内します');await ready();
 const fonts=()=>page.locator('.paper-text').evaluateAll(els=>els.map(el=>parseFloat(el.style.fontSize)));
 const independent=await fonts();check(independent[0]!==independent[1],'independent font maxima',independent);
 await page.locator('#uniformFontToggle').check();await ready();const common=await fonts();check(common[0]===common[1]&&common[0]===Math.min(...independent),'common maximum',common);
 await page.emulateMedia({media:'print'});check(!(await page.locator('.print-summary').isVisible()),'print summary is not printed');await page.emulateMedia({media:'screen'});
 for(const [paper,dims] of [['A3',[297,420]],['A4',[210,297]],['A5',[148,210]],['Letter',[215.9,279.4]]])for(const orientation of ['portrait','landscape'])for(const writing of ['horizontal-tb','vertical-rl']){
  await setting('paperSize',paper);await page.locator(`#orientationGroup [data-value="${orientation}"]`).click();await setting('writingMode',writing);
  const pdf=await page.pdf({path:path.join(out,`${paper}-${orientation}-${writing}.pdf`),preferCSSPageSize:true,printBackground:true});const doc=await PDFDocument.load(pdf);
  const expected=orientation==='landscape'?[dims[1],dims[0]]:dims;
  check(doc.getPageCount()===2,`PDF page count ${paper}/${orientation}/${writing}`,doc.getPageCount());
  for(const p of doc.getPages()){const {width,height}=p.getSize();check(Math.abs(width-expected[0]*72/25.4)<1.2&&Math.abs(height-expected[1]*72/25.4)<1.2,`PDF paper ${paper}/${orientation}/${writing}`,{width,height});}
 }
 await page.emulateMedia({media:'screen'});await setting('paperSize','A4');await setting('writingMode','vertical-rl');await page.locator('#pageSplitGroup [data-value="single"]').click();await page.locator('#editor').fill('春の文化祭\n開催のご案内');await ready();
 if(await page.locator('html').getAttribute('lang')!=='ja')await page.locator('#languageButton').click();await page.screenshot({path:path.join(out,'screenshot-ja.png')});
 await page.locator('#languageButton').click();await page.screenshot({path:path.join(out,'screenshot-en.png')});
 check(errors.length===0,'no console errors',errors);
 await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,failures},null,2));
 console.log(`${results.length} browser/PDF assertions; ${failures.length} failures`);for(const f of failures)console.log(JSON.stringify(f));assert.equal(failures.length,0);
})().catch(e=>{console.error(e);process.exitCode=1;});
