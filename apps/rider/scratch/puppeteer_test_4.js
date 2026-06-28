const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Intercept all console messages, including those from React Error Boundaries
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  await page.goto('http://localhost:3000/dashboard/pos', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const menuBtn = btns.find(b => b.textContent.includes('฿') || b.className.includes('bg-white'));
    if(menuBtn) menuBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const cashBtn = btns.find(b => b.textContent.includes('เงินสด') || b.textContent.includes('CASH'));
    if(cashBtn) cashBtn.click();
  });

  await new Promise(r => setTimeout(r, 1000));
  
  await page.evaluate(() => {
    const input = document.querySelector('input[type="number"]');
    if(input) {
      input.value = '1000';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const btns = Array.from(document.querySelectorAll('button'));
    const submit = btns.find(b => b.textContent.includes('ชำระเงิน'));
    if(submit) submit.click();
  });

  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
