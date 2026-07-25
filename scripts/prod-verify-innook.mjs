import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox','--disable-dev-shm-usage','--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  window.SYNAPSE_FOCUS_ROOM_ENABLED = true;
  try { localStorage.clear(); } catch {}
});
page.on('console', m => { if (m.type()==='error') console.log('ERR', m.text().slice(0,200)); });
page.on('pageerror', e => console.log('PAGE', e.message.slice(0,200)));
await page.goto('https://synapse-ai-study-assistant-tutor.vercel.app/frontend/focus-room.html#/focus-room', {
  waitUntil: 'networkidle2', timeout: 90000,
});
await new Promise(r => setTimeout(r, 4000));
const info = await page.evaluate(() => ({
  text: document.body.innerText.slice(0, 700),
  innook: Boolean(document.querySelector('.innook-scene-setup')),
  old: Boolean(document.querySelector('.focus-setup-controls')),
  title: document.querySelector('#innook-scene-title, .setup-panel-intro h1')?.textContent,
  durations: document.querySelectorAll('.innook-duration').length,
  scenes: document.querySelectorAll('.scene-card').length,
  surface: document.getElementById('focusRoomSurface')?.getAttribute('data-focus-room-view'),
}));
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: '/opt/cursor/artifacts/prod-innook-setup-verify.png' });
await browser.close();
