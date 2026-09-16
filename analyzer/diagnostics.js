// Ten diagnostic families. These are not a measured popularity ranking.
export const advice = {
 'type-mismatch': ['Несовместимые типы','Значение не соответствует ожидаемому типу.','Сопоставь значение с типом переменной или параметра. Исправь то, что не соответствует задумке.','Type mismatch','A value does not match its expected type.','Compare the value with the variable or parameter type and correct the unintended part.'],
 'unknown-global': ['Неизвестная переменная','Анализатор не нашёл объявление используемого глобального имени.','Проверь опечатки и область видимости. Переменная, объявленная внутри if или функции, снаружи недоступна.','Unknown global','The analyzer cannot find a declaration for this global name.','Check spelling and scope. A local declared inside an if block or function is unavailable outside it.'],
 'syntax': ['Ошибка синтаксиса','Анализатор не смог разобрать структуру кода.','Проверь указанную строку и предыдущую: скобки, кавычки, then и end. Исправляй первую синтаксическую ошибку, затем запускай анализ снова.','Syntax error','The analyzer could not parse the code structure.','Check this line and the preceding one for brackets, quotes, then and end. Fix the first syntax error and analyze again.'],
 'possibly-nil': ['Значение может отсутствовать','В этом месте значение может оказаться nil.','Перед обращением к объекту проверь, что он существует. Учитывай загрузку и удаление персонажа; не скрывай проблему приведением к any.','Possibly nil','This value may be nil here.','Check that the object exists before accessing it. Account for character creation and removal; do not hide the issue with an any cast.'],
 'not-callable': ['Значение нельзя вызвать','Код пытается вызвать значение, которое анализатор не считает функцией.','Проверь, что стоит перед скобками вызова. Возможно, имя функции было перезаписано другим значением.','Value is not callable','The code calls a value the analyzer does not consider a function.','Check the value before the call parentheses. A function name may have been overwritten.'],
 'unknown-property': ['Неизвестное поле или свойство','У определённого анализатором типа не найдено указанное поле.','Проверь имя поля и тип объекта. Объекты конкретной игры могут быть неизвестны анализатору без описания структуры проекта.','Unknown property','The inferred type does not contain this property.','Check the property name and object type. Game-specific instances may be unknown without a project structure description.'],
 'unused-local': ['Переменная не используется','Локальная переменная объявлена, но её значение не используется.','Проверь, не забыл ли ты использовать переменную. Удаляя объявление, не удаляй нужный вызов функции с побочным действием.','Unused local','A local variable is declared but its value is unused.','Check whether you forgot to use the variable. Preserve any required side effects when removing its declaration.'],
 'unused-function': ['Функция не используется','Объявленная локальная функция не используется в проверяемом коде.','Проверь, передана ли функция обработчику события или вызывается ли она. Удали её, только если она действительно не нужна.','Unused function','A declared local function is unused in the analyzed code.','Check whether the function should be called or connected to an event. Remove it only if unnecessary.'],
 'deprecated': ['Устаревший API','Анализатор отметил использование устаревшего API.','Проверь рекомендуемую замену в документации Roblox. Перед заменой сравни поведение и аргументы.','Deprecated API','The analyzer flagged a deprecated API.','Check the recommended replacement in Roblox documentation and compare its behavior and arguments.'],
 'unreachable': ['Недостижимый код','Анализатор обнаружил участок, до которого выполнение не доходит.','Проверь return, break и другие переходы перед этой строкой. Возможно, нужное действие стоит перенести до выхода.','Unreachable code','The analyzer found code that execution cannot reach.','Check preceding returns, breaks and control flow. A required action may belong before the exit.']
};
export function descriptionFor(id) {
 const a=advice[id];
 return {ruleId:id,ru:{title:a[0],explanation:a[1],recommendation:a[2]},en:{title:a[3],explanation:a[4],recommendation:a[5]}};
}
export function explainDiagnostic(category, message) {
 let id=null;
 const mismatch=message.match(/^Expected this to be '([^']+)', but got '([^']+)'$/);
 const unknown=message.match(/^Unknown global '([^']+)'(?:; consider assigning to it first)?$/);
 if(category==='SyntaxError')id='syntax';
 else if(category==='TypeError' && mismatch)id='type-mismatch';
 else if(unknown || category==='UnknownGlobal')id='unknown-global';
 else if(category==='TypeError' && /^(?:Value of type .+ could be nil|.* is possibly ['"]?nil['"]?)\.?$/.test(message))id='possibly-nil';
 else if(category==='TypeError' && /^Cannot call (?:a value|non-function)/.test(message))id='not-callable';
 else if(category==='TypeError' && /^(?:Key .+ not found in table|Type .+ does not have key|Unknown property)/.test(message))id='unknown-property';
 else if(category==='LocalUnused')id='unused-local';
 else if(category==='FunctionUnused')id='unused-function';
 else if(['DeprecatedGlobal','DeprecatedApi'].includes(category))id='deprecated';
 else if(category==='UnreachableCode')id='unreachable';
 if(!id)return {ruleId:category,ru:{title:category==='TypeError'?'Ошибка типа':category,explanation:message,recommendation:''},en:{title:category,explanation:message,recommendation:''}};
 const d=descriptionFor(id);d.en.explanation=message;
 if(mismatch && id==='type-mismatch')d.ru.explanation=`Ожидался тип «${mismatch[1]}», получен «${mismatch[2]}».`;
 if(unknown && id==='unknown-global') {
  const name=unknown[1];d.ru.explanation=`Анализатор не нашёл объявление имени «${name}».`;
  if(['game','workspace','script','task','Instance','Enum','Vector2','Vector3','CFrame','Color3','UDim','UDim2','Random','Ray','TweenInfo'].includes(name)) {
   d.ru.recommendation='Это имя относится к окружению Roblox. Проверь подключение определений Roblox; не объявляй подменяющую переменную только ради исчезновения ошибки.';
   d.en.recommendation='This is a Roblox environment name. Check Roblox definitions rather than declaring a replacement variable merely to suppress the diagnostic.';
  }
 }
 if(id==='syntax') {
  const expected=message.match(/^Expected (.+?), got (.+)$/);
  if(expected)d.ru.explanation=`Ожидалось: ${expected[1]}. Найдено: ${expected[2]}.`;
  if(/got ['"]==['"]/.test(message))d.ru.recommendation='Если здесь присваивание, используй один знак =. Два знака == нужны для сравнения. Затем повтори анализ: часть следующих ошибок может исчезнуть.';
 }
 return d;
}
