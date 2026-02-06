import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import domeggookListScraper from './domeggookListScraper.js';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'ui')));

// API: Search Domeggook
app.get('/api/search', async (req, res) => {
    const { keyword, category, page } = req.query;
    console.log(`Searching for: keyword=${keyword}, category=${category}, page=${page}`);
    try {
        const results = await domeggookListScraper({ keyword, category, page: parseInt(page) || 1 });
        res.json(results);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API: Start Full Generation for a Product
app.post('/api/generate', async (req, res) => {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'Missing productId' });

    const targetId = `domeggook-${productId}`;
    console.log(`Starting generation for product: ${productId} (Target: ${targetId})`);

    try {
        // Step 1: Download & Scrape
        console.log('Step 1: Downloading data...');
        await execPromise(`node domeggook_downloader.js ${productId}`);

        // Step 2: Extract & Process Images (Task 4.1 & 4.2)
        console.log(`Step 2: Processing images for ${targetId}...`);
        await execPromise(`node src/task4_1.js ${targetId}`);
        await execPromise(`node src/task4_2.js ${targetId}`);

        // Step 3: Generate Korean PDP (Task 7)
        console.log(`Step 3: Generating Korean PDP for ${targetId}...`);
        await execPromise(`node src/task7.js ${targetId}`);

        res.json({ success: true, message: 'Generation complete', folder: `outputs/${targetId}` });
    } catch (error) {
        console.error('Generation failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Serve the outputs folder for images
app.use('/outputs', express.static(path.join(process.cwd(), 'outputs')));

app.listen(PORT, () => {
    console.log(`Nano Banana Server running at http://localhost:3000`);
});
