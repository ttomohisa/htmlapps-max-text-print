'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{test}=require('node:test');
const {boot}=require('./interaction-harness.cjs');
const targets=process.argv.slice(2);if(!targets.length)targets.push('src/index.template.html');
for(const target of targets){
 const file=path.resolve(__dirname,'..',target),start=(stored=new Map(),options={})=>boot(file,'en',stored,options);
 test(`${target}: URL/common/legacy/browser priority without startup writes`,()=>{
  class Storage extends Map{set(k,v){this.writes=(this.writes||0)+1;return super.set(k,v)}}
  const stored=new Storage();Map.prototype.set.call(stored,'max-text-print:v1',JSON.stringify({language:'en',text:'legacy'}));Map.prototype.set.call(stored,'browser-kitty:ui-language:v1','ja');
  assert.equal(start(stored).document.documentElement.lang,'ja');assert.equal(start(stored,{url:'https://example.test/?lang=en'}).document.documentElement.lang,'en');assert.equal(stored.writes||0,0);
  assert.equal(start(new Map(),{languages:['fr','ja-JP','en']}).document.documentElement.lang,'ja');
 });
 test(`${target}: autosave error retains current draft and successful retry clears only save error`,()=>{
  class Storage extends Map{set(k,v){if(this.fail&&k==='max-text-print:v1')throw Error('quota');return super.set(k,v)}}
  const stored=new Storage(),app=start(stored);app.type('old');stored.fail=true;app.type('current');assert.equal(app.saved().text,'old');assert.equal(app.el('saveStatus').getAttribute('data-bk-save-status'),'error');
  app.el('languageButton').click();assert.equal(app.el('editor').value,'current');assert.match(app.el('saveStatus').textContent,/保存できません/);stored.fail=false;app.el('retrySaveButton').click();assert.equal(app.saved().text,'current');assert.equal(app.el('saveStatus').getAttribute('data-bk-save-status'),'saved');
 });
 for(const raw of ['{','null','[]','false','0','"record"',''])test(`${target}: invalid storage ${raw} is not overwritten by edits or Retry`,()=>{
  const stored=new Map([['max-text-print:v1',raw]]),app=start(stored);app.type('recoverable draft');app.el('retrySaveButton').click();assert.equal(stored.get('max-text-print:v1'),raw);assert.equal(app.el('editor').value,'recoverable draft');stored.delete('max-text-print:v1');app.el('retrySaveButton').click();assert.equal(app.saved().text,'recoverable draft');
 });
 test(`${target}: shared language write failure stays visible across text save`,()=>{
  class Storage extends Map{set(k,v){if(k==='browser-kitty:ui-language:v1')throw Error('denied');return super.set(k,v)}}
  const app=start(new Storage());app.el('languageButton').click();app.type('draft');assert.match(app.el('languageNotice').textContent,/この画面/);assert.equal(app.saved().text,'draft');
 });
 test(`${target}: focused Undo survives expiry and language refresh preserves callback`,()=>{
  const app=start();app.type('original');app.el('clearButton').click();const action=app.el('appToastAction'),callback=action.onclick;action.focus();app.expire();assert.equal(action.hidden,false);app.el('languageButton').click();assert.equal(action.onclick,callback);assert.equal(action.textContent,'元に戻す');action.click();assert.equal(app.el('editor').value,'original');
 });
 test(`${target}: print has native busy duplicate guard and finally recovers after failure`,()=>{
  const app=start();app.type('sign');app.fit();app.flushFrames();let prints=0;app.window.print=()=>{prints++;throw Error('blocked')};app.el('printButton').click();assert.equal(app.el('printButton').getAttribute('data-bk-state'),'busy');assert.equal(app.el('mobilePrintButton').disabled,true);app.el('mobilePrintButton').dispatch('click');app.flushFrames();assert.equal(prints,1);assert.equal(app.el('printButton').disabled,false);assert.match(app.el('printNotice').textContent,/Could not open/);app.el('languageButton').click();assert.match(app.el('printNotice').textContent,/開けません/);app.window.print=()=>prints++;app.fit();app.el('printButton').click();app.flushFrames();assert.equal(prints,2);assert.equal(app.el('printNotice').textContent,'');
 });
 test(`${target}: language preserves page-number draft and validation`,()=>{
  const app=start();app.type('one\ntwo');app.setting('pageSplitGroup','line');app.fit();app.el('pageNumber').value='999';app.el('goPageButton').click();app.el('languageButton').click();assert.equal(app.el('pageNumber').value,'999');assert.equal(app.el('pageNumber').getAttribute('aria-invalid'),'true');assert.match(app.el('pageJumpError').textContent,/整数/);
 });
}
