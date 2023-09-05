import { expect, test } from '@playwright/test';
import {
  ElectronApplication,
  Page,
  _electron as electron,
} from '@playwright/test';

interface IPlaywrightTestWindows {
  electronApp: ElectronApplication;
  subscribeToWindowsChanged: (callback: () => void) => number;
  unsubscribeToWindowsChanged: (id: number) => void;
  getTitlePage: () => Page;
  getMainPage: () => Page;
}

export const describeWithPlaywright =
  async (): Promise<IPlaywrightTestWindows> => {
    let subscribers: Map<number, () => void> = new Map();
    let subscriberId = 0;
    let pageRef: { windows: Page[] } = {
      windows: [],
    };

    const subscribeToWindowsChanged = (callback: () => void) => {
      const subId = subscriberId++;
      subscribers.set(subId, callback);
      return subId;
    };

    const unsubscribeToWindowsChanged = () => {
      subscribers.delete(subscriberId);
    };

    const getTitlePage = () => {
      return pageRef.windows[0];
    };

    const getMainPage = () => {
      return pageRef.windows[1];
    };

    const loadElectron = async () => {
      const electronApplication = await electron.launch({
        executablePath: '../node_modules/electron/dist/Electron.exe',
        args: [
          '../',
          '--url=https://sym-cicd131.qa.symphony.com',
          'gulp build && npm run browserify && cross-env ELECTRON_DEV=true electron .',
        ],
        env: {
          ELECTRON_DEBUGGING: 'true',
          ELECTRON_DEV: 'true',
        },
        timeout: 5000,
      });

      await electronApplication.waitForEvent('window', {
        predicate: async (page) => {
          pageRef.windows.push(page);
          if (page.url().includes('https://sym-cicd131.qa.symphony.com/')) {
            return true;
          }

          return false;
        },
      });

      electronApplication.on('window', (page) => {
        console.log(page);
        page.on('console', (msg) => {
          console.log(msg.text());
        });
      });

      return electronApplication;
    };

    return loadElectron().then((electronApp) => {
      return {
        electronApp,
        subscribeToWindowsChanged,
        unsubscribeToWindowsChanged,
        getTitlePage,
        getMainPage,
      };
    });
  };

test.describe('Test suit', async () => {
  let playwrightWindows: IPlaywrightTestWindows;

  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    playwrightWindows = await describeWithPlaywright();
  });

  test('it should login and verify page all right', async () => {
    // Title App
    const main = playwrightWindows.getMainPage();

    await main.waitForSelector('h1');
    await main.screenshot({ path: 'sample.png' });
    const inputEmail = main.locator('#signin-email');
    const inputPassword = main.locator('#signin-password');
    const buttonSignIn = main.locator('[name="signin-submit"]');
    await inputEmail.fill('thaocicd131_2');
    await inputPassword.fill('Symphony!123456');
    await buttonSignIn.click();
    await main.screenshot({ path: 'sample-2.png' });
    await main.waitForSelector('#splashScreen');
    await main.locator('#splashScreen').waitFor({ state: 'hidden' });
    await main.screenshot({ path: 'splash.png' });
    const isEula = await main.isVisible('[data-testid="EULA_MODAL"]');
    if (isEula) {
      await main.waitForSelector('[data-testid="EULA_MODAL_AGREE_BUTTON"]');
      await main.locator('[data-testid="EULA_MODAL_AGREE_BUTTON"]').click();
      await main
        .locator('[data-testid="EULA_MODAL"]')
        .waitFor({ state: 'hidden' });
    }
    await main.screenshot({ path: 'sample-eula.png' });
    await main.waitForSelector('#APP_WRAPPER');
    await main.screenshot({ path: 'main-app.png' });
    await test
      .expect(await main.locator('#APP_WRAPPER').isVisible())
      .toBe(true);
  });

  test('it should show about app on click "about"', async () => {
    // Electron App
    const electron = playwrightWindows.electronApp;

    // Title App
    const titleBar = playwrightWindows.getTitlePage();

    // Main App
    const mainApp = playwrightWindows.getMainPage();

    await electron.evaluate(async (app) => {
      await app.app.applicationMenu?.items[0]?.click();
    });

    await mainApp.waitForTimeout(3000);
    const aboutApp = electron.windows()[2];
    await test.expect(await aboutApp.title()).toBe('About Symphony');
  });
});
