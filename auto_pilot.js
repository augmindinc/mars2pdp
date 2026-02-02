import fs from 'fs';
import searchGmarketIds from './src/gmarketSearcher.js';
import scrapeGmarket from './src/gmarketScraper.js';

/**
 * AUTO-PILOT (Safe Mode): 검색부터 수집까지 사람처럼 동작
 */

const keyword = process.argv[2];
const MAX_PRODUCTS = 10; // 안정성을 위해 한 번에 10개만 추천
const CONCURRENCY = 1;   // 차단 방지를 위해 하나씩 순차적으로 수행 (가장 안전)

if (!keyword) {
    console.log("❌ 키워드 필요 예: node auto_pilot.js 참치");
    process.exit(1);
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function runAutoPilot() {
    console.log(`\n🛡️ [Safe Auto-Pilot] '${keyword}' 수집 시작 (전략: 순차적 저속 수집)`);

    // 1. 아이디 리스트 가져오기
    const ids = await searchGmarketIds(keyword, MAX_PRODUCTS);

    if (ids.length === 0) {
        console.log("❌ 검색 결과가 없거나 차단되었습니다. 잠시 후에 다시 시도해주세요.");
        return;
    }

    console.log(`✅ ${ids.length}개의 상품 발견. 안전하게 수집을 진행합니다...\n`);

    const results = [];
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        console.log(`[${i + 1}/${ids.length}] 수집 중: ${id}`);

        try {
            const data = await scrapeGmarket(id);
            results.push(data);

            // 상품 하나 수집 후 랜덤하게 2~5초 휴식 (가장 중요!)
            if (i < ids.length - 1) {
                const waitTime = Math.floor(Math.random() * 3000) + 2000;
                console.log(`   ☕ 휴식 중... (${waitTime / 1000}초)`);
                await sleep(waitTime);
            }
        } catch (err) {
            console.error(`   ❌ [${id}] 실패: ${err.message}`);
        }
    }

    // 결과 저장
    const fileName = `search_result_${keyword.replace(/\s/g, '_')}.json`;
    fs.writeFileSync(fileName, JSON.stringify(results, null, 2));

    console.log(`\n✨ 완료! 총 ${results.length}개의 데이터가 저장되었습니다.`);
    console.log(`📄 파일명: ${fileName}`);
}

runAutoPilot();
