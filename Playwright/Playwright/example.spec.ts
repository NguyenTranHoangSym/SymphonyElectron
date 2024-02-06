import { expect, test } from '@playwright/test';
import {
  ElectronApplication,
  Page,
  _electron as electron,
} from '@playwright/test';
import { exec } from 'child_process';

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
        executablePath:
          '../node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
        args: [
          '../',
          '--url=https://sym-cicd131.qa.symphony.com',
          'gulp build && npm run browserify && cross-env ELECTRON_DEV=true electron .',
        ],
        env: {
          ELECTRON_DEBUGGING: 'true',
          ELECTRON_DEV: 'true',
        },
        timeout: 100000,
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

  test.beforeEach(async () => {
    playwrightWindows = await describeWithPlaywright();
  });

  test.afterEach(async () => {
    playwrightWindows.electronApp.close();
  });

  // Mac only, build for Mac exclusively
  test('it should login and verify screenshot', async () => {
    // Title App
    const main = await playwrightWindows.electronApp.firstWindow();
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
    await main.waitForSelector('[data-testid="SCREEN_SNIPPET_BUTTON"]');
    await main.locator('[data-testid="SCREEN_SNIPPET_BUTTON"]').click();
    await exec(`python3 native-mac/selectArea.py ${process.pid}`);
    await main.waitForTimeout(3000);
    const currentWindows = (await playwrightWindows.electronApp.windows()).at(
      1,
    );
    await currentWindows?.waitForSelector("[data-testid='done-button']");
    await currentWindows?.click("[data-testid='done-button']");
    await main.waitForTimeout(3000);
    const attachments = await main.getByTestId(`ATTACHMENT_FILE_THUMBNAIL`);
    const attachmentsSource = await Promise.all(
      (
        await attachments.all()
      ).map(async (attachment) => {
        return await attachment.getAttribute('alt');
      }),
    );
    await main.waitForSelector("[title='Send message']");
    await main.click("[title='Send message']");
    await main.waitForTimeout(3000);
    await main.waitForSelector('[data-testid="ATTACHMENT_WRAPPER"] figure img');
    const messageAttachments = await main
      .getByTestId('ATTACHMENT_WRAPPER')
      .getByRole('figure');
    await main.waitForTimeout(3000);
    const messageAttachmentsSource = await Promise.all(
      (
        await messageAttachments.all()
      ).map(async (messageAttachment) => {
        const html = await messageAttachment.innerHTML();

        return await messageAttachment.getAttribute('data-testid');
      }),
    );

    await test
      .expect(
        messageAttachmentsSource.some(
          (messageAttachment) =>
            !!attachmentsSource.find((attachmentSource) =>
              messageAttachment?.includes(attachmentSource ?? ''),
            ),
        ),
      )
      .toBe(true);
  });

  test('it should login and verify about app', async () => {
    // Title App
    const main = await playwrightWindows.electronApp.firstWindow();
    exec(
      `python3 native-mac/aboutApp/aboutApp.py ${process.pid}`,
      (res, res2, res3) => {
        console.log(res);
      },
    );
    await main.waitForTimeout(5000);
    const currentWindows = await playwrightWindows.electronApp.windows();
    const currentBrowserWindows = await currentWindows.at(1);
    const aboutAppTitle = await currentBrowserWindows
      ?.locator('.AboutApp-main-title')
      .first();
    const title = await aboutAppTitle?.textContent();

    await test.expect(title).toBe('Desktop Application');
  });
});
