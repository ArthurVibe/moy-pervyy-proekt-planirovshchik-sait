'use strict';
// Captures the actual browser animation. Labels and pointer are added only to the recording.
const {chromium}=require(process.env.PRIVATE_CLUB_PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'docs/previews/v3.3');
const dir=process.env.PRIVATE_CLUB_CAPTURE_DIR||'/tmp/private-club-v33-recording';
const url=process.env.PRIVATE_CLUB_PREVIEW_URL||'http://127.0.0.1:8768/';
const sleep=(p,ms)=>p.waitForTimeout(ms);
let activeBrowser;
(async()=>{
 fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch({executablePath:process.env.PRIVATE_CLUB_CHROMIUM_EXECUTABLE,args:['--no-sandbox']});
 activeBrowser=b;
 const close=await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
 await close.goto(url);await close.evaluate(()=>document.fonts.ready);await sleep(close,700);
 for(const[selector,name]of[['#meet-bro','meet-bro'],['.button-outline','how-it-works'],['.invitation','get-early-access']]){
  await close.mouse.move(700,870);await sleep(close,650);const r=await close.locator(selector).boundingBox();
  await close.locator(selector).hover();await sleep(close,1100);
  await close.screenshot({path:path.join(out,name+'-hover-2x.png'),clip:{x:Math.floor(r.x-24),y:Math.floor(r.y-18),width:Math.ceil(r.width+48),height:Math.ceil(r.height+60)}});
 }
 await close.mouse.move(700,870);await sleep(close,650);await close.locator('.brand').hover();await sleep(close,150);
 await close.evaluate(()=>{const a=document.getAnimations().find(a=>a.animationName==='living-engraving');if(!a)throw new Error('Logo wave was not armed');a.pause();a.currentTime=425});
 const logo=await close.locator('.brand').boundingBox();
 await close.screenshot({path:path.join(out,'logo-wave-2x.png'),clip:{x:Math.floor(logo.x-8),y:Math.max(0,Math.floor(logo.y-5)),width:Math.ceil(logo.width+16),height:Math.ceil(logo.height+10)}});
 await close.close();
 const p=await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await p.goto(url);await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>document.querySelector('#club-photo').naturalWidth===2560);await sleep(p,700);await p.mouse.move(700,870);
 await p.evaluate(()=>{window.capturePointer=[{x:700,y:870,t:Date.now()/1000}];document.addEventListener('pointermove',e=>window.capturePointer.push({x:e.clientX,y:e.clientY,t:Date.now()/1000}))});
 const cdp=await p.context().newCDPSession(p),frames=[],labels=[];
 cdp.on('Page.screencastFrame',event=>{
  const file=path.join(dir,String(frames.length).padStart(5,'0')+'.jpg');fs.writeFileSync(file,Buffer.from(event.data,'base64'));frames.push({file,t:Date.now()/1000});
  cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});
 });
 const label=text=>labels.push({text,t:Date.now()/1000});
 const away=async()=>{await p.mouse.move(700,870,{steps:12});await sleep(p,650)};
 const hover=async(selector)=>{const r=await p.locator(selector).boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height/2,{steps:24});await sleep(p,2300)};
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:95,maxWidth:1440,maxHeight:900,everyNthFrame:1});
 label('v3.3 | Actual browser recording | 1440 x 900');await sleep(p,800);
 for(const[selector,title]of[['#meet-bro','Meet Bro'],['.button-outline','How It Works'],['.invitation','Get Early Access'],['.wordmark-bottom','BRO? / Living Engraving']]){label('Hover: '+title+' | One pass, then hold');await hover(selector);await away()}
 for(const[selector,title]of[['#meet-bro','Meet Bro'],['.invitation','Get Early Access'],['.brand','BRO?']]){
  label('Rapid re-entry: '+title+' | Reset on each exit');const r=await p.locator(selector).boundingBox();
  for(let i=0;i<3;i++){await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await sleep(p,140);await p.mouse.move(r.x+r.width+30,r.y+r.height+35);await sleep(p,130)}
  await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await sleep(p,1300);await away();
 }
 for(const[selector,title]of[['#meet-bro','Meet Bro'],['.invitation','Get Early Access']]){
  const r=await p.locator(selector).boundingBox();label('Lower-edge hold: '+title+' | 2 CSS px above bottom / 3.2 s');
  await p.mouse.move(r.x+r.width/2,r.y+r.height+15,{steps:18});await sleep(p,250);
  await p.mouse.move(r.x+r.width/2,r.y+r.height-2,{steps:8});await sleep(p,3200);await away();
 }
 label('End | No repeated waves while the pointer is stationary');await sleep(p,650);
 await cdp.send('Page.stopScreencast');const end=Date.now()/1000,start=frames[0].t,pointer=await p.evaluate(()=>window.capturePointer);
 if(frames.length<100)throw new Error('Insufficient screencast frames');
 const clock=s=>{const n=Math.max(0,Math.round(s*100));return Math.floor(n/360000)+':'+String(Math.floor(n/6000)%60).padStart(2,'0')+':'+String(Math.floor(n/100)%60).padStart(2,'0')+'.'+String(n%100).padStart(2,'0')};
 let ass='[Script Info]\nScriptType: v4.00+\nPlayResX: 1440\nPlayResY: 900\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Pointer,DejaVu Sans,16,&H00FFFFFF,&H00FFFFFF,&H001A1D18,&H601A1D18,0,0,0,0,100,100,0,0,1,1,1,7,0,0,0,1\nStyle: Label,DejaVu Sans,18,&H00CDDFE9,&H00CDDFE9,&H001B2214,&H001B2214,0,0,0,0,100,100,0,0,3,8,0,2,20,20,18,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';
 for(let i=0;i<pointer.length;i++){const a=Math.max(0,pointer[i].t-start),z=Math.max(0,(pointer[i+1]?.t??end)-start);if(z-a<.005)continue;ass+='Dialogue: 1,'+clock(a)+','+clock(z)+',Pointer,,0,0,0,,{\\an7\\pos('+pointer[i].x+','+pointer[i].y+')\\p1}m 0 0 l 0 19 5 15 9 23 13 21 9 13 16 12 0 0{\\p0}\n'}
 for(let i=0;i<labels.length;i++){ass+='Dialogue: 0,'+clock(labels[i].t-start)+','+clock((labels[i+1]?.t??end)-start)+',Label,,0,0,0,,'+labels[i].text+'\n'}
 fs.writeFileSync(path.join(dir,'cursor.ass'),ass);fs.writeFileSync(path.join(dir,'frames.json'),JSON.stringify({frames,pointer,labels,start,end}));
 const metadata={viewport:{width:1440,height:900},dpr:1,browser:await b.version(),frames:frames.length,duration:end-start,sequence:labels.map(l=>({text:l.text,startSeconds:Math.max(0,l.t-start)})),closeups:{dpr:2,logoAnimationTimeMs:425},note:'CDP screencast resampled to 30 fps from timestamps; pointer coordinates and labels composited only in video.'};
 fs.writeFileSync(path.join(out,'recording.json'),JSON.stringify(metadata,null,2));console.log(JSON.stringify(metadata,null,2));await b.close();
})().catch(async e=>{console.error(e);await activeBrowser?.close();process.exitCode=1});
