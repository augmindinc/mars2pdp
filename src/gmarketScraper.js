import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

// 랜덤 대기 함수
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function scrapeGmarket(productId, options = {}) {
    const browser = await puppeteer.launch({
        headless: true, // 차단이 계속되면 false로 바꿔서 확인 가능
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--window-size=1920,1080",
        ],
        ...options.puppeteerOptions
    });

    try {
        const page = await browser.newPage();

        // 더 실제 사용자와 유사한 User-Agent
        await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36");

        // 봇 감지 우회 설정
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        // 1. 페이지 접속 전 랜덤 대기 (0.5~2초)
        await sleep(Math.floor(Math.random() * 1500) + 500);

        const url = `https://item.gmarket.co.kr/Item?goodscode=${productId}`;
        console.log(`[Gmarket] Human-like navigation: ${url}`);

        await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

        // 2. 사람이 읽는 것처럼 부드럽게 스크롤
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let distance = 100;
                let timer = setInterval(() => {
                    let scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= 500) { // 상단 부분만 살짝 스크롤
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });

        // 3. 추가 랜덤 대기 (1~2초)
        await sleep(Math.floor(Math.random() * 1000) + 1000);

        const data = await page.evaluate(() => {
            const getDetail = (selector) => document.querySelector(selector)?.innerText?.trim() || "";

            // 리뷰 수 추출 로직 강화
            let reviewCount = "0";
            const allElements = Array.from(document.querySelectorAll('span, a, em, strong, p'));
            const reviewElement = allElements.find(el => {
                const text = el.innerText;
                return (text.includes('리뷰') || text.includes('구매후기')) && /\d+/.test(text);
            });

            if (reviewElement) {
                const match = reviewElement.innerText.match(/\d+(,\d+)*/);
                if (match) reviewCount = match[0].replace(/,/g, '');
            }

            // 이미지 수집 (이미지 로딩 완료 확인)
            const images = [];
            const imgSources = [
                document.querySelector('#objImg')?.src,
                document.querySelector('.box__viewer-container img')?.src,
                ...Array.from(document.querySelectorAll('.box__thumb-container img')).map(i => i.src)
            ].filter(s => s && !s.includes('clear.gif') && s.startsWith('http'));

            const highResImages = imgSources.map(src => {
                return src.replace('/thumbnail/', '/main/').replace('/60/', '/600/');
            });

            const finalImages = [...new Set(highResImages)].slice(0, 10);

            const salePriceStr = getDetail('.price_real');
            const originalPriceStr = getDetail('.text__price-original') || getDetail('.price_ori');

            return {
                title: getDetail('.itemtit') || getDetail('h1'),
                productId: new URLSearchParams(window.location.search).get('goodscode'),
                salePrice: {
                    min: { formatedAmount: salePriceStr, value: parseInt(salePriceStr.replace(/[^0-9]/g, '')) || 0 }
                },
                originalPrice: {
                    min: { formatedAmount: originalPriceStr, value: parseInt(originalPriceStr.replace(/[^0-9]/g, '')) || 0 }
                },
                images: finalImages,
                storeInfo: {
                    name: getDetail('.link__seller') || getDetail('.seller_name') || "판매자 정보 없음"
                },
                ratings: {
                    averageStar: getDetail('.text__score')?.replace(/[^0-9.]/g, '') || "0.0",
                    totalStartCount: reviewCount
                },
                platform: 'gmarket'
            };
        });

        await browser.close();
        return data;
    } catch (error) {
        if (browser) await browser.close();
        throw error;
    }
}

export default scrapeGmarket;
