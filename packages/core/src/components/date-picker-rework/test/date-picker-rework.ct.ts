/*
 * SPDX-FileCopyrightText: 2023 Siemens AG
 *
 * SPDX-License-Identifier: MIT
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { expect, Page } from '@playwright/test';
import { test } from '@utils/test';

declare global {
  interface Window {
    dayjs_locale_de: any;
  }
}

const DATE_PICKER_REWORK_SELECTOR = 'ix-date-picker-rework';
const getDateObj = async (page: Page) => {
  return await page.$$eval(DATE_PICKER_REWORK_SELECTOR, (elements) => {
    return Promise.all(elements.map((elem) => elem.getCurrentDate()));
  });
};

const addScript = async (page: Page, scriptPath: string) => {
  return page.evaluate((scriptPath) => {
    return new Promise<void>((resolve) => {
      const script = document.createElement('script');
      script.onload = () => resolve();
      script.src = scriptPath;
      document.head.appendChild(script);
    });
  }, scriptPath);
};

test('renders', async ({ mount, page }) => {
  await mount(`<ix-date-picker-rework></ix-date-picker-rework>`);
  const datePicker = page.locator(DATE_PICKER_REWORK_SELECTOR);
  await expect(datePicker).toHaveClass(/hydrated/);
});

test('translation', async ({ mount, page }) => {
  await mount(
    `<ix-date-picker-rework from="2023/01/01"></ix-date-picker-rework>`
  );

  await addScript(page, 'https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js');
  await addScript(page, 'https://cdn.jsdelivr.net/npm/dayjs@1/locale/de.js');

  await page.$eval(
    DATE_PICKER_REWORK_SELECTOR,
    (el: HTMLIxDatePickerReworkElement) => {
      el.dayJsLocale = window.dayjs_locale_de;
    }
  );

  const header = page.getByText('Januar 2023').nth(0);
  await expect(header).toHaveCount(1);
});

test.describe('date picker tests single', () => {
  test.beforeEach(async ({ mount }) => {
    await mount(
      `<ix-date-picker-rework from="2023/09/05" range="false"></ix-date-picker-rework>`
    );
  });

  test('date is selected', async ({ page }) => {
    await page.waitForSelector('ix-date-time-card');

    expect((await getDateObj(page))[0]).toEqual({
      from: '2023/09/05',
      to: undefined,
    });
  });

  test('select different date', async ({ page }) => {
    await page.waitForSelector('ix-date-time-card');
    await page.getByText(/^19$/).click();

    expect((await getDateObj(page))[0]).toEqual({
      from: '2023/09/19',
      to: undefined,
    });
  });

  test('select different date in next month', async ({ page }) => {
    await page.waitForSelector('ix-date-time-card');

    await page.getByRole('button').filter({ hasText: 'chevron-right' }).click();
    await page.getByText(/^31$/).click();

    expect((await getDateObj(page))[0]).toEqual({
      from: '2023/10/31',
      to: undefined,
    });
  });

  test('select different date in previous month', async ({ page }) => {
    await page.waitForSelector('ix-date-time-card');

    await page.getByRole('button').filter({ hasText: 'chevron-left' }).click();
    await page.getByText(/^31$/).nth(1).click();

    expect((await getDateObj(page))[0]).toEqual({
      from: '2023/08/31',
      to: undefined,
    });
  });

  test('select different date from specific month', async ({ page }) => {
    await page.waitForSelector('ix-date-time-card');

    await page
      .locator('ix-button')
      .filter({ hasText: /^September 2023$/ })
      .locator('span')
      .click();
    await page
      .locator('div')
      .filter({ hasText: /^2021$/ })
      .first()
      .click();
    await page
      .locator('div')
      .filter({ hasText: /^January 2021$/ })
      .first()
      .click();
    await page.getByText(/^1$/).nth(1).click();

    expect((await getDateObj(page))[0]).toEqual({
      from: '2021/01/01',
      to: undefined,
    });
  });

  test('select different date fires dateChange event', async ({ page }) => {
    await page.waitForSelector('ix-date-time-card');

    const eventPromise = page.evaluate(() => {
      return new Promise((f) => {
        document.addEventListener('dateChange', (data) => f(data));
      });
    });

    await page.getByText(/^19$/).click();

    expect(await eventPromise).toBeTruthy();
  });
});

test.describe('date picker tests range', () => {
  test.beforeEach(async ({ mount }) => {
    await mount(
      `<ix-date-picker-rework from="2023/09/05" to="2023/09/10"></ix-date-picker-rework>`
    );
  });

  test('range is selected', async ({ page }) => {
    await page.waitForSelector('ix-date-time-card');

    expect((await getDateObj(page))[0]).toEqual({
      from: '2023/09/05',
      to: '2023/09/10',
    });
  });

  test('select different range', async ({ page }) => {
    await page.waitForSelector('ix-date-time-card');

    await page.getByText(/^12$/).click();
    await page.getByText(/^17$/).click();

    expect((await getDateObj(page))[0]).toEqual({
      from: '2023/09/12',
      to: '2023/09/17',
    });
  });

  test('select range spanning over 2 months', async ({ page }) => {
    await page.waitForSelector('ix-date-time-card');

    await page.getByText(/^28$/).click();
    await page.getByRole('button').filter({ hasText: 'chevron-right' }).click();
    await page.getByText(/^5$/).click();

    expect((await getDateObj(page))[0]).toEqual({
      from: '2023/09/28',
      to: '2023/10/05',
    });
  });

  test('select different range fires dateChange and dateRangeChange event', async ({
    page,
  }) => {
    await page.waitForSelector('ix-date-time-card');

    const dateChangeEventPromise = page.evaluate(() => {
      return new Promise((f) => {
        document.addEventListener('dateChange', (data) => f(data));
      });
    });
    const dateRangeChangeEventPromise = page.evaluate(() => {
      return new Promise((f) => {
        document.addEventListener('dateRangeChange', (data) => f(data));
      });
    });

    await page.getByText(/^12$/).click();
    await page.getByText(/^17$/).click();

    expect(await dateChangeEventPromise).toBeTruthy();
    expect(await dateRangeChangeEventPromise).toBeTruthy();
  });

  test('done click fires dateSelect event', async ({ page }) => {
    await page.waitForSelector('ix-date-time-card');

    const dateSelectEventPromise = page.evaluate(() => {
      return new Promise((f) => {
        document.addEventListener('dateSelect', (data) => f(data));
      });
    });

    await page.getByText('Done').click();

    expect(await dateSelectEventPromise).toBeTruthy();
  });
});
