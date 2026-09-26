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
// Match known message families; preserve the complete original for all others.
const extraAdvice = {
 'shadowed-local': ['Переменная скрывает другое объявление', 'В этой области создана переменная с уже используемым именем.', 'Если нужно изменить внешнюю переменную, убери local. Если нужна отдельная — дай ей другое имя.'],
 'duplicate': ['Повторяющееся объявление', 'Анализатор обнаружил повторяющееся имя или ключ.', 'Проверь повтор: он может заменять прежнее значение.'],
 'implicit-return': ['Не все пути возвращают значение', 'Часть веток функции завершается без возвращаемого значения.', 'Проверь, что должна возвращать каждая ветка, включая случай невыполненного условия.'],
 'unbalanced-assignment': ['Количество переменных и значений различается', 'Число значений в присваивании не совпадает с числом переменных.', 'Проверь порядок значений: недостающие становятся nil, лишние отбрасываются. Учитывай несколько результатов функции.'],
 'format': ['Проверь строку формата', 'Анализатор обнаружил проблему в строке формата или её аргументах.', 'Сопоставь спецификаторы, например %s и %d, с переданными аргументами.'],
 'read-keyword': ['Недопустимое использование read', 'Ключевое слово read нельзя использовать в этом месте.', 'Проверь указанную строку и контекст объявления типа. read — модификатор доступа в типах; если задумано обычное имя, проверь допустимость такого имени в этой позиции.'],
 'argument-count': ['Неверное количество аргументов', 'Количество аргументов не соответствует сигнатуре функции.', 'Сравни вызов с параметрами функции. Проверь использование точки и двоеточия: двоеточие дополнительно передаёт self.'],
 'operator': ['Операция не подходит для этих типов', 'Анализатор не может применить оператор к указанным значениям.', 'Проверь типы обоих операндов и сам оператор. Не меняй типы вслепую — сначала проверь задумку.'],
 'unknown-type': ['Неизвестный тип', 'Анализатор не нашёл определение указанного типа.', 'Проверь имя типа, его объявление и импорт. Типы из других модулей требуют контекста проекта.']
};
const categoryRules = {
 LocalUnused:'unused-local', FunctionUnused:'unused-function', ImportUnused:'unused-local',
 LocalShadow:'shadowed-local', DuplicateLocal:'duplicate',
 ImplicitReturn:'implicit-return', UnbalancedAssignment:'unbalanced-assignment',
 FormatString:'format', DeprecatedGlobal:'deprecated', DeprecatedApi:'deprecated',
 UnreachableCode:'unreachable', UnknownGlobal:'unknown-global'
};
export function explainDiagnostic(category, message) {
 const compact=message.replace(/\s+/g,' ').trim();
 const mismatch=compact.match(/^Expected this to be ['"](.+?)['"],? but got ['"](.+?)['"](?:[.;]|$)/)
   || compact.match(/^Type ['"](.+?)['"] could not be converted into ['"](.+?)['"](?:[.;]|$)/);
 const conversion=compact.startsWith('Type ');
 const unknown=compact.match(/^Unknown global ['"]([^'"]+)['"]/);
 let id=categoryRules[category] || null;
 if(category==='SyntaxError')id='syntax';
 else if(category==='TypeError') {
  if(/^read keyword is illegal here\.?$/.test(compact))id='read-keyword';
  else if(mismatch || /^Expected this to be\b/.test(compact))id='type-mismatch';
  else if(/could be nil|is possibly ['"]?nil|optional value/.test(compact))id='possibly-nil';
  else if(/^Cannot call (?:a value|non-function)|^Cannot call a value of the union type/.test(compact))id='not-callable';
  else if(/^(?:Key .+ not found in table|Type .+ does not have key|Unknown property)/.test(compact))id='unknown-property';
  else if(/^Unknown type/.test(compact))id='unknown-type';
  else if(/^Argument count mismatch|^Expected \d+ arguments?|^Function only returns/.test(compact))id='argument-count';
  else if(/^Operator |^Types? .+ (?:cannot be compared|does not have|do not have) .*overload/.test(compact))id='operator';
 }
 if(unknown)id='unknown-global';
 if(!id) return {
  ruleId:category,
  ru:{title:category==='TypeError'?'Ошибка типа':'Сообщение анализатора',
   explanation:category==='TypeError'?'Анализатор обнаружил проблему с типами. Для этой формулировки пока нет точного перевода.':'Для этой формулировки пока нет точного перевода.',
   recommendation:'Открой «Оригинал анализатора»: там сохранено полное сообщение. Проверь указанную строку и контекст.',untranslated:true},
  en:{title:category,explanation:message,recommendation:''}
 };
 let d;
 if(advice[id])d=descriptionFor(id);
 else {const a=extraAdvice[id];d={ruleId:id,ru:{title:a[0],explanation:a[1],recommendation:a[2]},en:{title:category,explanation:message,recommendation:''}};}
 d.en.explanation=message;
 if(mismatch && id==='type-mismatch')d.ru.explanation=`Ожидался тип «${mismatch[conversion?2:1]}», получен «${mismatch[conversion?1:2]}».`;
 if(unknown) {
  const name=unknown[1];d.ru.explanation=`Анализатор не нашёл объявление имени «${name}».`;
  if(['game','workspace','script','task','Instance','Enum','Vector2','Vector3','CFrame','Color3','UDim','UDim2','Random','Ray','TweenInfo'].includes(name)) {
   d.ru.recommendation='Это имя относится к окружению Roblox. Проверь подключение определений Roblox; не объявляй подменяющую переменную только ради исчезновения ошибки.';
   d.en.recommendation='Check Roblox environment definitions rather than declaring a replacement variable.';
  }
 }
 if(id==='syntax') {
  const expected=compact.match(/^Expected (.+?), got (.+)$/);
  if(expected)d.ru.explanation=`Ожидалось: ${expected[1]}. Найдено: ${expected[2]}.`;
  const closing=compact.match(/^Expected ['"](end|[)}\]])['"] \(to close (.+?)\), got (.+)$/);
  if(closing)d.ru.explanation=`Не хватает «${closing[1]}», чтобы закрыть ${closing[2]}. Найдено: ${closing[3]}.`;
  if(/Incomplete statement/.test(compact))d.ru.explanation='Незавершённая инструкция: здесь ожидается присваивание или вызов функции.';
  if(/got ['"]==['"]/.test(compact))d.ru.recommendation='Если здесь присваивание, используй один знак =. Два знака == нужны для сравнения. Затем повтори анализ.';
 }
 const named=compact.match(/^(?:Local |Global )?(?:Variable|Function|variable|function) ['"]([^'"]+)['"]/);
 if(named && ['unused-local','unused-function'].includes(id))d.ru.explanation=`${id==='unused-function'?'Функция':'Переменная'} «${named[1]}» объявлена, но не используется.`;
 if(id==='unknown-type') {const m=compact.match(/^Unknown type ['"]([^'"]+)['"]/);if(m)d.ru.explanation=`Тип «${m[1]}» не найден анализатором.`;}
 return d;
}
