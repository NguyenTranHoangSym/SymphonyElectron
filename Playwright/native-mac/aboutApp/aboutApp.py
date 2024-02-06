import pyautogui
import os
import time

# os.getcwd()
# pyautogui.click('Sym-about')
pwd_path = os.path.dirname(os.path.abspath(__file__))
# appImage = os.path.join(pwd_path, 'app.jpeg')
# print(appImage)
# pyautogui.locateOnScreen(appImage)
print(pwd_path)
os.chdir (pwd_path)
# button7location = pyautogui.locateOnScreen('about.png')


# time.sleep(3)
pyautogui.useImageNotFoundException()

try:
    coordinate = pyautogui.locateOnScreen('electron.png')
    pyautogui.leftClick(coordinate.left, coordinate.top)
    time.sleep(1)

    pyautogui.press('down',1,1)
    pyautogui.press('enter',1,1)
    print('image found')
except pyautogui.ImageNotFoundException:
    print('ImageNotFoundException: image not found')