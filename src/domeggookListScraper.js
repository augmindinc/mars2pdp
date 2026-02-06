import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import iconv from 'iconv-lite';

puppeteer.use(StealthPlugin());

/**
 * Scraper to get a list of products from Domeggook
 * @param {Object} options { category, keyword, page }
 */
async function domeggookListScraper({ category, keyword, page = 1 }) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        let url;
        if (keyword) {
            // Domeggook uses EUC-KR for search keywords
            const encodedKeyword = iconv.encode(keyword, 'euc-kr');
            const hexKeyword = Array.from(encodedKeyword)
                .map(b => '%' + b.toString(16).toUpperCase())
                .join('');

            url = `https://domeggook.com/main/item/itemList.php?sfc=ttl&sf=ttl&sw=${hexKeyword}&page=${page}`;
        } else if (category) {
            url = `https://domeggook.com/main/item/itemList.php?ca=${category}&page=${page}`;
        } else {
            url = `https://domeggook.com/main/item/itemList.php?page=${page}`;
        }

        const browserPage = await browser.newPage();
        await browserPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

        console.log(`Navigating to: ${url}`);
        await browserPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for the list container to appear
        try {
            await browserPage.waitForSelector('ol.lItemList', { timeout: 10000 });
        } catch (e) {
            console.log('Timeout waiting for ol.lItemList, trying fallback');
        }

        const products = await browserPage.evaluate(() => {
            const items = [];

            // Domeggook products are in ol.lItemList li
            const rows = document.querySelectorAll('ol.lItemList li[id^="li"]');

            rows.forEach(row => {
                const thumbImg = row.querySelector('a.thumb img');
                const titleLink = row.querySelector('a.title');
                const priceEl = row.querySelector('.amt b');

                if (thumbImg && titleLink) {
                    const productId = row.id.replace('li', '');

                    if (productId) {
                        items.push({
                            productId,
                            title: titleLink.innerText.trim(),
                            thumbnail: thumbImg.src,
                            price: priceEl ? priceEl.innerText.trim() : 'N/A',
                            url: 'https://domeggook.com/' + productId
                        });
                    }
                }
            });

            return items;
        });

        // Dedup by productId
        const uniqueProducts = Array.from(new Map(products.map(item => [item.productId, item])).values());

        return {
            success: true,
            page,
            products: uniqueProducts,
            url
        };

    } catch (error) {
        console.error('List Shraping Error:', error);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

export default domeggookListScraper;

// Test if run directly
if (process.argv[1] && process.argv[1].includes('domeggookListScraper.js')) {
    const keyword = process.argv[2] || '텀블러';
    domeggookListScraper({ keyword }).then(res => console.log(JSON.stringify(res, null, 2)));
}
