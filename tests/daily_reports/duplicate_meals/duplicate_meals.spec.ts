import { test } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';

// POS > Daily Reports > Duplicate Meals (/POS/DuplicateMealsReport.aspx) BLOCKED on QA
const PATH = '/POS/DuplicateMealsReport.aspx';

test.describe('POS - Daily Reports - Duplicate Meals', () => {
  test.fixme('Duplicate Meals screen', async ({ page }) => {
    await openPosPage(page, PATH);
  });
});
