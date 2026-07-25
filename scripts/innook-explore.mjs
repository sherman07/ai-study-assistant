import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
});

const page = await browser.newPage();
const jsUrls = new Set();
page.on('response', (res) => {
  const url = res.url();
  if (/\.js(\?|$)/.test(url) && url.includes('innook')) jsUrls.add(url);
  else if (/\.js(\?|$)/.test(url) && res.request().resourceType() === 'script') jsUrls.add(url);
});

await page.goto('https://innook.cn/', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 2500));
await page.screenshot({ path: '/opt/cursor/artifacts/innook-landing.png', fullPage: false });

const text = await page.evaluate(() => document.body.innerText.slice(0, 3500));
console.log('--- LANDING TEXT ---\n', text);

const ctas = await page.evaluate(() => [...document.querySelectorAll('a,button')].map(el => ({
  tag: el.tagName,
  text: (el.innerText || el.textContent || '').trim().slice(0, 100),
  href: el.getAttribute('href'),
})).filter(x => x.text));
console.log('CTAS', JSON.stringify(ctas, null, 2));

// Click start study
await page.evaluate(() => {
  const el = [...document.querySelectorAll('a,button')].find(e => (e.innerText||'').includes('开始学习'));
  if (el) el.click();
});
await new Promise(r => setTimeout(r, 5000));
console.log('URL after', page.url());
await page.screenshot({ path: '/opt/cursor/artifacts/innook-after-start.png' });
console.log('AFTER TEXT\n', await page.evaluate(() => document.body.innerText.slice(0, 4000)));

// Try clicking any guest/login free options
const more = await page.evaluate(() => [...document.querySelectorAll('a,button,[role=button]')].map(el => (el.innerText||'').trim()).filter(Boolean).slice(0, 40));
console.log('MORE BUTTONS', more);

fs.writeFileSync('/opt/cursor/artifacts/innook-js-urls.json', JSON.stringify([...jsUrls], null, 2));
console.log('JS urls', [...jsUrls].slice(0, 30));

await browser.close();
