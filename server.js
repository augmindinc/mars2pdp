import express from 'express';
import cors from 'cors';
import fs from 'fs';
import cron from 'node-cron';
import scrape from './index.js';
import searchAliexpressIds from './src/aliexpressSearcher.js';

const app = express();
const PORT = 3001;
const DB_FILE = './market_db.json';

app.use(cors());
app.use(express.json());

// DB 초기화 함수 (필드 누락 방지 포함)
const initDB = () => {
    let db = {
        keywords: ["wireless mouse", "mechanical keyboard"],
        trackedProducts: [],
        history: {},
        insights: {}
    };

    if (fs.existsSync(DB_FILE)) {
        try {
            const existing = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
            // 기존 데이터와 병합하여 누락된 필드만 채움
            db = { ...db, ...existing };
        } catch (e) {
            console.error('DB parse error, resetting...');
        }
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
};
initDB();

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

/**
 * [API] 대시보드 데이터 (키워드별 인사이트 포함)
 */
app.get('/api/dashboard', (req, res) => {
    const db = readDB();
    res.json(db);
});

/**
 * [API] 키워드 추가/삭제
 */
app.post('/api/keywords', (req, res) => {
    const { keyword, action } = req.body;
    const db = readDB();

    if (action === 'add') {
        if (!db.keywords.includes(keyword)) db.keywords.push(keyword);
    } else if (action === 'remove') {
        db.keywords = db.keywords.filter(k => k !== keyword);
    }

    writeDB(db);
    res.json(db.keywords);
});

/**
 * [API] 즉시 수집 실행 (수동 트리거)
 */
app.post('/api/discovery', async (req, res) => {
    res.json({ message: '수집을 시작했습니다. 잠시 후 대시보드를 확인하세요.' });
    await runDiscoveryAndAnalysis();
});

/**
 * [Function] 오토파일럿 수집 및 분석 엔진
 */
const runDiscoveryAndAnalysis = async () => {
    console.log('🌟 [Auto-Pilot] Market Discovery Starting...');
    const db = readDB();
    const today = new Date().toISOString().split('T')[0];

    for (const keyword of db.keywords) {
        console.log(`🔍 Discovering new products for: ${keyword}`);

        // 1. 키워드로 신규 상품 ID들 검색
        const newIds = await searchAliexpressIds(keyword, 5); // 상위 5개만

        const keywordProducts = [];

        for (const id of newIds) {
            try {
                // 2. 상세 정보 수집
                console.log(`   - Scraping details for ID: ${id}`);
                const data = await scrape(id, {
                    puppeteerOptions: { headless: true, args: ['--no-sandbox'] }
                });

                // 3. 트래킹 리스트에 자동 추가 (없을 경우)
                if (!db.trackedProducts.some(p => p.productId === id)) {
                    db.trackedProducts.push({
                        productId: id,
                        title: data.title,
                        image: data.images[0],
                        keyword: keyword,
                        platform: 'aliexpress'
                    });
                }

                // 4. 히스토리 기록
                const histEntry = {
                    date: today,
                    price: data.salePrice.min.value,
                    reviews: parseInt(data.ratings?.totalStartCount || 0)
                };
                if (!db.history[id]) db.history[id] = [];
                if (!db.history[id].some(h => h.date === today)) {
                    db.history[id].push(histEntry);
                }

                keywordProducts.push({
                    id,
                    title: data.title,
                    price: data.salePrice.min.value,
                    image: data.images[0]
                });

                await new Promise(r => setTimeout(r, 3000)); // 차단 방지
            } catch (err) {
                console.error(`   ❌ Failed to scrape ${id}: ${err.message}`);
            }
        }

        // 5. 키워드별 인사이트 도출 (최저가 비교 등)
        if (keywordProducts.length > 0) {
            const sortedByPrice = [...keywordProducts].sort((a, b) => a.price - b.price);
            db.insights[keyword] = {
                lowestPrice: sortedByPrice[0].price,
                itemCount: keywordProducts.length,
                updatedAt: new Date().toISOString(),
                top3: sortedByPrice.slice(0, 3)
            };
        }
    }

    writeDB(db);
    console.log('✅ [Auto-Pilot] Market Discovery Finished.');
};

// 스케줄러: 매일 새벽 2시 및 낮 2시 (하루 2회)
cron.schedule('0 2,14 * * *', runDiscoveryAndAnalysis);

// 테스트용: 서버 실행 시 즉시 1회 실행 (개발 중에만 사용)
// runDiscoveryAndAnalysis();

app.listen(PORT, () => {
    console.log(`🤖 Market Intelligence Server running at http://localhost:${PORT}`);
});
