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
  
  // Try to find a product and add it to cart to have cartTotal > 0
  console.log('Adding item to cart...');
  const addButtons = await page.$$('button');
  // Just click the first few buttons, maybe one is a product
  for(let i = 0; i < 5; i++) {
    if(addButtons[i]) await addButtons[i].click().catch(()=>null);
  }
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Click Cash button
  console.log('Clicking Cash button...');
  const cashButton = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('เงินสด'));
  });
  if(cashButton) {
    await cashButton.click();
    console.log('Clicked Cash button!');
  } else {
    console.log('Cash button not found');
  }

  await new Promise(r => setTimeout(r, 1000));
  
  // Click 1000 button
  const thousandBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('1000'));
  });
  if(thousandBtn) {
    await thousandBtn.click();
    console.log('Clicked 1000');
  }
  
  await new Promise(r => setTimeout(r, 500));

  // Click Submit
  const submitBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('ชำระเงิน'));
  });
  if(submitBtn) {
    await submitBtn.click();
    console.log('Clicked Submit');
  }

  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
