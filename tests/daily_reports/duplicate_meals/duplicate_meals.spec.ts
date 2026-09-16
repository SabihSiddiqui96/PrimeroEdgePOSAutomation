import { test } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';

// POS > Daily Reports > Duplicate Meals (/POS/DuplicateMealsReport.aspx)
//
// BLOCKED on QA: the page answers with an error screen rather than the real UI.
// Capture the screen and write this spec once it is reachable.
const PATH = '/POS/DuplicateMealsReport.aspx';

test.describe('POS - Daily Reports - Duplicate Meals', () => {
  test.fixme('Duplicate Meals screen', async ({ page }) => {
    await openPosPage(page, PATH);
  });
});
