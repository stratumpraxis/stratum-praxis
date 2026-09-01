import os
import time
from urllib.parse import urlparse

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = os.environ.get("BASE_URL", "https://stratumpraxis.com").rstrip("/")
RUN_ID = os.environ.get("GITHUB_RUN_ID", "local")
ROUTE_ID = f"identity_continuity_qa_{RUN_ID}"
QA_URL = (
    f"{BASE_URL}/?utm_source=identity_qa"
    f"&utm_medium=qa"
    f"&utm_campaign=posthog_identity_fix"
    f"&utm_content=browser_qa"
    f"&route_id={ROUTE_ID}"
)

options = Options()
options.add_argument("--headless=new")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--window-size=1440,1200")
options.add_argument("--disable-background-networking")
options.add_argument("--disable-default-apps")
options.add_argument("--disable-extensions")

print(f"QA route_id={ROUTE_ID}")
print(f"QA url={QA_URL}")

driver = webdriver.Chrome(options=options)
wait = WebDriverWait(driver, 20)

try:
    driver.get(QA_URL)
    wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
    wait.until(lambda d: d.execute_script("return typeof window.scosCapture === 'function'"))
    time.sleep(1.5)

    anon_id = driver.execute_script("return localStorage.getItem('sp_anonymous_id_v2')")
    if not anon_id:
        raise RuntimeError("anonymous id was not created")

    hero = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".hero .button-primary")))
    hero_href = hero.get_attribute("href")
    if not hero_href:
        raise RuntimeError("hero primary CTA has no href")

    driver.execute_script(
        "arguments[0].dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, cancelable:true}));",
        hero,
    )
    time.sleep(1.0)

    driver.get(hero_href)
    wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
    wait.until(lambda d: d.execute_script("return typeof window.scosCapture === 'function'"))
    time.sleep(1.5)

    anon_id_after = driver.execute_script("return localStorage.getItem('sp_anonymous_id_v2')")
    if anon_id_after != anon_id:
        raise RuntimeError("anonymous id changed across internal navigation")

    checkout = None
    for link in driver.find_elements(By.CSS_SELECTOR, "a[href]"):
        href = link.get_attribute("href") or ""
        if urlparse(href).hostname == "buy.stripe.com":
            checkout = link
            break
    if checkout is None:
        raise RuntimeError("Stripe checkout link not found")

    driver.execute_script(
        "arguments[0].dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, cancelable:true}));",
        checkout,
    )
    time.sleep(2.0)

    print(f"QA anonymous_id={anon_id}")
    print(f"QA landing_path={driver.execute_script('return window.scosAttribution && window.scosAttribution.landing_path')}")
    print("QA browser funnel dispatched: traffic_session_start -> primary_cta_click -> checkout_click")
finally:
    driver.quit()
