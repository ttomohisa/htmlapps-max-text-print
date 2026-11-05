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
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
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
   if(width===320){
    const targets=await page.evaluate(()=>{
      const size=id=>{const r=document.querySelector(id).getBoundingClientRect();return {width:r.width,height:r.height};};
      return {help:size('#helpButton'),language:size('#languageButton')};
    });
    for(const [id,rect] of Object.entries(targets)){
      check(rect.width>=44&&rect.height>=44,`mobile ${id} meets 44px tap size ${language}`,rect);
    }
    check(await page.locator('#customMargin').getAttribute('aria-label')===(language==='ja'?'余白を指定（mm）':'Custom margin (mm)'),`localized custom margin label ${language}`);
    check(await page.locator('.local-badge').isHidden(),`mobile local badge hidden ${language}`);
    check(await page.locator('#mobileSettingsToggle').isVisible(),`mobile settings disclosure visible ${language}`);
    check(await page.locator('#settingsBody').isHidden(),`mobile settings collapsed ${language}`);
    await page.locator('#mobileSettingsToggle').click();
    check(await page.locator('#settingsBody').isVisible(),`mobile settings expanded ${language}`);
    check(await page.locator('#extraSettingsBody').isHidden(),`mobile optional settings collapsed ${language}`);
    await page.locator('#mobileExtraSettingsToggle').click();
    check(await page.locator('#extraSettingsBody').isVisible(),`mobile optional settings expanded ${language}`);
    check(await page.locator('#autoWrapToggle').isVisible(),`mobile wrapping option reachable ${language}`);
    await page.locator('#mobileExtraSettingsToggle').click();
    check(await page.locator('#extraSettingsBody').isHidden(),`mobile optional settings can reclose ${language}`);
    await page.locator('#mobileSettingsToggle').click();
   }
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no horizontal page overflow ${language}/${width}`);
   await page.locator('#helpButton').click();
   check(await page.locator('#closeHelpButton').isVisible(),`Help header close reachable ${language}/${width}`);
   check(await page.locator('#helpOkButton').count()===0,`Help footer close removed ${language}/${width}`);
   await page.keyboard.press('Escape');
   check(!(await page.locator('#helpDialog').evaluate(el=>el.open)),`Help Esc ${language}/${width}`);
  }
 }
 // Mobile uses a continuous editor -> settings -> preview flow rather than tabs.
 // Use a separate browser context so viewport and print-setting changes cannot
 // influence the desktop PDF geometry regression suite.
 {
 const mobileErrors=[];
 const mobilePage=await browser.newPage({viewport:{width:390,height:844},locale:'ja-JP'});
 mobilePage.on('pageerror',e=>mobileErrors.push(e.message));
 const page=mobilePage;
 const mobileReady=()=>page.waitForFunction(()=>!document.querySelector('#mobilePrintButton').disabled);
 await page.goto(source);
 await page.setViewportSize({width:390,height:844});
 await page.locator('#editor').fill('本日休業');await mobileReady();
 const mobileRects=await page.evaluate(()=>{
  const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
  return {editor:rect('#editor'),settings:rect('#settingsSection'),preview:rect('#previewSection'),print:rect('#mobilePrintButton')};
 });
 check(mobileRects.editor.bottom<=mobileRects.settings.top&&mobileRects.settings.bottom<=mobileRects.preview.top,'mobile order: editor, settings, preview',mobileRects);
 check(mobileRects.print.left>=0&&mobileRects.print.right<=390&&mobileRects.print.bottom<=844,'mobile Print action within viewport',mobileRects.print);
 check(!(await page.locator('#printChecklist').evaluate(el=>el.open)),'mobile preprint checklist collapsed by default');
 check(await page.locator('#fitChip').isVisible(),'fitted paper size visible');
 const editorHeight=await page.locator('#editor').evaluate(el=>el.getBoundingClientRect().height);
 check(editorHeight<=96,'mobile editor reduced so preview appears sooner',editorHeight);
 check(await page.locator('#mobilePageSplitSelect option').count()===3,'mobile split selector has three options');
 check(await page.locator('.print-hint svg').count()===0,'PDF guidance has no ambiguous info icon');
 await page.locator('#mobilePageSplitSelect').selectOption('char');await mobileReady();
 check(await page.locator('.paper').count()===4,'mobile page split select generates four pages');
 check(await page.locator('#mobilePrintButton').isEnabled(),'mobile Print enabled for valid input');
 await page.locator('#mobileSettingsToggle').click();
 check(await page.locator('#verticalWritingNote').isHidden(),'vertical writing note hidden in horizontal mode');
 await page.locator('#writingMode').selectOption('vertical-rl');await mobileReady();
 check(await page.locator('#verticalWritingNote').isVisible(),'vertical writing note visible for vertical mode');
 await page.locator('#writingMode').selectOption('horizontal-tb');await mobileReady();
 check(await page.locator('#verticalWritingNote').isHidden(),'vertical writing note rehidden after horizontal mode');
 check(await page.locator('#mobileExtraSettingsToggle').isVisible(),'mobile optional settings control visible');
 check(await page.locator('#extraSettingsBody').isHidden(),'mobile extra options initially collapsed');
 await page.locator('#mobileExtraSettingsToggle').click();
 await page.locator('#textAlign').selectOption('left');await mobileReady();
 check(await page.locator('#textAlign').inputValue()==='left','mobile alignment options remain functional');
 await page.locator('#mobileExtraSettingsToggle').click();
 await page.locator('#paperSize').selectOption('A5');await mobileReady();
 check((await page.locator('#mobileSettingsSummary').innerText()).includes('A5'),'mobile settings summary updated');
 await page.locator('#marginGroup [data-value="0"]').click();await mobileReady();
 check(await page.locator('#printEdgeWarning').isVisible(),'0 mm edge warning visible when checklist closed');
 // Restore defaults so subsequent PDF geometry checks use their original safe margin.
 await page.locator('#marginGroup [data-value="10"]').click();await mobileReady();
 await page.locator('#mobileSettingsToggle').click();
 await page.locator('#mobilePageSplitSelect').selectOption('single');await mobileReady();
 await page.locator('#mobileSettingsToggle').click();
 await page.locator('#paperSize').selectOption('A4');await mobileReady();
 await page.locator('#mobileSettingsToggle').click();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:path.join(out,'screenshot-mobile-ja.png'),fullPage:true});
 // Regress the reported extra blank sheet in a narrow mobile print layout.
 await page.locator('#mobileSettingsToggle').click();
 await page.locator('#fontFamily').selectOption('mono');await mobileReady();
 await page.locator('#mobileExtraSettingsToggle').click();
 await page.locator('#lineHeight').evaluate(el=>{el.value='1.29';el.dispatchEvent(new Event('input',{bubbles:true}));});await mobileReady();
 await page.locator('#letterSpacing').evaluate(el=>{el.value='0.20';el.dispatchEvent(new Event('input',{bubbles:true}));});await mobileReady();
 check(await page.locator('.paper').count()===1,'reported settings keep one mobile preview page');
 await page.emulateMedia({media:'print'});
 const mobilePrintPdf=await page.pdf({path:path.join(out,'mobile-A4-mono-line129-spacing020.pdf'),preferCSSPageSize:true,printBackground:true});
 const mobilePrintDocument=await PDFDocument.load(mobilePrintPdf);
 check(mobilePrintDocument.getPageCount()===1,'reported mobile print settings generate exactly one page',mobilePrintDocument.getPageCount());
 await page.emulateMedia({media:'screen'});
 await page.locator('#mobileResetSettingsButton').click();await mobileReady();
 await page.locator('#mobileSettingsToggle').click();
 for(const {width,height} of [{width:393,height:252},{width:844,height:390}]){
  await page.setViewportSize({width,height});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`mobile landscape no horizontal overflow ${width}x${height}`);
  const bottom=await page.locator('#mobilePrintButton').evaluate(el=>el.getBoundingClientRect().bottom);
  check(bottom<=height,`mobile Print stays inside viewport ${width}x${height}`,bottom);
 }
 check(mobileErrors.length===0,'mobile no JavaScript errors',mobileErrors);
 await mobilePage.close();
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
 await setting('textAlign','center');await setting('verticalAlign','center');
 await page.locator('details.advanced').evaluate(el=>{el.open=true;});
 await setting('outline','1.4');
 await page.locator('#lineHeight').evaluate(el=>{el.value='0.85';el.dispatchEvent(new Event('input',{bubbles:true}));});await ready();
 for(const writing of ['horizontal-tb','vertical-rl'])for(const wrap of [true,false]){
  await setting('writingMode',writing);await page.locator('#autoWrapToggle').setChecked(wrap);
  await page.locator('#editor').fill('「大歓迎」ABC 123、。\n（ご案内）gjpq');await ready();
  const g=await geometry();check(!g.outside.length,`tight leading and outline ${writing}/${wrap}`,g);
 }
 await setting('outline','0');await page.locator('#lineHeight').evaluate(el=>{el.value='1.05';el.dispatchEvent(new Event('input',{bubbles:true}));});await ready();
 await setting('textAlign','center');await setting('verticalAlign','center');await page.locator('#autoWrapToggle').check();
 await page.locator('#pageSplitGroup [data-value="line"]').click();await page.locator('#editor').fill('受付\nこちらでご案内します');await ready();
 const fonts=()=>page.locator('.paper-text').evaluateAll(els=>els.map(el=>parseFloat(el.style.fontSize)));
 const independent=await fonts();check(independent[0]!==independent[1],'independent font maxima',independent);
 await page.locator('#uniformFontToggle').check();await ready();const common=await fonts();check(common[0]===common[1]&&common[0]===Math.min(...independent),'common maximum',common);
 await page.emulateMedia({media:'print'});check(!(await page.locator('.print-summary').isVisible()),'print summary is not printed');await page.emulateMedia({media:'screen'});
 for(const [paper,dims] of [['A3',[297,420]],['A4',[210,297]],['A5',[148,210]],['Letter',[215.9,279.4]]])for(const orientation of ['portrait','landscape'])for(const writing of ['horizontal-tb','vertical-rl']){
  await setting('paperSize',paper);await page.locator(`#orientationGroup [data-value="${orientation}"]`).click();await setting('writingMode',writing);
  await page.emulateMedia({media:'print'});
  const pdf=await page.pdf({path:path.join(out,`${paper}-${orientation}-${writing}.pdf`),preferCSSPageSize:true,printBackground:true});const doc=await PDFDocument.load(pdf);
  await page.emulateMedia({media:'screen'});
  const expected=orientation==='landscape'?[dims[1],dims[0]]:dims;
  check(doc.getPageCount()===2,`PDF page count ${paper}/${orientation}/${writing}`,doc.getPageCount());
  for(const p of doc.getPages()){const {width,height}=p.getSize();check(Math.abs(width-expected[0]*72/25.4)<1.2&&Math.abs(height-expected[1]*72/25.4)<1.2,`PDF paper ${paper}/${orientation}/${writing}`,{width,height});}
 }
 // A single A4 sheet must never produce a blank second page at the reported settings.
 await page.locator('#pageSplitGroup [data-value="single"]').click();
 await setting('paperSize','A4');
 await page.locator('#orientationGroup [data-value="auto"]').click();
 await setting('writingMode','horizontal-tb');
 await setting('fontFamily','mono');
 await page.locator('#marginGroup [data-value="10"]').click();
 await page.locator('#autoWrapToggle').check();
 await page.locator('#boldToggle').check();
 await page.locator('#lineHeight').evaluate(el=>{el.value='1.29';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#letterSpacing').evaluate(el=>{el.value='0.20';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#editor').fill('本日休業');await ready();
 check(await page.locator('.paper').count()===1,'reported settings create one preview page');
 await page.emulateMedia({media:'print'});
 const exactPdf=await page.pdf({path:path.join(out,'one-page-A4-mono-line129-spacing020.pdf'),preferCSSPageSize:true,printBackground:true});
 const exactDocument=await PDFDocument.load(exactPdf);
 check(exactDocument.getPageCount()===1,'reported settings print one page without blank sheet',exactDocument.getPageCount());
 const sizes=await page.locator('.paper').evaluate(el=>{
   const r=el.getBoundingClientRect();
   return {width:r.width,height:r.height,physicalWidth:210*96/25.4,physicalHeight:297*96/25.4};
 });
 check(sizes.width<sizes.physicalWidth&&sizes.height<sizes.physicalHeight,'printed page reserves rounding tolerance',sizes);
 await page.emulateMedia({media:'screen'});
 await page.locator('#pageSplitGroup [data-value="line"]').click();
 await page.locator('#uniformFontToggle').check();await ready();
 await page.locator('#lineHeight').evaluate(el=>{el.value='1.05';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#letterSpacing').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#editor').fill(Array.from({length:200},(_,i)=>`Page ${i+1}`).join('\n'));await ready();
 check(await page.locator('.paper').count()===200,'200 pages rendered');
 const manySizes=await fonts();check(new Set(manySizes).size===1,'200 pages share common size');
 await page.locator('#pageNumber').fill('180');await page.locator('#goPageButton').click();check(await page.locator('.paper.is-preview-active').getAttribute('data-page-index')==='179','direct jump to page 180');
 await page.locator('#editor').fill(Array.from({length:201},(_,i)=>`Page ${i+1}`).join('\n'));
 await page.waitForFunction(()=>document.querySelector('#pageLimitWarning').classList.contains('show'));check(!(await page.locator('#printButton').isEnabled()),'201 pages disable printing');
 await page.locator('#editor').fill('受付\nこちらでご案内します');await ready();
 await page.locator('#pageSplitGroup [data-value="single"]').click();await setting('paperSize','A4');await setting('writingMode','vertical-rl');await page.locator('#editor').fill('「受付」ABC 123、。\nご案内（２階）');await ready();
 await page.emulateMedia({media:'print'});await page.pdf({path:path.join(out,'vertical-mixed.pdf'),preferCSSPageSize:true,printBackground:true});await page.emulateMedia({media:'screen'});
 await page.emulateMedia({media:'screen'});await setting('paperSize','A4');await setting('writingMode','vertical-rl');await page.locator('#pageSplitGroup [data-value="single"]').click();await page.locator('#editor').fill('春の文化祭\n開催のご案内');await ready();
 if(await page.locator('html').getAttribute('lang')!=='ja')await page.locator('#languageButton').click();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,'screenshot-ja.png')});
 await page.locator('#languageButton').click();await page.screenshot({path:path.join(out,'screenshot-en.png')});
 for(const variant of ['dist/index.html','dist/index.self-extract.html','max-text-print.html']){
  const local=await browser.newPage();const localErrors=[];local.on('pageerror',e=>localErrors.push(e.message));
  await local.goto(pathToFileURL(path.join(root,variant)).href);await local.locator('#editor').fill('Local file');
  await local.waitForFunction(()=>!document.querySelector('#printButton').disabled);
  check((await local.locator('#versionBadge').innerText())==='v1.2.0'&&!localErrors.length,`file opening ${variant}`,localErrors);await local.close();
 }
 check(requests.filter(url=>/^https?:/.test(url)&&url!==source).length===0,'no runtime network requests',requests);
 check(errors.length===0,'no console errors',errors);
 await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,failures},null,2));
 console.log(`${results.length} browser/PDF assertions; ${failures.length} failures`);for(const f of failures)console.log(JSON.stringify(f));assert.equal(failures.length,0);
})().catch(e=>{console.error(e);process.exitCode=1;});
