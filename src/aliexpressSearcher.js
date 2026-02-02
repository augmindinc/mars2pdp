import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

/**
 * Searches AliExpress for a keyword and returns a list of product IDs
 * @param {string} keyword - Search term
 * @param {number} maxResults - Max IDs to return
 * @returns {Array} List of product IDs
 */
async function searchAliexpressIds(keyword, maxResults = 30) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled"
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36");

        // AliExpress search URL
        const searchUrl = `https://www.aliexpress.com/w/wholesale-${encodeURIComponent(keyword)}.html`;
        console.log(`[ALIX Search] Searching for: ${keyword}`);

        await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 60000 });

        // Scroll down to trigger lazy loading of search results
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let distance = 400;
                let timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= 2000) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });

        // Extract product IDs from search result links
        const ids = await page.evaluate(() => {
            const results = new Set();
            // Look for links that contain item IDs (pattern: /item/12345678.html)
            const links = Array.from(document.querySelectorAll('a[href*="/item/"]'));
            links.forEach(a => {
                const match = a.href.match(/\/item\/(\d+)\.html/);
                if (match && match[1]) {
                    results.add(match[1]);
                }
            });
            return Array.from(results);
        });

        await browser.close();
        return ids.slice(0, maxResults);
    } catch (error) {
        if (browser) await browser.close();
        console.error(`[ALIX Search Error] ${error.message}`);
        return [];
    }
}

export default searchAliexpressIds;
