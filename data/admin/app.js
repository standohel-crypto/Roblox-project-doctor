'use strict';
const $=id=>document.getElementById(id);
function node(tag,text){const n=document.createElement(tag);n.textContent=text;return n;}
function table(id,headers,rows){
  const host=$(id);host.replaceChildren();
  if(!rows.length){const p=node('p','За этот период данных нет.');p.className='empty';host.append(p);return;}
  const t=document.createElement('table'), head=document.createElement('thead'), h=document.createElement('tr');
  headers.forEach(x=>h.append(node('th',x)));head.append(h);t.append(head);
  const body=document.createElement('tbody');for(const row of rows){const tr=document.createElement('tr');row.forEach(x=>tr.append(node('td',x)));body.append(tr);}t.append(body);host.append(t);
}
const date=value=>new Date(value).toLocaleString('ru-RU',{timeZone:'Asia/Almaty'});
async function refresh(){
  $('refresh').disabled=true;$('days').disabled=true;$('status').textContent='Обновляем…';
  try{
    const response=await fetch(`/admin/stats?days=${$('days').value}`,{cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error(response.status===401?'Нужно войти заново. Обнови страницу.':'Не удалось загрузить статистику. Проверь подключение базы на Render.');
    const data=await response.json();$('metrics').replaceChildren();
    const votes=data.votes.yes+data.votes.no;
    for(const [label,value] of [['Сейчас на сайте · 60 сек',data.visits.online],['Посетителей сегодня',data.visits.today],['Посетителей за период',data.visits.visitors],['Совет помог / не помог',`${data.votes.yes} / ${data.votes.no}`],['Доля «помог»',votes?`${Math.round(data.votes.yes/votes*100)}%`:'Нет голосов']]){
      const card=document.createElement('div');card.className='metric';card.append(node('span',label),node('strong',value));$('metrics').append(card);
    }
    table('runs',['Проверка','Запущено','Завершено','Сбой','Прервано','В работе','Среднее время'],['luau','ai'].map(kind=>{const r=data.runs.find(x=>x.kind===kind);return [kind==='luau'?'Luau':'ИИ',r?.total??0,r?.done??0,r?.failed??0,r?.interrupted??0,r?.running??0,r?.avg_ms!=null?`${(r.avg_ms/1000).toFixed(1)} с`:'—'];}));
    table('rules',['Правило / совет','Да','Нет'],data.rules.map(r=>[r.rule_id,r.yes,r.no]));
    table('daily',['Дата','Уникальных браузеров'],data.daily.map(r=>[r.day,r.visitors]));
    table('recent',['Когда · Алматы','Правило','Помог?','Язык'],data.recent.map(r=>[date(r.created_at),r.rule_id,r.helpful?'Да':'Нет',r.language]));
    $('updated').textContent=`Обновлено: ${date(data.generatedAt)}`;$('content').hidden=false;$('status').textContent='';
  }catch(error){$('status').textContent=error.name==='TimeoutError'?'База не ответила вовремя. Нажми «Обновить».':error.message;}
  finally{$('refresh').disabled=false;$('days').disabled=false;}
}
$('refresh').addEventListener('click',refresh);$('days').addEventListener('change',refresh);refresh();
