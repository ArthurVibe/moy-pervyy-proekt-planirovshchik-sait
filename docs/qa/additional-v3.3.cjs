'use strict';
// Checks retained Warm Welcome behavior and focus clipping at DPR 2.
const {chromium}=require(process.env.PRIVATE_CLUB_PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'docs/previews/v3.3'),url=process.env.PRIVATE_CLUB_PREVIEW_URL||'http://127.0.0.1:8768/';
const sleep=(p,ms)=>p.waitForTimeout(ms),results=[];
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PRIVATE_CLUB_CHROMIUM_EXECUTABLE,args:['--no-sandbox']});
 const p=await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
 await p.goto(url);await p.evaluate(()=>document.fonts.ready);await sleep(p,700);
 for(const[s,name,brightness,lift]of[['#meet-bro','meet-bro','brightness(1.13)',6],['.button-outline','how-it-works','none',4],['.invitation','get-early-access','brightness(1.1)',4]]){
  await p.mouse.move(700,870);await p.evaluate(()=>document.activeElement?.blur());await sleep(p,650);
  await p.keyboard.press('Tab');await p.locator(s).focus();await p.locator(s).hover();await sleep(p,1050);
  const r=await p.locator(s).boundingBox(),state=await p.locator(s+' .button-face').evaluate(e=>{const c=getComputedStyle(e);return{outline:c.outlineWidth,offset:c.outlineOffset,outlineStyle:c.outlineStyle,transform:new DOMMatrix(c.transform).m42,filter:c.filter}});
  assert.deepEqual(state,{outline:'2px',offset:'5px',outlineStyle:'solid',transform:-lift,filter:brightness});
  await p.screenshot({path:path.join(out,name+'-focus-hover-2x.png'),clip:{x:Math.floor(r.x-24),y:Math.floor(r.y-18),width:Math.ceil(r.width+48),height:Math.ceil(r.height+60)}});
  await p.mouse.move(700,870);await p.evaluate(()=>document.activeElement?.blur());await sleep(p,650);await p.locator(s).hover();await sleep(p,150);await p.emulateMedia({reducedMotion:'reduce'});await sleep(p,80);
  assert.deepEqual(await p.locator(s+' .button-face').evaluate(e=>{const c=getComputedStyle(e);return{transform:c.transform,filter:c.filter,animations:e.getAnimations({subtree:true}).length}}),{transform:'none',filter:brightness,animations:0});
  await p.emulateMedia({reducedMotion:'no-preference'});await sleep(p,100);assert.equal(await p.locator(s+' .button-face').evaluate(e=>getComputedStyle(e).transform),'none');assert.equal(await p.locator(s).getAttribute('data-wave'),null);
  results.push({name:name+' focus+hover and dynamic reduced motion',status:'passed',state});
 }
 await p.close();
 const reference=cp.execFileSync('git',['show','e5fd5aaeffaf3934accb24c68301000959421d21:index.html'],{cwd:root,encoding:'utf8'}),warm=[];
 for(const kind of['baseline','current','off']){
  const page=await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});if(kind==='baseline')await page.route(url+'__reference.html',r=>r.fulfill({contentType:'text/html',body:reference}));
  await page.goto(kind==='baseline'?url+'__reference.html':kind==='off'?url+'?warmWelcome=off':url);await page.evaluate(()=>document.fonts.ready);await sleep(page,700);await page.locator('#meet-bro').hover();await sleep(page,700);
  warm.push({kind,...await page.locator('.hero').evaluate(e=>{const c=getComputedStyle(e),a=getComputedStyle(e,'::after');return{width:c.getPropertyValue('--warm-width'),x:c.getPropertyValue('--warm-x'),y:c.getPropertyValue('--warm-y'),opacity:a.opacity,display:a.display,mode:e.dataset.warmWelcome,active:e.hasAttribute('data-warm-active')}})});
  await page.close();
 }
 for(const key of['width','x','y','opacity','display','mode','active'])assert.equal(warm[0][key],warm[1][key]);assert.equal(warm[1].opacity,'0.12');assert.equal(warm[2].display,'none');assert.equal(warm[2].active,false);
 results.push({name:'Warm Welcome baseline/current and query off',status:'passed',states:warm});
 fs.writeFileSync(path.join(out,'additional-checks.json'),JSON.stringify({results},null,2));console.log(JSON.stringify({results},null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
