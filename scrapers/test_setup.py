from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup


def test_setup():
    print("Testing Playwright and BeautifulSoup setup...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.example.com")

        # Test BeautifulSoup
        soup = BeautifulSoup(page.content(), "html.parser")
        title = soup.title.string

        print(f"Successfully loaded page with title: {title}")
        browser.close()

    print("Setup test completed successfully!")


if __name__ == "__main__":
    test_setup()
