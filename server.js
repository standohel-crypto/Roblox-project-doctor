import express from 'express';
import { installReviewRoute } from './analyzer/groq.js';
import path from 'node:path';
import { analyzeWithLuau } from './analyzer/luau.js';
import { mkdir, appendFile, readFile } from 'node:fs/promises';

const app = express();
const projectPath = import.meta.dirname;
const feedbackDirectory = path.join(projectPath, 'data');
// Serialize writes to keep each JSONL record intact.
let feedbackWrite = Promise.resolve();
app.use(express.json({ limit: '320kb' }));
installReviewRoute(app);
const onlineVisitors = new Map();

let visitorsDay = '';
let dailyVisitors = new Set();
let visitorsQueue = Promise.resolve();

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Almaty',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

function getVisitorsDay() {
    const parts = dayFormatter.formatToParts(new Date());
    const value = type => parts.find(part => part.type === type).value;

    return `${value('year')}-${value('month')}-${value('day')}`;
}

app.post('/api/presence', (req, res, next) => {
    const visitorId = req.body?.visitorId;

    if (
        typeof visitorId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId)
    ) {
        return res.status(400).json({
            message: 'Некорректный ID посетителя'
        });
    }

    // Очередь защищает от повторного подсчёта
    // при одновременных запросах из нескольких вкладок.
    const work = visitorsQueue.then(async () => {
        const day = getVisitorsDay();
        const file = path.join(
            feedbackDirectory,
            `visitors-${day}.jsonl`
        );

        if (visitorsDay !== day) {
            await mkdir(feedbackDirectory, { recursive: true });

            let saved = '';

            try {
                saved = await readFile(file, 'utf8');
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }

            dailyVisitors = new Set(
                saved.split(/\r?\n/).filter(Boolean)
            );

            visitorsDay = day;
        }

        if (!dailyVisitors.has(visitorId)) {
            await appendFile(file, visitorId + '\n', 'utf8');
            dailyVisitors.add(visitorId);
        }

        const now = Date.now();
        onlineVisitors.set(visitorId, now);

        for (const [id, lastSeen] of onlineVisitors) {
            if (now - lastSeen >= 60_000) {
                onlineVisitors.delete(id);
            }
        }

        return {
            online: onlineVisitors.size,
            today: dailyVisitors.size
        };
    });

    visitorsQueue = work.catch(() => {});

    work
        .then(stats => {
            res.set('Cache-Control', 'no-store');
            res.json(stats);
        })
        .catch(next);
});
app.use(express.static(path.join(projectPath, 'client')));
app.get('/', (req, res) => res.redirect('/page'));
app.get('/page', (req, res) => res.sendFile(path.join(projectPath, 'client/page.html')));
app.post('/code', async (req, res) => {
  const code = req.body?.code;
  if (typeof code !== 'string' || !code.trim()) return res.status(400).json({valid:false,message:'Вставьте код Luau',issues:[]});
  if (Buffer.byteLength(code, 'utf8') > 50_000) return res.status(413).json({valid:false,message:'Код слишком большой: максимум 50 КБ',issues:[]});
  try { res.json(await analyzeWithLuau(code)); }
  catch (error) {
    console.error('Сбой анализа:', error.message);
    res.status(500).json({valid:false,message:'Не удалось выполнить анализ. Попробуйте ещё раз.',issues:[]});
  }
});
app.post('/api/feedback', async (req, res) => {
  const { ruleId, helpful, language } = req.body ?? {};
  if (typeof ruleId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(ruleId) || typeof helpful !== 'boolean' || !['ru','en'].includes(language)) {
    return res.status(400).json({ saved:false });
  }
  // Explicit fields only: never write source code or diagnostic text here.
  const record = JSON.stringify({ ruleId, helpful, language, createdAt:new Date().toISOString() }) + '\n';
  const write = feedbackWrite.then(async () => {
    await mkdir(feedbackDirectory, { recursive:true });
    await appendFile(path.join(feedbackDirectory, 'feedback.jsonl'), record, 'utf8');
  });
  feedbackWrite = write.catch(() => {});
  try { await write; res.json({saved:true}); }
  catch (error) { console.error('Ошибка сохранения отзыва:', error.message); res.status(500).json({saved:false}); }
});
app.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') return res.status(413).json({valid:false,saved:false,issues:[],message:'Запрос слишком большой'});
  if (error.type === 'entity.parse.failed') return res.status(400).json({valid:false,saved:false,issues:[],message:'Неверный JSON'});
  console.error(error.message);
  res.status(500).json({valid:false,saved:false,issues:[],message:'Ошибка сервера'});
});
app.listen(3005, () => console.log('Сервер работает на http://localhost:3005/page'));
