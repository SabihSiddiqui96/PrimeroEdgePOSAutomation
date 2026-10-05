import { test } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';

// POS > Food & Face Detection > Food Training (/FOFCD/FoodTraining.aspx)
// Stops at "Please wait while we redirect you" - the redirect never completes on QA.
const PATH = '/FOFCD/FoodTraining.aspx';

test.describe('POS - Food & Face Detection - Food Training', () => {
  test.fixme('Food Training screen', async ({ page }) => {
    await openPosPage(page, PATH);
  });
});
