import express from 'express';
import { installReviewRoute } from './analyzer/groq.js';
import path from 'node:path';
import { analyzeWithLuau } from './analyzer/luau.js';
import { installAnalytics } from './analytics.js';

const app = express();
const projectPath = import.meta.dirname;
app.use(express.json({ limit: '320kb' }));
installAnalytics(app);
installReviewRoute(app);
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
app.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') return res.status(413).json({valid:false,saved:false,issues:[],message:'Запрос слишком большой'});
  if (error.type === 'entity.parse.failed') return res.status(400).json({valid:false,saved:false,issues:[],message:'Неверный JSON'});
  console.error(error.message);
  res.status(500).json({valid:false,saved:false,issues:[],message:'Ошибка сервера'});
});
const port = Number(process.env.PORT) || 3005;
app.listen(port, '0.0.0.0', () => console.log(`Сервер запущен на порту ${port}`));
