import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Food & Face Detection > Food Training (/FOFCD/FoodTraining.aspx)
test.describe('POS - Food & Face Detection - Food Training', () => {
  test.fixme('Food Training - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
