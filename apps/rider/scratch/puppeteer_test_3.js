const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log('Navigating...');
  await page.goto('http://localhost:3000/dashboard/pos', { waitUntil: 'networkidle0' });
  
  // Wait for React to mount
  await new Promise(r => setTimeout(r, 2000));
  
  // Try to find a product and add it to cart
  console.log('Clicking first menu item...');
  await page.evaluate(() => {
    // find a button inside the menu grid
    const btns = Array.from(document.querySelectorAll('button'));
    // Usually menu items have price like ฿
    const menuBtn = btns.find(b => b.textContent.includes('฿') || b.className.includes('bg-white'));
    if(menuBtn) menuBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Click Cash button
  console.log('Clicking Cash button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const cashBtn = btns.find(b => b.textContent.includes('เงินสด') || b.textContent.includes('CASH'));
    if(cashBtn) cashBtn.click();
  });

  await new Promise(r => setTimeout(r, 1000));
  
  // Click Submit
  console.log('Clicking Submit Payment...');
  await page.evaluate(() => {
    // Just force the payment to process
    // Actually we need to set cash first
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
