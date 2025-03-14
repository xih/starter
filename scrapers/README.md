# Coindesk Scraper

A Python scraper that extracts articles from Coindesk.com and saves them to a CSV file.

## Features

- Extracts article metadata and content from Coindesk.com
- Implements random delays between requests to avoid detection
- Prevents duplicate article processing
- Uses multiple selectors to improve data extraction reliability
- Handles network errors and retries gracefully
- Saves results to a timestamped CSV file

## Setup

This project uses pipenv for dependency management. Follow these steps to set up the environment:

1. Install pipenv if you don't have it already:

   ```
   pip install pipenv
   ```

2. Install the dependencies:

   ```
   pipenv install
   ```

3. Install the Playwright browsers:
   ```
   pipenv run playwright install chromium
   ```

## Usage

Run the scraper with:

```
pipenv run python coindesk_scraper.py
```

This will:

1. Scrape the Coindesk homepage for article links
2. Visit each article page and extract:
   - Title
   - URL
   - Author
   - Date
   - Category
   - Summary
   - Content
   - Tags
3. Save all data to a timestamped CSV file (e.g., `coindesk_articles_20240312_123456.csv`)

## Configuration

You can modify the following settings in the `coindesk_scraper.py` file:

- `use_proxy`: Set to `True` to enable proxy usage (default is `False`)
- `proxy_url`, `proxy_username`, `proxy_password`: Configure proxy settings if needed
- `delay_min` and `delay_max`: Control the random delay between requests (default is 2-5 seconds)
- Article limit: By default, the scraper processes the first 20 articles to avoid overloading. You can change this in the `main()` function.

```python
# Example of customizing the scraper
scraper = CoindeskScraper(
    use_proxy=True,  # Enable proxy
    delay_min=3,     # Minimum delay of 3 seconds
    delay_max=8      # Maximum delay of 8 seconds
)
```

## Dependencies

- Playwright: For browser automation
- BeautifulSoup4: For HTML parsing

## How It Works

The scraper operates in two main steps:

1. **Homepage Scraping**: Extracts article links from the Coindesk homepage

   - Uses Playwright to load the page and wait for content
   - Filters for article links containing date patterns
   - Removes duplicate links while preserving order

2. **Article Scraping**: Visits each article page and extracts data
   - Implements random delays between requests
   - Uses multiple CSS selectors to find content elements
   - Tracks processed URLs to avoid duplicates
   - Handles network errors and timeouts

## Anti-Detection Measures

The scraper includes several features to avoid being blocked:

- Random delays between requests (configurable)
- Custom user agent
- Option to use a proxy
- Waits for network idle state before extracting content
- Tracks and skips already processed URLs

## Troubleshooting

### 403 Errors (Access Denied)

You may encounter 403 errors when scraping some articles. This is due to Coindesk's anti-scraping measures. To mitigate this:

1. **Use a proxy**: Enable the proxy option by setting `use_proxy=True` in the `main()` function and configure valid proxy settings.
2. **Increase delays**: Modify the `delay_min` and `delay_max` parameters to add longer delays between requests.
3. **Rotate user agents**: The scraper currently uses a fixed user agent. You could extend it to implement a user agent rotation mechanism.
4. **Implement session cookies**: Store and reuse session cookies.

### Content Extraction Issues

If the scraper fails to extract content from articles:

1. Check the HTML structure of the problematic article
2. Add additional CSS selectors to the content extraction logic
3. Consider implementing a fallback extraction method using XPath

## Future Improvements

- Implement user agent rotation
- Add support for pagination to scrape more than the homepage
- Add command-line arguments for configuration
- Implement a retry mechanism for failed requests
- Add support for exporting to other formats (JSON, SQLite)
