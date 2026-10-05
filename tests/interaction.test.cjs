'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {test}=require('node:test');
const {boot,loadHtml}=require('./interaction-harness.cjs');
const root=path.join(__dirname,'..');
const targets=process.argv.slice(2);
if(!targets.length)targets.push('src/index.template.html','dist/index.html','max-text-print.html','dist/index.self-extract.html');
for(const target of targets)for(const language of ['ja','en']){
  const file=path.resolve(root,target),label=`${target} / ${language}`;
  const setup=()=>{const app=boot(file,language);app.type(language==='ja'?'以前の掲示':'Previous sign');app.el('clearButton').click();return app;};
  test(`${label}: immediate Clear Undo restores persisted text and preview`,()=>{
    const app=setup();assert.equal(app.el('editor').value,'');assert.equal(app.saved().text,'');assert.equal(app.focused,app.el('editor'));
    app.el('appToastAction').click();app.fit();assert.equal(app.el('editor').value,language==='ja'?'以前の掲示':'Previous sign');assert.equal(app.saved().text,app.el('editor').value);assert.equal(app.el('printButton').disabled,false);
    assert.equal(boot(file,language,app.stored).el('editor').value,app.el('editor').value);
  });
  for(const event of ['input','beforeinput','compositionstart'])test(`${label}: ${event} invalidates Clear Undo and captured callback`,()=>{
    const app=setup(),stale=app.el('appToastAction').onclick;
    if(event==='input')app.type(language==='ja'?'新しい掲示':'New sign');else app.el('editor').dispatch(event);
    assert.equal(app.el('appToastAction').hidden,true);assert.equal(app.el('appToastAction').onclick,null);
    stale();assert.equal(app.el('editor').value,event==='input'?(language==='ja'?'新しい掲示':'New sign'):'');
    if(event!=='input')app.type('新しい sign');
    stale();assert.equal(boot(file,language,app.stored).el('editor').value,app.el('editor').value);
  });
  test(`${label}: edit then delete does not revive old Undo`,()=>{
    const app=setup(),stale=app.el('appToastAction').onclick;app.type('new');app.type('');stale();assert.equal(app.saved().text,'');
  });
  test(`${label}: a second Clear owns its Undo; old callback cannot consume it`,()=>{
    const app=setup(),old=app.el('appToastAction').onclick;app.type('second');app.el('clearButton').click();const current=app.el('appToastAction').onclick;
    old();assert.equal(app.el('editor').value,'');assert.equal(app.el('appToastAction').onclick,current);current();assert.equal(app.saved().text,'second');old();assert.equal(app.saved().text,'second');
  });
  test(`${label}: expired and replaced Clear callbacks stay inert`,()=>{
    const app=setup(),expired=app.el('appToastAction').onclick;app.expire();expired();assert.equal(app.el('editor').value,'');assert.equal(app.el('appToastAction').hidden,true);
    app.type('again');app.el('clearButton').click();const replaced=app.el('appToastAction').onclick;app.el('sampleButton').click();const sample=app.el('editor').value;replaced();assert.equal(app.el('editor').value,sample);assert.equal(app.saved().text,sample);
  });
  test(`${label}: a replaced toast timer cannot hide a newer Clear Undo`,()=>{
    const app=setup(),oldTimer=[...app.timers.values()].find(t=>t.delay===5000).fn;
    app.type('second');app.el('clearButton').click();oldTimer();
    assert.equal(app.el('appToastAction').hidden,false);app.el('appToastAction').click();assert.equal(app.saved().text,'second');
  });
  test(`${label}: Clear callback also checks editor contents before an input event arrives`,()=>{
    const app=setup(),stale=app.el('appToastAction').onclick;app.el('editor').value='newer DOM text';stale();assert.equal(app.el('editor').value,'newer DOM text');
  });
  test(`${label}: settings/language changes preserve immediate text Undo`,()=>{
    const app=setup();app.setting('orientationGroup','landscape');app.setting('marginGroup','5');app.el('languageButton').click();app.el('appToastAction').click();assert.notEqual(app.saved().text,'');assert.equal(app.saved().orientation,'landscape');assert.equal(app.saved().marginPreset,'5');
  });
  test(`${label}: editing only invalidates Clear Undo, not settings-reset Undo`,()=>{
    const app=boot(file,language);app.setting('orientationGroup','landscape');app.el('resetSettingsButton').click();app.type('new');app.el('appToastAction').click();assert.equal(app.saved().orientation,'landscape');assert.equal(app.saved().text,'new');
  });
  test(`${label}: Help blocks page arrows without intercepting dialog keys; close restores navigation`,()=>{
    const app=boot(file,language);app.type('One\n二\nThree');app.setting('pageSplitGroup','line');app.fit();assert.equal(app.el('pageNavStatus').textContent,'1 / 3');app.el('helpButton').click();
    for(const key of ['ArrowRight','ArrowLeft'])assert.equal(app.press(key,app.el('closeHelpButton')).defaultPrevented,false);
    assert.equal(app.el('pageNavStatus').textContent,'1 / 3');app.el('helpOkButton').click();assert.equal(app.press('ArrowRight').defaultPrevented,true);assert.equal(app.el('pageNavStatus').textContent,'2 / 3');
    for(const id of ['editor','customMargin','fontFamily'])assert.equal(app.press('ArrowRight',app.el(id)).defaultPrevented,false);
    assert.equal(app.press('ArrowRight',app.document.body,{ctrlKey:true}).defaultPrevented,false);assert.equal(app.el('pageNavStatus').textContent,'2 / 3');app.press('ArrowLeft');assert.equal(app.el('pageNavStatus').textContent,'1 / 3');
  });
}
if(targets.length>1)test('source and every release share the same runtime and help content',()=>{
  const stable=file=>loadHtml(path.resolve(root,file)).replace(/\r\n/g,'\n').replace(/const APP_CONFIG = .*?;/,'const APP_CONFIG = {};').replace(/const BUILD_MANIFEST = .*?;/,'const BUILD_MANIFEST = {};').replace(/const EMBEDDED_ASSET_BUNDLE = .*?;/,'const EMBEDDED_ASSET_BUNDLE = {};');
  const parts=file=>{const h=stable(file);return [h.slice(h.indexOf('<!-- APP:HELP:BEGIN -->'),h.indexOf('<!-- APP:HELP:END -->')),h.slice(h.indexOf('<script>'),h.lastIndexOf('</script>'))];};
  for(const file of targets.slice(1))assert.deepEqual(parts(file),parts(targets[0]),file);
});
