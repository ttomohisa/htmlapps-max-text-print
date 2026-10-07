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
  test(`${label}: Help tooltip matches the current-language accessible name`,()=>{
    const app=boot(file,language);
    assert.equal(app.el('helpButton').getAttribute('title'),language==='ja'?'使い方と注意事項':'How to use & notes');
    app.el('languageButton').click();
    assert.equal(app.el('helpButton').getAttribute('title'),language==='ja'?'How to use & notes':'使い方と注意事項');
  });
  test(`${label}: header keeps target-language labels and localized Help across toggle and reload`,()=>{
    const app=boot(file,language);
    const check=(instance,lang)=>{
      const button=instance.el('languageButton'),target=lang==='ja'?'英語に切り替え':'Switch to Japanese';
      assert.equal(instance.document.documentElement.lang,lang);
      assert.equal(button.textContent,lang==='ja'?'EN':'JA');
      assert.equal(button.getAttribute('aria-label'),target);
      assert.equal(button.getAttribute('title'),target);
      assert.equal(instance.el('helpButton').getAttribute('aria-label'),lang==='ja'?'使い方と注意事項':'How to use & notes');
      assert.equal(instance.el('helpButton').getAttribute('title'),lang==='ja'?'使い方と注意事項':'How to use & notes');
    };
    app.type('Keep this script');app.setting('pageSplitGroup','line');
    check(app,language);
    app.el('languageButton').click();check(app,language==='ja'?'en':'ja');
    assert.equal(app.el('editor').value,'Keep this script');assert.equal(app.saved().pageSplit,'line');
    check(boot(file,language,app.stored),language==='ja'?'en':'ja');
    app.el('languageButton').click();check(app,language);
    check(boot(file,language,app.stored),language);
  });
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

  const pages=Array.from({length:200},(_,i)=>`Page ${i+1}`);
  const withPages=(count=3)=>{
    const app=boot(file,language);app.type(pages.slice(0,count).join('\n'));app.setting('pageSplitGroup','line');app.fit();app.flushFrames();
    app.prints=[];app.window.print=()=>app.prints.push(app.el('pagesContainer').children.map(p=>p.children[0].children[0].textContent));return app;
  };
  const jump=(app,value,enter=false)=>{
    const input=app.el('pageNumber');assert.ok(input,'page number input exists');input.value=value;input.dispatch('input');
    return enter?input.dispatch('keydown',{key:'Enter'}):app.el('goPageButton').click();
  };
  test(`${label}: direct page jump selects 180 and 200 without changing all-page output`,()=>{
    const app=withPages(200),before=JSON.stringify(app.saved()),papers=app.el('pagesContainer').children;
    jump(app,'180');assert.equal(app.el('pageNavStatus').textContent,'180 / 200');assert.equal(app.el('pageNumber').value,'180');
    assert.equal(papers.filter(p=>p.classList.contains('is-preview-active')).length,1);assert.equal(papers[179].classList.contains('is-preview-active'),true);
    assert.match(app.el('previewStatus').textContent,/180\/200/);assert.equal(app.el('pagesContainer').children,papers);assert.equal(JSON.stringify(app.saved()),before);
    assert.equal(jump(app,'200',true).defaultPrevented,true);assert.equal(app.el('nextPageButton').disabled,true);
    app.el('prevPageButton').click();assert.equal(app.el('pageNumber').value,'199');app.press('ArrowLeft');assert.equal(app.el('pageNumber').value,'198');
    jump(app,'1');assert.equal(app.el('prevPageButton').disabled,true);app.el('printButton').click();jump(app,'180');app.flushFrames();assert.deepEqual(app.prints[0],pages);
  });
  test(`${label}: page input leaves intermediate typing alone and validates only Go or Enter`,()=>{
    const app=withPages(200),input=app.el('pageNumber');assert.ok(input,'page number input exists');
    for(const value of ['','0','-1','1.5','201','abc','1e2','Infinity']){
      input.value=value;input.dispatch('input');assert.equal(input.value,value);assert.equal(app.el('pageNavStatus').textContent,'1 / 200');
      input.dispatch('keydown',{key:'Enter'});assert.equal(input.value,value);assert.equal(app.el('pageNavStatus').textContent,'1 / 200');
      assert.equal(input.getAttribute('aria-invalid'),'true');assert.match(app.el('pageJumpError').textContent,language==='ja'?/1.*200.*整数/:/whole number.*1.*200/);
    }
    jump(app,'180');assert.equal(input.getAttribute('aria-invalid'),'false');assert.equal(app.el('pageJumpError').textContent,'');
    for(const key of ['ArrowLeft','ArrowRight'])assert.equal(app.press(key,input).defaultPrevented,false);
    assert.equal(app.el('pageNavStatus').textContent,'180 / 200');
    input.value='100';assert.equal(input.dispatch('keydown',{key:'Enter',isComposing:true}).defaultPrevented,false);assert.equal(app.el('pageNumber').value,'100');assert.equal(app.el('pageNavStatus').textContent,'180 / 200');
  });
  test(`${label}: direct page range follows newer text and split settings, including over-limit preview`,()=>{
    const app=withPages(200);jump(app,'180');app.type('A\nB');jump(app,'180');assert.equal(app.el('pageNavStatus').textContent,'2 / 2');assert.equal(app.el('pageNumber').max,'2');assert.equal(app.el('pageNumber').getAttribute('aria-invalid'),'true');
    jump(app,'1');assert.equal(app.el('pageNavStatus').textContent,'1 / 2');app.setting('pageSplitGroup','single');app.fit();assert.equal(app.el('pageNavBar').hidden,true);assert.equal(app.el('pageNumber').max,'1');
    app.setting('pageSplitGroup','line');app.type([...pages,'Page 201'].join('\n'));app.fit();jump(app,'201');assert.equal(app.el('pageNavStatus').textContent,'201 / 201');assert.equal(app.el('pagesContainer').children[0].children[0].children[0].textContent,'Page 201');assert.equal(app.el('printButton').disabled,true);
    app.type('');app.fit();assert.equal(app.el('pageNavBar').hidden,true);assert.equal(app.el('pageNumber').disabled,true);
  });
  for(const button of ['printButton','mobilePrintButton']){
    for(const replacement of ['',Array(201).fill('A').join('\n')])test(`${label}: ${button} rejects invalid text during pending fit`,()=>{
      const app=withPages();app.type(replacement);assert.equal(app.el('printButton').disabled,true);assert.equal(app.el('mobilePrintButton').disabled,true);
      app.el(button).dispatch('click');app.flushFrames();assert.equal(app.prints.length,0);
    });
    for(const when of [0,1])test(`${label}: ${button} cancels queued printing after edits at frame ${when}`,()=>{
      const app=withPages();app.el(button).click();if(when)app.frame();app.type('new valid text');app.fit();app.flushFrames();assert.equal(app.prints.length,0);
      app.el(button).click();app.flushFrames();assert.deepEqual(app.prints,[['new valid text']]);
    });
    for(const count of [1,3,200])test(`${label}: ${button} prints a valid ${count}-page job once`,()=>{
      const app=withPages(count);app.el(button).click();app.flushFrames();assert.deepEqual(app.prints,[pages.slice(0,count)]);
    });
  }
  for(const button of ['printButton','mobilePrintButton'])for(const replacement of ['',Array(201).fill('A').join('\n')])for(const settled of [false,true])test(`${label}: ${button} cancels an empty/over-limit queued job, settled=${settled}`,()=>{
    const app=withPages();app.el(button).click();app.frame();app.type(replacement);if(settled)app.fit();app.flushFrames();assert.equal(app.prints.length,0);
  });
  test(`${label}: language changes and preview arrows preserve a queued all-page print`,()=>{
    const app=withPages();app.el('printButton').click();app.el('languageButton').click();app.el('nextPageButton').click();app.flushFrames();assert.deepEqual(app.prints,[pages.slice(0,3)]);
  });
  test(`${label}: a direct Print event recomputes newly valid input before accepting it`,()=>{
    const app=withPages();app.type('');app.fit();app.type('Current text');app.el('mobilePrintButton').dispatch('click');app.flushFrames();assert.deepEqual(app.prints,[['Current text']]);
  });
  test(`${label}: each output setting invalidates a queued print`,()=>{
    const edits={customMargin:['change','20'],fontFamily:['change','serif'],boldToggle:['change',null],textAlign:['change','left'],verticalAlign:['change','start'],textColor:['input','#334455'],backgroundColor:['input','#ddeeff'],lineHeight:['input','1.5'],letterSpacing:['input','0.1'],outline:['change','1']};
    for(const [id,[event,value]] of Object.entries(edits)){const app=withPages();app.el('printButton').click();app.el(id).value=value;app.el(id).dispatch(event);assert.equal(app.el('printButton').disabled,true);app.fit();app.flushFrames();assert.equal(app.prints.length,0,id);}
  });
  test(`${label}: immediate Clear cancels queued print and cannot start an empty print`,()=>{
    const app=withPages();app.el('printButton').click();app.el('clearButton').click();app.el('printButton').dispatch('click');app.flushFrames();assert.equal(app.prints.length,0);
  });
  test(`${label}: output settings and both resets cancel queued printing even after refit`,()=>{
    const changes=[app=>app.setting('pageSplitGroup','single'),app=>app.setting('orientationGroup','landscape'),app=>app.setting('marginGroup','5'),app=>app.el('resetSettingsButton').click(),app=>app.el('resetAdvancedButton').click()];
    for(const change of changes){const app=withPages();app.el('printButton').click();app.frame();change(app);app.fit();app.flushFrames();assert.equal(app.prints.length,0);}
  });
  test(`${label}: final print handoff rechecks fit validity and newer print requests replace older ones`,()=>{
    const app=withPages();app.el('printButton').click();app.frame();app.el('measureBox').scrollHeight=1e9;app.flushFrames();assert.equal(app.prints.length,0);
    app.el('measureBox').scrollHeight=100;app.fit();app.el('printButton').dispatch('click');app.el('mobilePrintButton').dispatch('click');app.flushFrames();assert.equal(app.prints.length,1);
  });
  test(`${label}: beforeprint refresh and native print shortcut remain available`,()=>{
    const app=withPages();app.type('Latest\nSecond');assert.equal(app.press('p',app.document.body,{ctrlKey:true}).defaultPrevented,false);assert.equal(app.press('p',app.document.body,{metaKey:true}).defaultPrevented,false);
    app.window.dispatch('beforeprint');assert.deepEqual(app.el('pagesContainer').children.map(p=>p.children[0].children[0].textContent),['Latest','Second']);
  });
}
test('the initial version badge matches the canonical app version',()=>{
  const config=require('../app.config.json');
  for(const target of targets)assert.equal(loadHtml(path.resolve(root,target)).match(/id="versionBadge">([^<]+)/)[1],`v${config.version}`,target);
});
if(targets.length>1)test('source and every release share the same runtime and help content',()=>{
  const stable=file=>loadHtml(path.resolve(root,file)).replace(/\r\n/g,'\n').replace(/const APP_CONFIG = .*?;/,'const APP_CONFIG = {};').replace(/const BUILD_MANIFEST = .*?;/,'const BUILD_MANIFEST = {};').replace(/const EMBEDDED_ASSET_BUNDLE = .*?;/,'const EMBEDDED_ASSET_BUNDLE = {};');
  const parts=file=>{const h=stable(file);return [h.slice(h.indexOf('<!-- APP:HELP:BEGIN -->'),h.indexOf('<!-- APP:HELP:END -->')),h.slice(h.indexOf('<script>'),h.lastIndexOf('</script>'))];};
  for(const file of targets.slice(1))assert.deepEqual(parts(file),parts(targets[0]),file);
});
