import { chromium } from 'playwright';

async function manualTest() {
  console.log('🚀 Starting manual browser test...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down actions so we can see what's happening
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  try {
    // Test 1: Login Page
    console.log('📍 Test 1: Navigating to Login page...');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    // Check elements
    const heading = await page.textContent('h1');
    console.log(`   ✓ Page heading: "${heading}"`);

    const googleButton = await page.locator('button:has-text("Continue with Google")').isVisible();
    console.log(`   ✓ Google sign-in button visible: ${googleButton}`);

    const themeToggle = await page.locator('button[aria-label*="theme" i], button:has-text("Toggle theme")').first().isVisible();
    console.log(`   ✓ Theme toggle visible: ${themeToggle}`);

    // Take screenshot
    await page.screenshot({ path: './e2e/test-results/01-login-page.png' });
    console.log('   📸 Screenshot saved: e2e/test-results/01-login-page.png\n');

    // Test 2: Theme Toggle
    console.log('📍 Test 2: Testing theme toggle...');
    const htmlBefore = await page.locator('html').getAttribute('class');
    console.log(`   Initial theme class: "${htmlBefore || 'none'}"`);

    // Click theme toggle
    await page.locator('button').filter({ hasText: /toggle theme/i }).first().click().catch(() => {
      // Try alternative selector
      return page.locator('[aria-label*="theme" i]').first().click();
    });
    await page.waitForTimeout(500);

    const htmlAfter = await page.locator('html').getAttribute('class');
    console.log(`   After toggle class: "${htmlAfter || 'none'}"`);

    await page.screenshot({ path: './e2e/test-results/02-theme-toggled.png' });
    console.log('   📸 Screenshot saved: e2e/test-results/02-theme-toggled.png\n');

    // Test 3: Protected Routes Redirect
    console.log('📍 Test 3: Testing protected route redirects...');

    const routes = ['/', '/users', '/groups', '/settings', '/audit-logs'];
    for (const route of routes) {
      await page.goto(`http://localhost:5173${route}`);
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      const redirectedToLogin = currentUrl.includes('/login');
      console.log(`   Route ${route}: ${redirectedToLogin ? '✓ Redirected to login' : '✗ NOT redirected (URL: ' + currentUrl + ')'}`);
    }
    console.log('');

    // Test 4: Mobile Responsive
    console.log('📍 Test 4: Testing mobile responsive layout...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    const mobileHeading = await page.locator('h1').isVisible();
    const mobileButton = await page.locator('button:has-text("Continue with Google")').isVisible();
    console.log(`   ✓ Mobile heading visible: ${mobileHeading}`);
    console.log(`   ✓ Mobile button visible: ${mobileButton}`);

    await page.screenshot({ path: './e2e/test-results/03-mobile-view.png' });
    console.log('   📸 Screenshot saved: e2e/test-results/03-mobile-view.png\n');

    // Test 5: Check UI Elements Detail
    console.log('📍 Test 5: Checking UI elements in detail...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    // Check logo
    const logo = await page.locator('text=A').first().isVisible();
    console.log(`   ✓ Logo "A" visible: ${logo}`);

    // Check card
    const welcomeText = await page.textContent('text=Welcome back');
    console.log(`   ✓ Welcome text found: "${welcomeText}"`);

    // Check description
    const description = await page.locator('text=Sign in to access').isVisible();
    console.log(`   ✓ Sign in description visible: ${description}`);

    // Check footer
    const footer = await page.locator('text=Need access').isVisible();
    console.log(`   ✓ Footer text visible: ${footer}`);

    // Check terms
    const terms = await page.locator('text=By signing in').isVisible();
    console.log(`   ✓ Terms text visible: ${terms}`);

    await page.screenshot({ path: './e2e/test-results/04-ui-elements.png', fullPage: true });
    console.log('   📸 Screenshot saved: e2e/test-results/04-ui-elements.png\n');

    // Test 6: API Health Check
    console.log('📍 Test 6: Testing API health endpoint...');
    const response = await page.request.get('http://localhost:5173/api/v1/health');
    const apiData = await response.json();
    console.log(`   ✓ API Status: ${response.status()}`);
    console.log(`   ✓ API Response: ${JSON.stringify(apiData)}\n`);

    console.log('═══════════════════════════════════════════');
    console.log('✅ All manual tests completed successfully!');
    console.log('═══════════════════════════════════════════');
    console.log('\nScreenshots saved in: ./e2e/test-results/');
    console.log('\nKeeping browser open for 10 seconds for visual inspection...');

    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: './e2e/test-results/error-screenshot.png' });
  } finally {
    await browser.close();
    console.log('\n🏁 Browser closed. Test complete.');
  }
}

manualTest();
