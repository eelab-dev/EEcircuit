import { test, expect } from './fixtures';

test('move and wire modes show and hide contextual controls', async ({ page }) => {
  // 1. Open the app
  await page.goto('/');

  await page.locator('#schematic-canvas').waitFor({ state: 'attached' });

  // 3. Test Move Mode Controls
  console.log('Testing Move Mode controls...');
  
  // Open Add Component popover (button with 'Add Component (A)' tooltip)
  await page.getByRole('button', { name: /Add Component/i }).click();
  
  // Click on a Resistor to add it
  // The list displays component types. We find "resistor" text.
  await page.getByText('resistor', { exact: true }).click();
  
  
  // Click in the center of the canvas where the component should be
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  } else {
      throw new Error("Canvas bounding box not found");
  }

  // Verify controls appear
  const rotateBtn = page.getByRole('button', { name: 'Rotate selection' });
  const flipHBtn = page.getByRole('button', { name: 'Flip horizontal' });
  const flipVBtn = page.getByRole('button', { name: 'Flip vertical' });
  const cancelMoveBtn = page.getByRole('button', { name: 'Cancel move' });

  await expect(rotateBtn).toBeVisible();
  await expect(flipHBtn).toBeVisible();
  await expect(flipVBtn).toBeVisible();
  await expect(cancelMoveBtn).toBeVisible();

  // Cancel move
  await cancelMoveBtn.click({ force: true });
  
  // Verify controls hidden
  await expect(rotateBtn).toBeHidden();
  await expect(cancelMoveBtn).toBeHidden();

  // 4. Test Wiring Mode Controls
  console.log('Testing Wiring Mode controls...');
  
  // Click Wire button in action bar (tooltip 'Wire (W)')
  await page.getByRole('button', { name: /Wire/i }).click();
  
  // Verify wiring controls appear
  const undoWireBtn = page.getByRole('button', { name: 'Undo last wire point' });
  const cancelWireBtn = page.getByRole('button', { name: 'Cancel wire' });
  
  await expect(undoWireBtn).toBeVisible();
  await expect(cancelWireBtn).toBeVisible();
  
  // Exit wiring mode using the Cancel Wire button
  await cancelWireBtn.click();
  
  // Verify controls hidden
  await expect(undoWireBtn).toBeHidden();
  await expect(cancelWireBtn).toBeHidden();
});
