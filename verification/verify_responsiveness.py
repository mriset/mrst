from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # Test Mobile View (Portrait)
        print("Testing Mobile View (Portrait)...")
        page = browser.new_page(viewport={'width': 375, 'height': 667})
        page.goto("http://localhost:3000/mp4play.html")
        page.wait_for_selector(".video-container")

        # Check if volume slider container is hidden
        slider_container = page.locator("#volumeSliderContainer")
        # In CSS we set display: none !important for max-width 768px
        # Playwright .is_hidden() checks if element is not visible
        is_hidden = slider_container.is_hidden()
        print(f"Volume Slider Hidden on Mobile: {is_hidden}")

        page.screenshot(path="verification/mobile_portrait.png", full_page=True)
        print("Screenshot saved to verification/mobile_portrait.png")

        # Test Mobile View (Landscape)
        print("Testing Mobile View (Landscape)...")
        page_landscape = browser.new_page(viewport={'width': 667, 'height': 375})
        page_landscape.goto("http://localhost:3000/mp4play.html")
        page_landscape.wait_for_selector(".video-container")
        page_landscape.screenshot(path="verification/mobile_landscape.png", full_page=True)
        print("Screenshot saved to verification/mobile_landscape.png")

        # Test Desktop View
        print("Testing Desktop View...")
        page_desktop = browser.new_page(viewport={'width': 1280, 'height': 800})
        page_desktop.goto("http://localhost:3000/mp4play.html")
        page_desktop.wait_for_selector(".video-container")
        page_desktop.screenshot(path="verification/desktop.png", full_page=True)
        print("Screenshot saved to verification/desktop.png")

        browser.close()

if __name__ == "__main__":
    run()
