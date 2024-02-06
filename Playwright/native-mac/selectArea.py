import time
import pyautogui

pyautogui.moveTo(200, 90)
pyautogui.mouseDown(button='left')
pyautogui.dragTo(300, 400, 1, button='left')
pyautogui.mouseUp(button='left')