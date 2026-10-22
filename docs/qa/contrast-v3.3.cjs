'use strict';
const {chromium}=require(process.env.PRIVATE_CLUB_PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path');
const url=process.env.PRIVATE_CLUB_PREVIEW_URL||'http://127.0.0.1:8768/',dir=process.env.PRIVATE_CLUB_CONTRAST_DIR||'/tmp/private-club-v33-contrast';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const b=await chromium.launch({...(process.env.PRIVATE_CLUB_CHROMIUM_EXECUTABLE?{executablePath:process.env.PRIVATE_CLUB_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']});
 const p=await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}),samples=[];
 await p.goto(url+'?warmWelcome=off');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(700);
 const stop=async(page,time)=>{await page.evaluate(time=>{document.getAnimations().forEach(a=>{a.pause();const d=Number(a.effect.getTiming().duration);a.currentTime=Math.min(time,d||time)})},time);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))};
 const idle=async(page)=>{await page.evaluate(()=>document.getAnimations().forEach(a=>{try{a.finish()}catch{a.cancel()}}));await page.mouse.move(700,870);await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('Escape');await page.waitForTimeout(650)};
 const capture=async(page,selector,state)=>{
  const f=page.locator(selector+' .button-face');
  const label=await f.evaluate(e=>{const n=[...e.childNodes].find(n=>n.nodeType===3&&n.textContent.trim()),r=document.createRange();r.setStart(n,n.textContent.length-n.textContent.trimStart().length);r.setEnd(n,n.textContent.trimEnd().length);const b=r.getBoundingClientRect(),c=getComputedStyle(e);return{text:n.textContent.trim(),x:b.x,y:b.y,w:b.width,h:b.height,color:c.color,filter:c.filter}});
  const clip={x:Math.floor(label.x),y:Math.floor(label.y),width:Math.ceil(label.x+label.w)-Math.floor(label.x),height:Math.ceil(label.y+label.h)-Math.floor(label.y)};
  const name=String(samples.length).padStart(3,'0');
  await page.evaluate(({color,filter})=>{const e=document.createElement('div');e.id='qa-ink';Object.assign(e.style,{position:'fixed',left:'2px',top:'2px',width:'8px',height:'8px',background:color,filter,zIndex:'999999',pointerEvents:'none',border:'0',padding:'0',margin:'0'});document.body.append(e)},label);
  await page.screenshot({path:path.join(dir,name+'-ink.png'),clip:{x:2,y:2,width:8,height:8}});
  await f.evaluate(e=>e.style.color='transparent');await page.screenshot({path:path.join(dir,name+'-background.png'),clip});await f.evaluate(e=>e.style.removeProperty('color'));await page.locator('#qa-ink').evaluate(e=>e.remove());
  samples.push({button:label.text,selector,state,color:label.color,filter:label.filter,inkImage:name+'-ink.png',backgroundImage:name+'-background.png'});
 };
 for(const selector of ['#meet-bro','.button-outline','.invitation']){
  await idle(p);await capture(p,selector,'rest');
  for(const time of[120,240,400,650,1000]){await idle(p);await p.locator(selector).hover();await stop(p,time);await capture(p,selector,'hover '+time+'ms')}
  await idle(p);await p.keyboard.press('Tab');await p.locator(selector).focus();await stop(p,1000);await capture(p,selector,'focus-visible');
  await p.locator(selector).hover();await stop(p,400);await capture(p,selector,'focus-visible + hover wave');
  await idle(p);await p.locator(selector).hover();await stop(p,1000);await p.mouse.down();await stop(p,150);await capture(p,selector,'pointer active');await p.mouse.up();await p.keyboard.press('Escape');
  await idle(p);await p.keyboard.press('Tab');await p.locator(selector).focus();await stop(p,1000);await p.keyboard.down('Space');await stop(p,150);await capture(p,selector,'keyboard active + focus');await p.keyboard.up('Space');await p.keyboard.press('Escape');
  await idle(p);await p.emulateMedia({reducedMotion:'reduce'});await p.locator(selector).hover();await capture(p,selector,'reduced motion + hover');await idle(p);await p.keyboard.press('Tab');await p.locator(selector).focus();await capture(p,selector,'reduced motion + focus');await p.emulateMedia({reducedMotion:'no-preference'});
 }
 const t=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});await t.goto(url);await t.evaluate(()=>document.fonts.ready);await t.waitForTimeout(700);const c=await t.context().newCDPSession(t);
 for(const selector of ['#meet-bro','.button-outline','.invitation']){
  if(selector==='.invitation')await t.locator('#menu-toggle').tap();const r=await t.locator(selector).boundingBox();await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await stop(t,1000);await capture(t,selector,'touch active');await t.emulateMedia({reducedMotion:'reduce'});await capture(t,selector,'touch active + reduced motion');await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await t.waitForTimeout(100);await t.locator('#notice-close').tap();await t.emulateMedia({reducedMotion:'no-preference'});
 }
 fs.writeFileSync(path.join(dir,'samples.json'),JSON.stringify({method:'Rendered background under text-range bounds; actual opaque ink rendered through the same computed filter; CSS timing paused for deterministic capture.',samples},null,2));console.log('Captured '+samples.length+' contrast states');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
