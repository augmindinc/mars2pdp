import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as cheerio from "cheerio";

puppeteer.use(StealthPlugin());

const DomeggookScraper = async (id, { timeout = 60000 } = {}) => {
    if (!id) {
        throw new Error("Please provide a valid product id");
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        const url = `https://domeggook.com/${id}`;
        await page.goto(url, { waitUntil: "networkidle2", timeout });

        // Wait for the main container
        await page.waitForSelector(".lInfoRow", { timeout: 10000 });

        // Click "Product Info" tab to be safe, although sometimes it's already there
        // The subagent found it at roughly (251, 22) relative to something, but let's use a selector
        // Usually tabs in Domeggook have specific text
        try {
            await page.evaluate(() => {
                const tabs = Array.from(document.querySelectorAll('.lInfoMenu li, .lTabMenu li, a'));
                const infoTab = tabs.find(t => t.innerText.includes('상품상세') || t.innerText.includes('상품정보'));
                if (infoTab) infoTab.click();
            });
            await new Promise(r => setTimeout(r, 2000)); // Wait for content to load
        } catch (e) {
            console.log("Tab click failed or not needed", e.message);
        }

        const content = await page.content();
        const $ = cheerio.load(content);

        // 1. Title
        const title = $("h1.lInfoRow").text().trim() || $(".lItemTitle").text().trim();

        // 2. Prices
        const prices = [];
        $(".lInfoBody table").each((i, table) => {
            const text = $(table).text();
            if (text.includes("단가(원)")) {
                const rows = $(table).find("tr");
                const headers = [];
                const values = [];

                rows.each((j, tr) => {
                    const cells = $(tr).find("td, th");
                    if (j === 0) {
                        cells.each((k, cell) => headers.push($(cell).text().trim()));
                    } else {
                        cells.each((k, cell) => values.push($(cell).text().trim()));
                    }
                });

                if (headers.length > 0 && values.length > 0) {
                    for (let k = 0; k < headers.length; k++) {
                        if (headers[k] && values[k]) {
                            prices.push({ qty: headers[k], price: values[k] });
                        }
                    }
                }
            }
        });

        // 3. Thumbnails
        const images = [];
        $(".thumbLightbox img").each((i, img) => {
            const src = $(img).attr("src");
            if (src) {
                images.push(src.startsWith("//") ? `https:${src}` : src);
            }
        });

        // 4. Description HTML and Images
        const descriptionHtml = $("#lInfoViewItemContents").html() || "";
        const detailImages = [];
        $("#lInfoViewItemContents img").each((i, img) => {
            const src = $(img).attr("src") || $(img).attr("data-src");
            if (src) {
                detailImages.push(src.startsWith("//") ? `https:${src}` : src);
            }
        });

        // 5. Specs
        const specs = [];
        $(".lInfoBody table").each((i, table) => {
            const text = $(table).text();
            if (text.includes("재고수량") || text.includes("원산지")) {
                $(table).find("tr").each((j, tr) => {
                    const th = $(tr).find("th").text().trim();
                    const td = $(tr).find("td").text().trim();
                    if (th && td && !th.includes("단가")) {
                        specs.push({ attrName: th, attrValue: td.replace(/\s+/g, ' ') });
                    }
                });
            }
        });

        // 6. Vendor
        const vendor = $(".lVendorName").text().trim() || $(".lInfoVend").text().trim();

        // 7. Supplier Info
        const supplierInfo = [];
        $("#lSellerPopInfoDetail .lTbl tr").each((i, tr) => {
            const th = $(tr).find("th").text().trim();
            const td = $(tr).find("td").text().trim();
            if (th && td) {
                supplierInfo.push({ label: th, value: td.replace(/\s+/g, ' ') });
            }
        });

        // 8. Return/Exchange Info
        const returnInfo = [];
        $("#lReturnInfo tr").each((i, tr) => {
            const th = $(tr).find("th").text().trim();
            const td = $(tr).find("td").text().trim();
            if (th && td) {
                returnInfo.push({ label: th, value: td.replace(/\s+/g, ' ') });
            }
        });

        // 9. Detailed Options from Popup
        const options = [];
        try {
            const popupUrl = `https://domeggook.com/main/popup/item/popup_itemOptionView.php?no=${id}&market=dome`;
            await page.goto(popupUrl, { waitUntil: "networkidle2", timeout });
            const popupContent = await page.content();
            const $popup = cheerio.load(popupContent);

            $popup("#itemOptAllViewTable tr").each((i, tr) => {
                if (i === 0) return; // Skip header
                const tds = $popup(tr).find("td");
                if (tds.length >= 4) {
                    const rawPriceText = $popup(tds[2]).text().trim().replace(/\s+/g, ' ');

                    // Calculate Real Price
                    // Example: "156,800원 (-31,000원)" or "156,800원"
                    let basePrice = 0;
                    let additionalPrice = 0;

                    // Extract base price (everything before the first '원')
                    const baseMatch = rawPriceText.match(/^([0-9,]+)/);
                    if (baseMatch) {
                        basePrice = parseInt(baseMatch[1].replace(/,/g, ''));
                    }

                    // Extract additional price within parentheses (+ or -)
                    const addMatch = rawPriceText.match(/\(([+-])([0-9,]+)원\)/);
                    if (addMatch) {
                        const sign = addMatch[1] === '+' ? 1 : -1;
                        additionalPrice = sign * parseInt(addMatch[2].replace(/,/g, ''));
                    }

                    const realPriceNum = basePrice + additionalPrice;
                    const realPrice = realPriceNum.toLocaleString() + "원";

                    options.push({
                        code: $popup(tds[0]).text().trim(),
                        name: $popup(tds[1]).text().trim(),
                        price: rawPriceText,
                        realPrice: realPrice,
                        stock: $popup(tds[3]).text().trim()
                    });
                }
            });
        } catch (e) {
            console.log("Failed to fetch detailed options", e.message);
        }

        // 10. Fallback for single-option products
        if (options.length === 0) {
            let mainPrice = prices.length > 0 ? prices[0].price : "N/A";

            // Try direct selection if table extraction failed
            if (mainPrice === "N/A") {
                const priceText = $(".lItemPrice, .lPrice").text().trim();
                const priceMatch = priceText.match(/([0-9,]+)\s*원/);
                if (priceMatch) mainPrice = priceMatch[1] + "원";
            }

            let mainStock = specs.find(s => s.attrName === "재고수량")?.attrValue || "N/A";
            if (mainStock === "N/A") {
                // Try searching in the entire info body for stock pattern
                const stockMatch = $(".lInfoBody").text().match(/재고수량\s*([0-9,]+개)/);
                if (stockMatch) mainStock = stockMatch[1];
            }

            options.push({
                code: "00",
                name: "(단일옵션) " + (title || id),
                price: mainPrice,
                realPrice: mainPrice,
                stock: mainStock
            });
        }

        await browser.close();

        return {
            title,
            productId: id,
            prices,
            images,
            description: descriptionHtml,
            detailImages,
            specs,
            storeInfo: {
                name: vendor
            },
            platform: "domeggook",
            supplierInfo,
            returnInfo,
            options
        };

    } catch (error) {
        if (browser) await browser.close();
        throw error;
    }
};

export default DomeggookScraper;
