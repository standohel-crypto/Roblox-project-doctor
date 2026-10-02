// Run from the project root: node install-legal.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const pagePath=path.join(root,'client','page.html');
for(const name of ['page.html','offer.html','privacy.html']){
 if(!existsSync(path.join(root,'client',name)))throw new Error(`Missing client/${name}. Extract this archive into your project root first.`);
}
let page=readFileSync(pagePath,'utf8');
if(!/<\/footer>/i.test(page))throw new Error('No footer found. File was not changed.');
const before=page;
if(!page.includes('id="doctorLegalLinks"')){
 page=page.replace(/<\/footer>/i,`<nav id="doctorLegalLinks" aria-label="Правовая информация" style="display:flex;flex-wrap:wrap;gap:12px"><a href="/offer.html">Публичная оферта</a><a href="/privacy.html">Политика конфиденциальности</a></nav></footer>`);
}
if(!page.includes('id="doctorLegalAnalysis"')){
 page=page.replace(/(<form\b[^>]*\bid=["']userForm["'][^>]*>)/i,`<p id="doctorLegalAnalysis" style="padding:0 18px;font-size:12px;color:var(--editor-text)">Отправляя код, вы принимаете <a style="color:inherit;text-decoration:underline" href="/offer.html" target="_blank" rel="noopener">условия услуги</a>. <a style="color:inherit;text-decoration:underline" href="/privacy.html" target="_blank" rel="noopener">Как обрабатываются данные</a>.</p>$1`);
}
if(!page.includes('id="doctorLegalAccount"')){
 page=page.replace(/(<div\b[^>]*\bid=["']signedOut["'][^>]*>)/i,`$1<p id="doctorLegalAccount" class="small"><a href="/offer.html" target="_blank" rel="noopener">Условия сервиса</a> · <a href="/privacy.html" target="_blank" rel="noopener">Политика конфиденциальности</a></p>`);
}
if(page!==before){
 const backup=path.join(root,'page-before-legal.html.bak');
 if(!existsSync(backup))writeFileSync(backup,before);
 writeFileSync(pagePath,page);
}
console.log('Done: legal links added to client/page.html. Pages: /offer.html and /privacy.html');
