import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function renderPDPImaage(targetId) {
    const baseDir = path.join(process.cwd(), 'outputs', targetId);
    const mdPath = path.join(baseDir, 'NEW_DETAILS_KO.md');
    const outImagePath = path.join(baseDir, 'PDP_FINAL_KO.jpg');

    if (!(await fs.access(mdPath).then(() => true).catch(() => false))) {
        console.error(`Markdown file not found: ${mdPath}`);
        return;
    }

    const mdContent = await fs.readFile(mdPath, 'utf-8');

    // Helper to read image as base64
    const getBase64 = async (relPath) => {
        try {
            const fullPath = path.join(baseDir, relPath);
            const data = await fs.readFile(fullPath);
            return `data:image/png;base64,${data.toString('base64')}`;
        } catch (e) {
            console.error(`Failed to read image ${relPath}:`, e.message);
            return '';
        }
    };

    const images = {
        banner: await getBase64('images/banner_ko.png'),
        shot1: await getBase64('images/shot_1.png'),
        shot2: await getBase64('images/shot_2.png'),
        shot3: await getBase64('images/shot_3.png'),
    };

    // Extracting sections from MD for dynamic rendering
    const extractSection = (titleRegex, removeHeading = true) => {
        const lines = mdContent.split('\n');
        let start = -1;
        let end = -1;
        for (let i = 0; i < lines.length; i++) {
            if (titleRegex.test(lines[i])) {
                start = i;
                break;
            }
        }
        if (start === -1) return "";
        for (let i = start + 1; i < lines.length; i++) {
            if (/^(#|---)/.test(lines[i])) {
                end = i;
                break;
            }
        }
        let content = lines.slice(start, end === -1 ? undefined : end).join('\n');
        if (removeHeading) {
            content = content.replace(/^#+ .*\n?/, '').trim();
        }
        return content;
    };

    // Helper to clean markdown artifacts (images, bold, etc.)
    const cleanMarkdown = (text) => {
        if (!text) return "";
        return text
            .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
            .replace(/^\s*[*+-]\s+/, '')      // Remove leading list markers (*, -, +)
            .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold
            .replace(/\*(.*?)\*/g, '$1')      // Remove italic
            .trim();
    };

    const introTitle = cleanMarkdown(mdContent.match(/## ✨ (.*) ✨/)?.[1] || "당신의 하루에 특별함을 더하다");
    const introText = cleanMarkdown(extractSection(/## ✨/));
    const mainTitle = cleanMarkdown(mdContent.match(/## ☕ (.*) ❄️/)?.[1] || "1.18리터 대용량 텀블러");
    const mainDesc = cleanMarkdown(extractSection(/## ☕/));
    const specs = extractSection(/### 📏 사이즈 및 상세 실측/);
    const cautions = extractSection(/### ⚠️ 구매 전 유의사항/);
    const shipping = extractSection(/### 🚚 배송\/교환\/반품 안내/);
    const cs = extractSection(/### 📞 고객센터 안내/);

    const readmePath = path.join(baseDir, 'README.md');
    const readmeContent = await fs.readFile(readmePath, 'utf-8').catch(() => "");
    const productTitle = readmeContent.split('\n')[0].replace('# ', '') || "";

    // Theme Configuration
    const THEMES = {
        LIFESTYLE: {
            accent: '#80CBC4', // Soft Mint
            bg: '#FFFFFF',
            cardBg: '#f9f9f9',
            text: '#333333',
            name: 'Soft & Natural'
        },
        LUXURY: {
            accent: '#D4AF37', // Gold
            bg: '#111111',
            cardBg: '#1a1a1a',
            text: '#f5f5f5',
            name: 'Premium Luxury'
        },
        SPORT: {
            accent: '#007AFF', // Vivid Blue
            bg: '#F2F2F7',
            cardBg: '#FFFFFF',
            text: '#1C1C1E',
            name: 'Active Sport'
        }
    };

    // Simple Theme Selection Logic
    let themeKey = 'LIFESTYLE';
    if (productTitle.includes('텀블러') || productTitle.includes('커피')) themeKey = 'LIFESTYLE';
    else if (productTitle.includes('전자') || productTitle.includes('스마트') || productTitle.includes('프리미엄')) themeKey = 'LUXURY';
    else if (productTitle.includes('운동') || productTitle.includes('스포츠') || productTitle.includes('아웃도어')) themeKey = 'SPORT';

    const theme = THEMES[themeKey];
    const accentColor = theme.accent;
    const bgColor = theme.bg;
    const cardBg = theme.cardBg;
    const textColor = theme.text;
    const fontMain = "'Outfit', sans-serif";

    // Helper to clean markdown artifacts (images, bold, etc.)

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
            body { 
                margin: 0; padding: 0; width: 860px; 
                font-family: ${fontMain}, 'Noto Sans KR', sans-serif; 
                background: ${bgColor}; color: ${textColor}; overflow-x: hidden;
            }
            .section { position: relative; width: 860px; text-align: center; }
            
            /* Banner Section */
            .banner-container { width: 860px; height: 1100px; overflow: hidden; position: relative; }
            .banner-img { width: 100%; height: 100%; object-fit: cover; }
            .banner-overlay {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: ${themeKey === 'LUXURY' ? 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.9) 95%)' : 'linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.8) 95%)'};
                display: flex; flex-direction: column; justify-content: flex-end; padding: 120px 40px; box-sizing: border-box;
            }
            
            .label { font-size: 16px; letter-spacing: 6px; color: ${accentColor}; font-weight: 600; margin-bottom: 25px; text-transform: uppercase; }
            h1 { font-size: 54px; font-weight: 800; margin: 0; line-height: 1.3; color: ${themeKey === 'LUXURY' ? '#fff' : '#111'}; letter-spacing: -2px; }
            
            /* Intro Section */
            .feature-intro { padding: 120px 40px; background: ${bgColor}; line-height: 2; font-size: 18px; color: ${themeKey === 'LUXURY' ? '#aaa' : '#666'}; font-weight: 300; }
            .line { width: 40px; height: 3px; background: ${accentColor}; margin: 50px auto; }
            
            /* Image with labels */
            .image-wrap { margin: 10px 0; background: ${bgColor}; position: relative; }
            .image-wrap img { width: 860px; display: block; }
            .img-num { position: absolute; top: 40px; left: 40px; font-weight: 800; font-size: 14px; color: ${accentColor}; letter-spacing: 3px; }

            /* Grid Content */
            .content-block { padding: 100px 60px; text-align: left; background: ${bgColor}; }
            .content-block h2 { font-size: 34px; font-weight: 800; margin-bottom: 20px; color: ${themeKey === 'LUXURY' ? '#fff' : '#000'}; letter-spacing: -1px; }
            .content-block .desc { font-size: 18px; color: ${themeKey === 'LUXURY' ? '#888' : '#888'}; margin-bottom: 60px; font-weight: 300; }
            
            .info-list { margin-top: 40px; }
            .info-item { display: flex; align-items: flex-start; margin-bottom: 30px; }
            .info-bullet { min-width: 10px; height: 10px; background: ${accentColor}; border-radius: 50%; margin-top: 8px; margin-right: 20px; }
            .info-text b { display: block; font-size: 20px; margin-bottom: 5px; color: ${themeKey === 'LUXURY' ? '#fff' : '#111'}; }
            .info-text span { font-size: 16px; color: ${themeKey === 'LUXURY' ? '#777' : '#777'}; line-height: 1.5; }

            /* Specs Table */
            .specs-section { padding: 100px 60px; background: ${themeKey === 'LUXURY' ? '#151515' : '#fdfdfd'}; }
            .specs-table { width: 100%; border-collapse: collapse; }
            .specs-table td { padding: 25px 0; border-bottom: 1px solid ${themeKey === 'LUXURY' ? '#333' : '#eee'}; font-size: 18px; }
            .specs-table td:first-child { color: ${themeKey === 'LUXURY' ? '#666' : '#aaa'}; width: 35%; font-size: 15px; letter-spacing: 1px; }
            .specs-table td:last-child { color: ${themeKey === 'LUXURY' ? '#fff' : '#111'}; font-weight: 600; text-align: right; }

            /* Warning / CS Section */
            .utility-section { padding: 80px 60px; background: ${themeKey === 'LUXURY' ? '#0a0a0a' : '#fafafa'}; border-radius: 40px 40px 0 0; text-align: left; }
            .util-card { margin-bottom: 60px; }
            .util-card h4 { font-size: 20px; font-weight: 800; margin-bottom: 25px; color: ${themeKey === 'LUXURY' ? '#ddd' : '#444'}; border-bottom: 2px solid ${themeKey === 'LUXURY' ? '#222' : '#eee'}; padding-bottom: 15px; }
            .util-card ul { list-style: none; padding: 0; }
            .util-card li { font-size: 16px; color: ${themeKey === 'LUXURY' ? '#888' : '#777'}; margin-bottom: 12px; display: flex; }
            .util-card li::before { content: '•'; color: ${accentColor}; margin-right: 12px; font-weight: bold; }

            .footer { display: none; }
        </style>
    </head>
    <body>
        <!-- BANNER -->
        <div class="banner-container">
            <img src="${images.banner}" class="banner-img">
            <div class="banner-overlay">
                <div class="label">NANO BANANA SELECTION</div>
                <h1>${introTitle.replace(/\n/g, '<br>')}</h1>
            </div>
        </div>

        <!-- INTRO TEXT -->
        <div class="feature-intro">
            ${introText.split('\n').map(l => l.trim() ? `<div>${l}</div>` : '').join('')}
            <div class="line"></div>
        </div>

        <!-- PROD SHOT 1 -->
        <div class="image-wrap">
            <div class="img-num">01 PRODUCT DESIGN</div>
            <img src="${images.shot1}">
        </div>

        <!-- MAIN FEATURES -->
        <div class="content-block">
            <h2>Luxury Craftsmanship</h2>
            <div class="desc">${mainDesc.replace(/\*/g, '')}</div>
            
            <div class="info-list">
                <div class="info-item">
                    <div class="info-bullet"></div>
                    <div class="info-text"><b>뛰어난 보온/보냉 성능</b><span>이중 진공 단열층이 하루 종일 음료의 온도를 지켜줍니다.</span></div>
                </div>
                <div class="info-item">
                    <div class="info-bullet"></div>
                    <div class="info-text"><b>304 프리미엄 스테인리스</b><span>위생과 안전을 가장 먼저 생각한 고품질 소재만을 사용합니다.</span></div>
                </div>
                <div class="info-item">
                    <div class="info-bullet"></div>
                    <div class="info-text"><b>인체공학적 핸들 설계</b><span>대용량임에도 안정적인 그립감으로 이동이 간편합니다.</span></div>
                </div>
            </div>
        </div>

        <!-- PROD SHOT 2 -->
        <div class="image-wrap">
            <div class="img-num">02 MOMENT</div>
            <img src="${images.shot2}">
        </div>

        <!-- SPECS -->
        <div class="specs-section">
            <div class="label" style="text-align:center;">Information</div>
            <h2 style="text-align:center; font-size: 32px; margin-bottom: 60px;">Technical Specs</h2>
            <table class="specs-table">
                ${specs.split('\n').filter(l => l.trim().startsWith('*')).map(l => {
        const parts = l.trim().slice(1).split(':');
        if (parts.length >= 2) {
            const k = cleanMarkdown(parts[0]);
            const v = cleanMarkdown(parts.slice(1).join(':'));
            if (k && v) {
                return `<tr><td>${k}</td><td>${v}</td></tr>`;
            }
        }
        return '';
    }).join('')}
            </table>
        </div>

        <!-- PROD SHOT 3 -->
        <div class="image-wrap">
            <div class="img-num">03 QUALITY FINISH</div>
            <img src="${images.shot3}">
        </div>

        <!-- UTILITIES (Warning, Shipping, CS) -->
        <div class="utility-section">
            <div class="util-card">
                <h4>⚠️ 구매 전 유의사항</h4>
                <ul>
                    ${cautions.split('\n').filter(l => l.trim().startsWith('*')).map(l => `<li>${cleanMarkdown(l)}</li>`).join('')}
                </ul>
            </div>
            
            <div class="util-card">
                <h4>🚚 배송 및 교환 안내</h4>
                <ul>
                    ${shipping.split('\n').filter(l => l.trim().startsWith('*')).map(l => `<li>${cleanMarkdown(l)}</li>`).join('')}
                </ul>
            </div>

            <div class="util-card">
                <h4>📞 고객센터 안내</h4>
                <ul>
                    ${cs.split('\n').filter(l => l.trim().startsWith('*')).map(l => `<li>${cleanMarkdown(l)}</li>`).join('')}
                </ul>
            </div>
        </div>


        <div style="height: 100px; background: ${bgColor};"></div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 860, height: 1000 });

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    console.log('Generating Dynamic Premium PDP Image...');
    await page.screenshot({
        path: outImagePath,
        fullPage: true,
        type: 'jpeg',
        quality: 95
    });

    await browser.close();
    console.log(`✅ Success: ${outImagePath}`);
}

const targetId = process.argv[2];
if (!targetId) {
    console.log('Usage: node src/renderPDP.js <targetId>');
} else {
    renderPDPImaage(targetId).catch(console.error);
}
