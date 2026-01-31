from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # Test Small Mobile View (e.g., iPhone SE, older Androids)
        print("Testing Small Mobile View (360x640)...")
        page = browser.new_page(viewport={'width': 360, 'height': 640})
        page.goto("http://localhost:3000/mp4play.html")
        page.wait_for_selector(".video-container")

        # Check if PiP button is hidden
        pip_btn = page.locator("#pipBtn")
        is_pip_hidden = pip_btn.is_hidden()
        print(f"PiP Button Hidden: {is_pip_hidden}")

        # Check button size (approximate)
        play_btn = page.locator("#playPauseBtn")
        box = play_btn.bounding_box()
        if box:
            print(f"Play Button Size: {box['width']}x{box['height']}")

        page.screenshot(path="verification/mobile_small_portrait.png", full_page=True)
        print("Screenshot saved to verification/mobile_small_portrait.png")

        browser.close()

if __name__ == "__main__":
    run()
