import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

/**
 * Searches Gmarket for a keyword and returns a list of product IDs
 * @param {string} keyword - Search term
 * @param {number} maxResults - Max IDs to return
 * @returns {Array} List of product IDs
 */
async function searchGmarketIds(keyword, maxResults = 50) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"]
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

        const searchUrl = `https://www.gmarket.co.kr/n/search?keyword=${encodeURIComponent(keyword)}`;
        console.log(`[Search] Searching Gmarket for: ${keyword}`);

        await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 60000 });

        // Extract IDs using the NEXT_DATA structure which is more reliable
        const ids = await page.evaluate(() => {
            const results = new Set();

            // Method 1: Extraction from window.__NEXT_DATA__
            if (window.__NEXT_DATA__) {
                const findIds = (obj) => {
                    if (!obj || typeof obj !== 'object') return;
                    if (Array.isArray(obj)) {
                        obj.forEach(findIds);
                        return;
                    }
                    for (const key in obj) {
                        if (['itemNo', 'goodscode', 'goodsCode'].includes(key)) {
                            if (obj[key]) results.add(obj[key].toString());
                        } else {
                            findIds(obj[key]);
                        }
                    }
                };
                findIds(window.__NEXT_DATA__);
            }

            // Method 2: DOM fallback
            Array.from(document.querySelectorAll('a.link__item')).forEach(a => {
                const match = a.href.match(/goodscode=(\d+)/);
                if (match) results.add(match[1]);
            });

            return Array.from(results);
        });

        await browser.close();
        return ids.slice(0, maxResults);
    } catch (error) {
        if (browser) await browser.close();
        console.error(`[Search Error] ${error.message}`);
        return [];
    }
}

export default searchGmarketIds;
