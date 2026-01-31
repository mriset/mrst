import { test, expect } from '@playwright/test';

test('mp4play loads correctly and has controls', async ({ page }) => {
  // Capture console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:3000/mp4play.html');

  // Check title
  await expect(page).toHaveTitle(/Pro-Player HTML/);

  // Check video element
  const video = page.locator('#videoElement');
  await expect(video).toBeVisible();

  // Check controls
  const controls = page.locator('#videoControls');
  // Controls might be hidden initially or visible, but they should be attached
  await expect(controls).toBeAttached();

  // Check big play button
  const bigPlayBtn = page.locator('#bigPlayBtn');
  await expect(bigPlayBtn).toBeVisible();

  // Ensure no critical console errors (ignoring 404s for video src if empty)
  // We filter out network errors for video files since we might not have a video loaded
  const criticalErrors = errors.filter(e => !e.includes('Failed to load resource'));
  expect(criticalErrors.length).toBe(0);
});
