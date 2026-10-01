(() => {
 const $=id=>document.getElementById(id);let user=null,register=false,busy=false;
 const ru=()=>document.documentElement.lang!=='en';
 const t=(a,b)=>ru()?a:b;
 async function request(url,body){const response=await fetch('/api/auth/'+url,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok)throw new Error(result.message||t('Ошибка запроса','Request failed'));return result;}
 function draw(){
  $('pricingLink').textContent=t('Тарифы','Pricing');$('pricingTitle').textContent=t('Тарифы','Pricing');
  $('pricingIntro').textContent=t('Обычная проверка Luau — бесплатно. Платные пакеты ИИ готовятся к запуску.','Standard Luau checks are free. Paid AI packs are preparing to launch.');
  $('pricingNote').textContent=t('Сейчас ИИ доступен бесплатно в тестовом режиме в пределах мощности сервиса и лимитов провайдера. Оплата пакетов пока недоступна. После запуска: разовая покупка без автопродления, срок — 90 дней с оплаты. Одна проверка — один завершённый ИИ-разбор фрагмента до 50 КБ; ограничения провайдера могут потребовать меньший фрагмент. ИИ может ошибаться и не видит весь проект.','AI is currently free in beta, subject to service capacity and provider limits. Pack purchases are not available yet. Planned terms: one-time purchase, no auto-renewal, valid for 90 days after payment. One check is one completed AI review of a snippet up to 50 KB; provider limits may require smaller snippets. AI can be wrong and does not see your entire project.');
  const plans=[['Luau',0,0], [t('Старт','Start'),490,20],[t('Разработчик','Developer'),990,50],[t('Проект','Project'),1790,100]];
  $('planCards').replaceChildren();
  for(const [name,price,count]of plans){const card=document.createElement('article');card.className='plan-card';const h=document.createElement('h3');h.textContent=name;const p=document.createElement('p');p.className='plan-price';p.textContent=price.toLocaleString(ru()?'ru-RU':'en-US')+' ₸';const desc=document.createElement('p');desc.textContent=count?t(`${count} ИИ-проверок: поиск возможных логических проблем, объяснения и предложения исправлений.`,`${count} AI reviews: potential logic issues, explanations and suggested fixes.`):t('Синтаксис и типы Luau, объяснения знакомых ошибок. Без аккаунта. До 50 КБ на запрос.','Luau syntax and types, explanations of known errors. No account required. Up to 50 KB per request.');card.append(h,p,desc);if(count){const note=document.createElement('p');note.textContent=t('Покупка пока недоступна','Purchase not available yet');card.append(note);}else{const a=document.createElement('a');a.href='#codeInput';a.textContent=t('Проверить код','Check code');card.append(a);}$('planCards').append(card);}
  $('accountButton').textContent=user?user.username:t('Войти','Sign in');
  $('accountTitle').textContent=user?t('Мой аккаунт','My account'):register?t('Регистрация','Sign up'):t('Вход','Sign in');
  $('accountForm').hidden=!!user;$('signedIn').hidden=!user;
  $('accountIdentity').textContent=user?user.username:'';
  $('accountInfo').textContent=t('Аккаунт создан. Покупки и баланс проверок ещё не подключены.','Your account is ready. Purchases and check balances are not connected yet.');
  $('logoutButton').textContent=t('Выйти','Sign out');$('usernameLabel').textContent=t('Логин','Username');$('passwordLabel').textContent=t('Пароль','Password');
  $('usernameHint').textContent=t('3–24 латинских буквы, цифры или _.','3–24 Latin letters, digits or _.');
  $('passwordHint').textContent=t('От 12 символов. Сохрани пароль: восстановление пока не подключено. Не используй пароль Roblox.','At least 12 characters. Save your password: recovery is not available yet. Do not use your Roblox password.');
  $('accountSubmit').textContent=register?t('Создать аккаунт','Create account'):t('Войти','Sign in');
  $('accountSwitch').textContent=register?t('Уже есть аккаунт','Already registered'):t('Создать аккаунт','Create account');
  $('accountPassword').autocomplete=register?'new-password':'current-password';
  $('accountClose').ariaLabel=t('Закрыть','Close');
 }
 function lock(value){busy=value;for(const el of $('accountForm').elements)el.disabled=value;$('logoutButton').disabled=value;}
 $('accountButton').onclick=()=>{$('accountStatus').textContent='';draw();$('accountDialog').showModal();};
 $('accountClose').onclick=()=>$('accountDialog').close();
 $('accountDialog').addEventListener('close',()=>{$('accountPassword').value='';});
 $('accountSwitch').onclick=()=>{register=!register;$('accountStatus').textContent='';draw();};
 $('accountForm').onsubmit=async e=>{e.preventDefault();if(busy)return;lock(true);$('accountStatus').textContent=t('Подожди…','Please wait…');try{const data=await request(register?'register':'login',{username:$('accountUsername').value,password:$('accountPassword').value});user=data.user;$('accountPassword').value='';$('accountStatus').textContent='';draw();}catch(e){$('accountStatus').textContent=e.name==='TimeoutError'?t('Время ожидания истекло. Попробуй войти.','Timed out. Try signing in.'):e.message;}finally{lock(false);}};
 $('logoutButton').onclick=async()=>{if(busy)return;lock(true);try{await request('logout',{});user=null;draw();$('accountStatus').textContent='';}catch(e){$('accountStatus').textContent=e.message;}finally{lock(false);}};
 new MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 draw();request('me').then(data=>{user=data.user;draw();}).catch(()=>{});
})();
