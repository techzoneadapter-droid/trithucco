const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const artifacts = path.join(root, 'test-results');
fs.mkdirSync(artifacts, { recursive: true });
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, body) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream');
    res.end(body);
  });
});

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    // Keep every validation check isolated from the live Google Sheet.
    await page.route('**/script.js', route => route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'script.js'), 'utf8').replace(/const GOOGLE_SCRIPT_URL = .*?;/, 'const GOOGLE_SCRIPT_URL = "";') }));
    for (const width of process.env.QUICK_CHECK ? [] : [1440, 820, 360, 390, 400, 430]) {
      await page.setViewportSize({ width, height: width > 820 ? 1000 : 844 });
      await page.goto(base);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('.hero-book img')).toBeVisible();
      await page.waitForTimeout(800);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}`);
      if (width <= 430) {
        const cta = await page.locator('.hero-offer .primary-cta').boundingBox();
        assert.ok(cta.y + cta.height < 760, `Hero CTA too low at ${width}: ${cta.y}`);
      }
      await page.screenshot({ path: path.join(artifacts, `hero-${width}.png`) });
      for (let y = 0; y < await page.evaluate(() => document.body.scrollHeight); y += 600) {
        await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
        await page.waitForTimeout(80);
      }
      await page.waitForTimeout(800);
      assert.equal(await page.locator('img').evaluateAll(imgs => imgs.every(img => img.complete && img.naturalWidth > 0)), true);
      await page.screenshot({ path: path.join(artifacts, `full-${width}.png`), fullPage: true });
      if (width === 390) {
        for (const section of ['insight', 'topics', 'lifestyle', 'order-panel']) {
          await page.locator(`.${section}`).screenshot({ path: path.join(artifacts, `${section}-390.png`) });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base);
    const buttons = page.locator('.js-buy');
    for (let i = 0; i < await buttons.count(); i++) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(300);
      await buttons.nth(i).evaluate(el => el.click());
      await page.waitForTimeout(1400);
      const box = await page.locator('#order-form').boundingBox();
      assert.ok(box.y >= 58 && box.y < 110, `CTA ${i} misses form: ${box.y}`);
      await expect(page.locator('#mobile-buy-bar')).toHaveClass(/is-hidden/);
      assert.equal(page.url(), base);
    }
    await page.locator('.submit-btn').click();
    await expect(page.locator('#form-message')).toContainText('Vui lòng điền đủ');
    await page.locator('[name=name]').fill('Người kiểm thử');
    await page.locator('[name=phone]').fill('123');
    await page.locator('[name=address]').fill('Địa chỉ kiểm thử');
    await page.locator('.submit-btn').click();
    await expect(page.locator('#form-message')).toContainText('chưa đúng');
    await page.locator('[name=phone]').fill('0901234567');
    await page.locator('[name=quantity]').fill('2');
    await expect(page.locator('#total-price')).toHaveText('398.000đ');
    await expect(page.locator('.submit-btn')).toContainText('398.000đ');
    await page.locator('[name=quantity]').fill('1.5');
    await page.locator('.submit-btn').click();
    await expect(page.locator('#form-message')).toContainText('số lượng nguyên');
    await page.locator('[name=quantity]').fill('2');
    await page.locator('.submit-btn').click();
    await expect(page.locator('#form-message')).toContainText('chưa thể tiếp nhận');

    // Intercept only test traffic: never write a fake order to the real Sheet.
    await page.unroute('**/script.js');
    await page.route('**/script.js', route => route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'script.js'), 'utf8').replace(/const GOOGLE_SCRIPT_URL = .*?;/, 'const GOOGLE_SCRIPT_URL = "https://orders.test/exec";') }));
    let posts = 0;
    let fail = false;
    await page.route('https://orders.test/exec*', async route => {
      if (route.request().method() === 'POST') {
        posts++;
        assert.equal(route.request().postDataJSON().total, 398000);
        await new Promise(resolve => setTimeout(resolve, 350));
        await route.fulfill({ json: { success: !fail } });
      } else await route.fulfill({ json: { success: true, orders: 37 } });
    });
    await page.goto(base);
    await expect(page.locator('#promo-count')).toContainText('27 đơn đăng ký – còn 73');
    await page.evaluate(() => increaseDisplayedOrderCount());
    await expect(page.locator('#promo-count')).toContainText('28 đơn đăng ký – còn 72');
    for (const shouldFail of [false, true]) {
      fail = shouldFail;
      await page.locator('[name=name]').fill('Người kiểm thử');
      await page.locator('[name=phone]').fill('0901234567');
      await page.locator('[name=address]').fill('Địa chỉ kiểm thử');
      await page.locator('[name=quantity]').fill('2');
      await page.locator('#order-form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
      await expect(page.locator('.submit-btn')).toBeDisabled();
      await expect(page.locator('#form-message')).toContainText(shouldFail ? 'Chưa xác nhận' : 'Đặt sách thành công');
      await expect(page.locator('.submit-btn')).toBeEnabled();
      await expect(page.locator('[name=quantity]')).toHaveValue(shouldFail ? '2' : '1');
      const purchaseEvents = await page.evaluate(() => dataLayer.filter(entry => entry && entry.event === 'purchase'));
      assert.equal(purchaseEvents.length, 1, 'Purchase must fire only after confirmed success');
      assert.equal(purchaseEvents[0].value, 398000);
      assert.equal(purchaseEvents[0].items[0].quantity, 2);
    }
    assert.equal(posts, 2, 'Duplicate submit');
    assert.deepEqual(errors, [], 'Browser console errors');
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const staticPage = await noJs.newPage();
    await staticPage.goto(base);
    await expect(staticPage.locator('h1')).toBeVisible();
    await expect(staticPage.locator('.order-panel')).toHaveCSS('opacity', '1');
    await noJs.close();
    console.log('Browser OK: responsive screenshots (unless QUICK_CHECK), images, all CTAs, validation, totals, sticky, confirmed success/failure, duplicate-click guard and content without JS.');
  } finally { await browser.close(); }
}

// Test Apps Script with a Sheet double, including blank rows and server-side prices.
const rows = [['header'], [new Date(), 'Name', '0901234567', 'Address', 1], [], ['', '', '', '', '']];
const sheet = { getDataRange: () => ({ getValues: () => rows }), getRange: () => ({ getValues: () => [rows[0]], setValues: values => { rows[0] = values[0]; } }), setFrozenRows() {}, appendRow(row) { rows.push(row); } };
const context = vm.createContext({ SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }) }, ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) }, LockService: { getScriptLock: () => ({ waitLock() {}, hasLock: () => true, releaseLock() {} }) } });
vm.runInContext(fs.readFileSync(path.join(root, 'apps-script/Code.gs'), 'utf8'), context);
assert.equal(context.doGet({ parameter: {} }).orders, 1);
const payload = { name: '=formula', phone: '0901234567', address: 'Address', quantity: 2, unitPrice: 1 };
assert.equal(context.doPost({ postData: { contents: JSON.stringify(payload) } }).success, true);
assert.equal(rows.at(-1)[6], 398000);
assert.equal(rows.at(-1)[1], "'=formula");
assert.equal(context.doPost({ postData: { contents: JSON.stringify({ ...payload, quantity: 1.5 }) } }).success, false);
assert.equal(context.doGet({ parameter: { action: 'count' } }).orders, 2);
console.log('Apps Script OK: real row counting, validation, authoritative total, safe cells.');
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
