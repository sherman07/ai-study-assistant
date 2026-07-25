import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
await page.goto('https://innook.cn/', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 1500));
await page.evaluate(() => {
  const el = [...document.querySelectorAll('a,button')].find(e => (e.innerText||'').includes('开始学习'));
  el?.click();
});
await page.waitForFunction(() => document.body.innerText.includes('STEP 01'), { timeout: 15000 });
await new Promise(r => setTimeout(r, 2000));
await page.screenshot({ path: '/opt/cursor/artifacts/innook-setup-sitting.png' });

const dump = await page.evaluate(() => {
  const pick = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      className: el.className?.toString?.().slice(0, 200),
      text: (el.innerText || '').trim().slice(0, 120),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      styles: {
        bg: cs.backgroundColor,
        backdrop: cs.backdropFilter || cs.webkitBackdropFilter,
        radius: cs.borderRadius,
        border: cs.border,
        color: cs.color,
        font: cs.font,
        padding: cs.padding,
        gap: cs.gap,
        display: cs.display,
        grid: cs.gridTemplateColumns,
        boxShadow: cs.boxShadow,
        width: cs.width,
        height: cs.height,
        opacity: cs.opacity,
      }
    };
  };

  // Find largest glass panels
  const candidates = [...document.querySelectorAll('div,section,aside,nav')].map(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const blur = (cs.backdropFilter || cs.webkitBackdropFilter || '');
    const area = r.width * r.height;
    return { el, area, blur, r, hasBlur: blur.includes('blur') };
  }).filter(x => x.r.width > 40 && x.r.height > 40);

  const blurred = candidates.filter(c => c.hasBlur).sort((a,b)=>b.area-a.area).slice(0,12).map(c => pick(c.el));

  // Scene thumbnails - buttons with images
  const sceneBtns = [...document.querySelectorAll('button, [role=button]')].filter(b => {
    const t = b.innerText || '';
    return t.includes('晨光') || t.includes('窗边') || t.includes('咖啡') || t.includes('教室');
  }).slice(0, 12).map(pick);

  // Images
  const imgs = [...document.querySelectorAll('img')].slice(0, 40).map(img => ({
    src: img.currentSrc || img.src,
    alt: img.alt,
    w: img.naturalWidth,
    h: img.naturalHeight,
    rect: (() => { const r = img.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; })()
  }));

  // Background of body/root
  const root = document.querySelector('#root') || document.body;
  const rootBg = getComputedStyle(root).backgroundImage || getComputedStyle(document.body).backgroundImage;
  const bgEls = [...document.querySelectorAll('*')].filter(el => {
    const bg = getComputedStyle(el).backgroundImage;
    return bg && bg !== 'none' && bg.includes('url');
  }).slice(0, 15).map(el => ({
    className: el.className?.toString?.().slice(0,120),
    bg: getComputedStyle(el).backgroundImage.slice(0, 300),
    rect: (()=>{const r=el.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height)};})()
  }));

  // All buttons texts
  const buttons = [...document.querySelectorAll('button')].map(b => ({
    text: (b.innerText||'').trim().slice(0,80),
    aria: b.getAttribute('aria-label'),
    ...pick(b)
  }));

  // HTML structure sample of main content
  const html = document.body.innerHTML.slice(0, 50000);

  return { blurred, sceneBtns, imgs, bgEls, buttons: buttons.slice(0, 80), rootBg: rootBg?.slice?.(0,200), bodyText: document.body.innerText };
});

fs.writeFileSync('/opt/cursor/artifacts/innook-setup-dump.json', JSON.stringify(dump, null, 2));
console.log('blurred panels', dump.blurred.length);
console.log('imgs', dump.imgs.length, dump.imgs.slice(0,5));
console.log('bgEls', dump.bgEls);
console.log('scene count-ish', dump.sceneBtns.length);

// Click next / 进入自习室
const entered = await page.evaluate(() => {
  const el = [...document.querySelectorAll('button')].find(e => (e.innerText||'').includes('进入自习室') || (e.innerText||'') === '进入');
  if (!el) return false;
  el.click();
  return (el.innerText||'').trim();
});
console.log('clicked enter', entered);
await new Promise(r => setTimeout(r, 3500));
await page.screenshot({ path: '/opt/cursor/artifacts/innook-focus-main.png' });
const after = await page.evaluate(() => document.body.innerText.slice(0, 3500));
console.log('FOCUS TEXT\n', after);

// Also download main JS for scene names / structure clues
const js = await (await fetch('https://innook.cn/assets/index-j7nwd6ha.js')).text();
fs.writeFileSync('/opt/cursor/artifacts/innook-index.js', js);
console.log('js size', js.length);

await browser.close();
