'use strict';
const $ = id => document.getElementById(id);
const texts = {
  ru: {guideTitle:"Как проверить скрипт Roblox",guideIntro:"Вставь код Luau в поле выше и нажми «Проверить код». В результатах появятся найденные проблемы и номера строк. Для знакомых сообщений доступны перевод и советы; оригинал анализатора можно раскрыть отдельно.",exampleTitle:"Пример: число записано как текст",exampleExplain:"Здесь coins объявлена числом, но получает строку «100». Проверка типов обнаружит несовпадение. Если нужны монеты как число, убери кавычки: local coins: number = 100.",checksTitle:"Что проверяет обычный анализ",checksText:"Luau LSP с определениями Roblox проверяет синтаксис и типы. Project Doctor показывает диагностику и объясняет знакомые сообщения. Такая проверка доступна и в Roblox Studio; здесь можно разобрать отдельный скрипт в браузере.",aiTitle:"Когда нужен ИИ",aiText:"Опция «Включить ИИ при анализе» добавляет разбор возможных логических проблем и предложения исправлений. Код отправляется сервису Groq. ИИ может ошибаться или быть временно недоступен; проверяй предложенные изменения в Roblox Studio.",limitsTitle:"Почему скрипт может не работать без ошибок?",limitsText:"Анализатор не запускает игру и не видит все объекты и связанные скрипты проекта. Неверное условие, повторная выдача награды или отсутствующий объект могут требовать проверки во время игры. Отсутствие диагностик не гарантирует правильную работу скрипта.",about:'Что проверяется',language:'Язык',theme:'Тема',dark:'Тёмная тема',light:'Светлая тема',heading:'Проверка скриптов Roblox на ошибки',subtitle:'Roblox Project Doctor проверяет код Luau и объясняет знакомые ошибки на русском. Дополнительно можно включить разбор с ИИ.',code:'Твой код',clear:'Очистить',analyze:'Проверить код',results:'Результаты анализа',waitHint:'Проверка может занять несколько секунд.',footer:'Project Doctor · Помощник для проверки Luau',close:'Понятно',aboutText:'Проверяем синтаксис и типы с помощью Luau LSP и определений Roblox. Проверка не запускает игру и не знает объекты твоего проекта. Она не гарантирует отсутствие логических ошибок или уязвимостей.',translationInfo:'Перевод и советы доступны для знакомых сообщений. Для остальных сохраняется оригинал анализатора.',feedbackInfo:'Отзывы сохраняются на сервере: идентификатор правила, Да/Нет и язык. Исходный код в отзыв не входит. Для статистики сохраняем случайный ID браузера и время посещения, число и результат запросов анализа.',version:'Интерфейс: MVP 0.2. Версия анализатора зависит от установленного luau-lsp.',idle:'Вставь код и нажми «Проверить код».',loading:'Анализируем…',empty:'Вставь код Luau.',large:'Код слишком большой: максимум 50 КБ.',network:'Не удалось выполнить анализ. Проверь соединение и сервер.',timeout:'Сервер не ответил за 60 секунд. Попробуй ещё раз.',found:'Найдено проблем: ',clean:'Диагностик не найдено.',failed:'Анализатор сообщил об ошибке без списка диагностик.',lines:'Строк: ',line:'Строка',advice:'Совет: ',helped:'Помог совет?',yes:'Да',no:'Нет',saving:'Сохраняем…',thanks:'Спасибо! Отзыв сохранён.',feedbackError:'Не удалось сохранить отзыв. Попробуй ещё раз.',original:'Оригинал анализатора',untranslated:'Для этого сообщения пока нет перевода.',stale:'Код изменён. Запусти проверку ещё раз.',seconds:' с'},
  en: {guideTitle:"How to check a Roblox script",guideIntro:"Paste Luau code above and click “Analyze code”. Results show detected issues and line numbers. Recognized messages include translations and advice; the original diagnostic is available separately.",exampleTitle:"Example: a number stored as text",exampleExplain:"Here coins is declared as a number but receives the string “100”. Type checking detects the mismatch. If coins should be a number, remove the quotes: local coins: number = 100.",checksTitle:"What regular analysis checks",checksText:"Luau LSP with Roblox definitions checks syntax and types. Project Doctor displays diagnostics and explains recognized messages. Roblox Studio also provides this kind of checking; this tool lets you review a single script in your browser.",aiTitle:"When AI review helps",aiText:"The “Include AI review” option adds a review of possible logic problems and suggested fixes. Code is sent to Groq. AI can make mistakes or be temporarily unavailable; test suggested changes in Roblox Studio.",limitsTitle:"Why can a script fail without diagnostics?",limitsText:"The analyzer does not run the game or see all project objects and related scripts. Incorrect conditions, repeated rewards or missing objects may require testing during gameplay. No diagnostics does not guarantee a working script.",about:'What we check',language:'Language',theme:'Theme',dark:'Dark theme',light:'Light theme',heading:'Check Roblox scripts for errors',subtitle:'Roblox Project Doctor checks Luau code and explains recognized errors. Optional AI review is also available.',code:'Your code',clear:'Clear',analyze:'Analyze code',results:'Analysis results',waitHint:'Analysis may take a few seconds.',footer:'Project Doctor · Luau analysis assistant',close:'Got it',aboutText:'Checks syntax and types using Luau LSP and Roblox definitions. It does not run your game or know your project objects. It cannot guarantee the absence of logic errors or vulnerabilities.',translationInfo:'Translations and advice are available for recognized messages. Other diagnostics retain the analyzer’s original text.',feedbackInfo:'Feedback is stored on the server: rule identifier, Yes/No and language. Feedback does not include source code. Statistics store a random browser ID, visit times, and analysis request counts and outcomes.',version:'Interface: MVP 0.2. The analyzer version depends on your installed luau-lsp.',idle:'Paste code and click “Analyze code”.',loading:'Analyzing…',empty:'Paste Luau code.',large:'Code is too large: maximum 50 KB.',network:'Analysis failed. Check your connection and server.',timeout:'The server did not respond within 60 seconds. Try again.',found:'Issues found: ',clean:'No diagnostics found.',failed:'The analyzer reported failure without diagnostics.',lines:'Lines: ',line:'Line',advice:'Advice: ',helped:'Was this helpful?',yes:'Yes',no:'No',saving:'Saving…',thanks:'Thanks! Feedback saved.',feedbackError:'Could not save feedback. Please try again.',original:'Original diagnostic',untranslated:'This message has no translation yet.',stale:'Code has changed. Run analysis again.',seconds:' s'}
};
function readSetting(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } }
function saveSetting(key, value) { try { localStorage.setItem(key, value); } catch { /* Settings remain usable for this visit. */ } }
let language = readSetting('doctor-language','ru') === 'en' ? 'en' : 'ru';
let theme = readSetting('doctor-theme','dark') === 'light' ? 'light' : 'dark';
let busy = false, result = null, analyzedCode = '', elapsed = null, status = 'idle';
let feedback = new Map();
let aiResult = null;
const aiToggle = document.createElement('input');
aiToggle.type='checkbox'; aiToggle.id='enableAI';
const aiLabel=document.createElement('label');
aiLabel.style.cssText='display:flex;gap:10px;align-items:center;margin:12px 20px;';
aiLabel.append(aiToggle);
const aiLabelText=document.createElement('span'); aiLabelText.id='aiLabelText';aiLabel.append(aiLabelText);
const aiDisclosure=document.createElement('p');aiDisclosure.id='aiDisclosure';aiDisclosure.className='muted small';aiDisclosure.style.margin='0 20px 12px';
$('analyzeButton').parentElement.before(aiLabel,aiDisclosure);
aiToggle.addEventListener('change',()=>{if(!busy && !result){aiResult=null;renderAI();}});
const t = key => texts[language][key];
function element(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
// Older server responses still work. New ones can include translations.ru/en.
function describe(issue) {
  if (issue.translations?.[language]) return {...issue.translations[language],ruleId:issue.ruleId || 'diagnostic'};
  const message = issue.originalMessage || issue.explanation || '';
  const match = message.match(/^Expected this to be '([^']+)', but got '([^']+)'$/);
  if (match) return {ruleId:'type-mismatch', title:language === 'ru' ? 'Несовместимые типы' : 'Type mismatch', explanation:language === 'ru' ? `Ожидался тип «${match[1]}», получен «${match[2]}».` : message, recommendation:language === 'ru' ? 'Проверь значение и объявленный тип. Исправь тот из них, который не соответствует задумке.' : 'Check the value and declared type. Correct whichever does not match your intent.'};
  if (issue.translations?.[language]) return {...issue.translations[language],ruleId:issue.ruleId || 'diagnostic'};
  return {title:issue.title || 'Diagnostic',explanation:message,recommendation:language === 'ru' ? (issue.recommendation || '') : '',ruleId:'diagnostic',untranslated:language === 'ru'};
}
function renderStatus() {
  $('analysisResult').textContent = status === 'done' ? (result.issues.length ? t('found') + result.issues.length : result.valid === false ? t('failed') : t('clean')) : t(status);
  $('analysisResult').dataset.state = status === 'done' ? (result.issues.length ? 'done' : result.valid === false ? 'error' : 'success') : ['network','timeout','empty','large'].includes(status) ? 'error' : status;
  $('elapsed').textContent = elapsed === null ? '' : (elapsed / 1000).toLocaleString(language, {maximumFractionDigits:2}) + t('seconds');
  $('analyzeButton').textContent = t(busy ? 'loading' : 'analyze');
  $('analyzeButton').disabled = busy;
  aiToggle.disabled = busy;
  $('clearButton').disabled = busy;
  $('issuesList').setAttribute('aria-busy',String(busy));
  $('lineCount').textContent = t('lines') + $('codeInput').value.split('\n').length;
  $('staleNotice').hidden = !result || $('codeInput').value === analyzedCode;
}
function jumpToLine(line) {
  if ($('codeInput').value !== analyzedCode) return;
  const lines = analyzedCode.split('\n');
  const index = Math.max(0,Math.min(lines.length - 1,(Number(line) || 1) - 1));
  const start = lines.slice(0,index).reduce((n,s) => n+s.length+1,0);
  $('codeInput').focus(); $('codeInput').setSelectionRange(start,start+lines[index].length);
  $('codeInput').scrollTop = index * parseFloat(getComputedStyle($('codeInput')).lineHeight);
}
function renderIssues() {
  renderAI();
  $('issuesList').replaceChildren();
  for (const [index,issue] of (result?.issues || []).entries()) {
    const description = describe(issue);
    const severity = ['critical','high','warning','medium','low','info'].includes(issue.severity) ? issue.severity : 'info';
    const card = element('article',undefined,`issue ${severity}`);
    card.append(element('h3',description.title),element('p',description.explanation));
    if (description.untranslated) card.append(element('p',t('untranslated'),'muted small'));
    if (issue.line) { const jump = element('button',`${t('line')} ${issue.line}`,'location'); jump.type='button'; jump.disabled=$('codeInput').value !== analyzedCode; jump.addEventListener('click',() => jumpToLine(issue.line)); card.append(jump); }
    if (description.recommendation) {
      card.append(element('p',t('advice')+description.recommendation,'recommendation'));
      const row = element('div',undefined,'feedback'); row.append(element('span',t('helped')));
      const state = feedback.get(index);
      for (const helpful of [true,false]) { const button=element('button',t(helpful?'yes':'no')); button.type='button'; button.disabled=state==='saving'||state==='saved'; button.addEventListener('click',() => sendFeedback(index,description.ruleId,helpful)); row.append(button); }
      const note=element('span',state ? t(state==='saved'?'thanks':state==='saving'?'saving':'feedbackError') : '', 'feedback-status'); note.setAttribute('role','status'); row.append(note); card.append(row);
    }
    if (issue.originalMessage) { const details=element('details'); details.append(element('summary',t('original')),Object.assign(element('pre',issue.originalMessage),{style:'white-space:pre-wrap;overflow-wrap:anywhere;font:inherit'})); card.append(details); }
    $('issuesList').append(card);
  }
}
async function sendFeedback(index,ruleId,helpful) {
  const currentFeedback = feedback;
  if (['saving','saved'].includes(currentFeedback.get(index))) return;
  currentFeedback.set(index,'saving'); renderIssues();
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
  try {
    const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ruleId:/^[a-zA-Z0-9_-]{1,80}$/.test(ruleId)?ruleId:'diagnostic',helpful,language}),signal:controller.signal});
    const data=await response.json(); if (!response.ok || data.saved !== true) throw new Error('Feedback not saved');
    currentFeedback.set(index,'saved');
  } catch { currentFeedback.set(index,'error'); }
  finally { clearTimeout(timer); if (currentFeedback === feedback) renderIssues(); }
}
function translate() {
  $('aiLabelText').textContent=language==='ru'?'Включить ИИ при анализе':'Include AI review';
  $('aiDisclosure').textContent=language==='ru'?'При включении код отправляется Groq. ИИ может ошибаться.':'When enabled, code is sent to Groq. AI can make mistakes.';
  document.documentElement.lang=language; document.documentElement.dataset.theme=theme;
  $('languageSelect').value=language; $('themeSelect').value=theme;
  document.querySelectorAll('[data-i18n]').forEach(node=>node.textContent=t(node.dataset.i18n));
  renderStatus(); renderIssues();
}
$('languageSelect').addEventListener('change',()=>{language=$('languageSelect').value;saveSetting('doctor-language',language);translate();});
$('themeSelect').addEventListener('change',()=>{theme=$('themeSelect').value;saveSetting('doctor-theme',theme);translate();});
$('aboutButton').addEventListener('click',()=>$('aboutDialog').showModal());
$('codeInput').addEventListener('input',()=>{renderStatus();renderIssues();});
$('clearButton').addEventListener('click',()=>{if(busy)return;$('codeInput').value='';result=null;aiResult=null;elapsed=null;status='idle';feedback=new Map();renderStatus();renderIssues();$('codeInput').focus();});
$('userForm').addEventListener('submit',async event=>{
  event.preventDefault(); if(busy)return;
  const code=$('codeInput').value, requestLanguage=language, useAI=aiToggle.checked;
  result=null;aiResult=null;elapsed=null;feedback=new Map();renderIssues();
  if(!code.trim()){status='empty';renderStatus();return;}
  if(new TextEncoder().encode(code).length>50000){status='large';renderStatus();return;}
  busy=true;status='loading';aiResult=useAI?{status:'loading'}:null;
  renderStatus();renderAI();
  const started=performance.now();
  async function runLuau(){
    try {
      const response=await fetch('/code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code}),signal:AbortSignal.timeout(60000)});
      if(!response.ok){status=response.status===413?'large':'network';return;}
      const data=await response.json();
      if(!data||!Array.isArray(data.issues)||!data.issues.every(i=>i&&typeof i==='object'))throw new Error('Invalid response');
      result=data;analyzedCode=code;elapsed=performance.now()-started;status='done';
    }catch(error){status=['AbortError','TimeoutError'].includes(error.name)?'timeout':'network';}
    finally{renderStatus();renderIssues();}
  }
  async function runAI(){
    if(!useAI)return;
    try {
      const response=await fetch('/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,language:requestLanguage}),signal:AbortSignal.timeout(45000)});
      if(!response.ok){aiResult={status:'unavailable',reason:response.status===413?'too_large':response.status===429?'rate_limit':'server_error'};return;}
      const data=await response.json();
      if(!data||!['done','unavailable'].includes(data.status)||(data.status==='done'&&(typeof data.summary!=='string'||!Array.isArray(data.findings)||!data.findings.every(f=>f&&['title','problem','fix','code'].every(k=>typeof f[k]==='string')))))throw new Error('Invalid AI response');
      aiResult={...data,source:code};
    }catch(error){aiResult={status:'unavailable',reason:['AbortError','TimeoutError'].includes(error.name)?'timeout':'connection'};}
    finally{renderAI();}
  }
  try{await Promise.allSettled([runLuau(),runAI()]);}
  finally{busy=false;renderStatus();renderIssues();}
});
function renderAI(){
  let panel=$('doctorAI');
  if(!panel){panel=element('section',undefined,'issue');panel.id='doctorAI';panel.style.margin='18px';panel.setAttribute('aria-labelledby','doctorAITitle');$('analysisResult').before(panel);}
  panel.replaceChildren();panel.hidden=!aiResult;
  if(!aiResult)return;
  const ru=language==='ru';const title=element('h3',ru?'От ИИ':'AI review');title.id='doctorAITitle';panel.append(title);
  if(aiResult.status==='loading'){panel.append(element('p',t('loading')));return;}
  if(aiResult.status!=='done'){
    const reasons={
      invalid_response:['ИИ не смог выдать ответ в нужном формате. Повтори запрос или сократи фрагмент.','AI could not produce the required response format. Retry or use a smaller sample.'],
      truncated:['Ответ ИИ оборвался из-за ограничения длины. Проверь меньший фрагмент.','AI output reached its length limit. Review a smaller sample.'],
      rate_limit:['Достигнут лимит запросов или токенов ИИ. Подожди и повтори; для длинного скрипта попробуй отдельную функцию с её зависимостями.','AI request or token limit reached. Wait and retry, or review a function with its dependencies.'],
      context_limit:['Код превышает допустимый размер запроса у провайдера ИИ. Отправь меньший фрагмент с относящимися к нему объявлениями.','The code exceeds the provider input limit. Submit a smaller sample with relevant declarations.'],
      too_large:['Код слишком большой: максимум 50 КБ.','Code is too large: maximum 50 KB.'],
      not_configured:['ИИ пока не настроен на сервере сайта. Обычная проверка доступна отдельно.','AI is not configured on the server. Luau analysis is separate.'],
      configuration:['Проблема с доступом сайта к модели ИИ. Администратору нужно проверить настройки.','The site cannot access the AI model. The administrator needs to check configuration.'],
      timeout:['ИИ не ответил вовремя. Повтори позже или проверь меньший фрагмент.','AI timed out. Try later or review a smaller sample.'],
      connection:['Не удалось связаться с сервером или сервисом ИИ. Попробуй повторить запрос.','Could not connect to the server or AI service. Try again.'],
      empty_response:['Сервис ИИ вернул пустой ответ. Попробуй ещё раз.','The AI service returned an empty response. Try again.'],
      provider_request:['Сервис ИИ отклонил запрос. Администратору нужно проверить совместимость модели и формата ответа.','The AI provider rejected the request. The administrator should check model and response format compatibility.'],
      provider_error:['Сервис ИИ вернул ошибку. Попробуй позже.','The AI provider returned an error. Try later.'],
      server_error:['Сервер сайта не выполнил запрос ИИ. Попробуй позже.','The site server could not process the AI request. Try later.'],
      invalid_input:['Проверь код и выбранный язык, затем повтори запрос.','Check the code and selected language, then retry.']
    };
    const msg=reasons[aiResult.reason]||['ИИ временно недоступен.','AI is temporarily unavailable.'];
    panel.append(element('p',msg[ru?0:1]),element('p',(ru?'Причина: ':'Reason: ')+(aiResult.reason||'unknown'),'muted small'),element('p',ru?'Результат проверки Luau показывается отдельно.':'Luau results are shown separately.'));return;
  }
  panel.append(element('p',ru?'Вот что можно улучшить. Примеры кода проверь перед применением.':'Model suggestions, not confirmed errors. Verify changes before applying.','muted small'));
  if(aiResult.source!==$('codeInput').value)panel.append(element('p',t('stale'),'notice'));
  if(aiResult.language!==language)panel.append(element('p',ru?'Этот ответ получен на английском. Для русского ответа повтори анализ.':'This response was generated in Russian. Run again for English.','muted small'));
  panel.append(element('p',aiResult.summary));
  aiResult.findings.forEach((finding,index)=>{
    const card=element('article',undefined,'issue');card.style.marginTop='16px';
    const head=element('div');
    head.append(element('h4',`${index+1}. ${finding.title}`));
    if(finding.lineStart){const lines=finding.lineEnd&&finding.lineEnd!==finding.lineStart?`${finding.lineStart}–${finding.lineEnd}`:String(finding.lineStart);head.append(element('span',`${ru?'Строки':'Lines'} ${lines}`,'badge'));}
    if(finding.uncertain)head.append(element('p',ru?'Нужно проверить контекст':'Check the surrounding context','muted small'));
    card.append(head);
    for(const [label,value] of [[ru?'Что не так':'Problem',finding.problem],[ru?'Как исправить':'How to fix',finding.fix]]){
      const paragraph=element('p');paragraph.append(element('strong',label+': '),element('span',value));card.append(paragraph);
    }
    if(finding.code.trim()){
      card.append(element('p',ru?'Пример исправления':'Example fix','muted small'));
      const pre=element('pre');pre.style.cssText='margin:8px 0 0;padding:14px;border-radius:8px;background:var(--field);overflow-x:auto;white-space:pre;line-height:1.6;font-size:13px;';
      pre.append(element('code',finding.code));card.append(pre);
    }
    panel.append(card);
  });
  const row=element('div',undefined,'feedback');row.append(element('span',t('helped')));const state=feedback.get('groq-review');
  for(const helpful of [true,false]){const b=element('button',t(helpful?'yes':'no'));b.type='button';b.disabled=state==='saving'||state==='saved';b.addEventListener('click',()=>sendFeedback('groq-review','ai-groq-review',helpful));row.append(b);}
  const note=element('span',state?t(state==='saved'?'thanks':state==='saving'?'saving':'feedbackError'):'','feedback-status');note.setAttribute('role','status');row.append(note);panel.append(row);
}
translate();
(() => {
    const statsElement = document.getElementById('visitorStats');
    if (!statsElement) return;

    let visitorId;

    try {
        visitorId = localStorage.getItem('doctor-visitor-id');

        const validId =
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!validId.test(visitorId || '')) {
            visitorId = crypto.randomUUID();
            localStorage.setItem('doctor-visitor-id', visitorId);
        }
    } catch {
        // Если хранение запрещено, не создаём ложные посещения.
        statsElement.hidden = true;
        return;
    }

    let latestStats = null;
    let pending = false;

    function renderVisitorStats() {
        const ru = document.documentElement.lang !== 'en';

        const online = latestStats?.online ?? '—';
        const today = latestStats?.today ?? '—';

        statsElement.textContent = ru
            ? `Сейчас на сайте: ${online} · Посетителей сегодня: ${today}`
            : `On site now: ${online} · Visitors today: ${today}`;

        statsElement.title = ru
            ? 'Сейчас — активные вкладки за последние 60 секунд. Посетители — уникальные браузеры, включая твой. День: 00:00–24:00 по Алматы. Это не число проверок кода.'
            : 'Now: active tabs within 60 seconds. Visitors: unique browsers, including yours. Day: midnight to midnight, Asia/Almaty. Not the number of analyses.';
    }

    async function updatePresence() {
        if (document.hidden || pending) return;

        pending = true;

        try {
            const response = await fetch('/api/presence', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ visitorId }),
                signal: AbortSignal.timeout(8000)
            });

            if (!response.ok) throw new Error('Stats unavailable');

            const data = await response.json();

            if (
                !Number.isInteger(data.online) ||
                !Number.isInteger(data.today)
            ) {
                throw new Error('Invalid stats');
            }

            latestStats = data;
        } catch {
            latestStats = null;
        } finally {
            pending = false;
            renderVisitorStats();
        }
    }

    document
        .getElementById('languageSelect')
        .addEventListener('change', renderVisitorStats);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) updatePresence();
    });

    renderVisitorStats();
    updatePresence();

    setInterval(updatePresence, 20_000);
})();
