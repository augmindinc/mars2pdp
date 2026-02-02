import fs from 'fs';
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import scrape from './index.js';
import scrapeGmarket from './src/gmarketScraper.js';

puppeteer.use(StealthPlugin());

const CONFIG = {
    CONCURRENCY: 5, // 동시에 띄울 브라우저 수 (컴퓨터 사양에 따라 조절 가능)
    PLATFORM: 'gmarket', // 'aliexpress' 또는 'gmarket'
    INPUT_FILE: 'input_ids.txt',
    OUTPUT_FILE: 'results.json'
};

async function runBulkScrape() {
    // 1. ID 리스트 읽기
    if (!fs.existsSync(CONFIG.INPUT_FILE)) {
        console.error(`❌ ${CONFIG.INPUT_FILE} 파일이 없습니다! 수집할 ID를 적어주세요.`);
        return;
    }

    const ids = fs.readFileSync(CONFIG.INPUT_FILE, 'utf-8')
        .split('\n')
        .map(id => id.trim())
        .filter(id => id.length > 0);

    console.log(`🚀 총 ${ids.length}개의 상품 수집을 시작합니다. (병렬 처리: ${CONFIG.CONCURRENCY})`);

    const results = [];
    const queue = [...ids];
    let activeWorkers = 0;
    const total = ids.length;
    let completed = 0;

    return new Promise((resolve) => {
        const worker = async () => {
            if (queue.length === 0) {
                if (activeWorkers === 0) resolve(results);
                return;
            }

            const id = queue.shift();
            activeWorkers++;

            try {
                console.log(`[${++completed}/${total}] 수집 중: ${id}`);

                let data;
                if (CONFIG.PLATFORM === 'gmarket') {
                    data = await scrapeGmarket(id, {
                        puppeteerOptions: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] }
                    });
                } else {
                    data = await scrape(id, {
                        puppeteerOptions: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] }
                    });
                }

                results.push(data);
            } catch (err) {
                console.error(`❌ 수집 실패 [ID: ${id}]: ${err.message}`);
                results.push({ productId: id, error: err.message });
            } finally {
                activeWorkers--;
                worker(); // 다음 작업 수행
            }
        };

        // 설정된 CONCURRENCY만큼 워커 시작
        for (let i = 0; i < Math.min(CONFIG.CONCURRENCY, ids.length); i++) {
            worker();
        }
    });
}

// 실행 및 결과 저장
runBulkScrape().then(results => {
    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log(`\n✅ 수집 완료!`);
    console.log(`📊 총 수집 개수: ${results.length}`);
    console.log(`📄 결과 저장 위치: ${CONFIG.OUTPUT_FILE}`);
    process.exit(0);
});
