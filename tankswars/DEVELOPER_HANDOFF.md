# Tanks Wars: документация для передачи разработки

Этот документ написан для новой команды разработки. Цель - быстро объяснить, как устроен проект, где искать нужную логику и как менять код без случайной поломки соседних систем.

Проект простой технически, но держится на большом общем состоянии. Главная опасность при доработках - изменить глобальную переменную или CSV-поле и не заметить, что оно используется в другом экране.

## 1. Главная модель проекта

Tanks Wars - статическое браузерное приложение. Сборщика, модулей, импортов и backend здесь нет.

`index.html` подключает скрипты строго по порядку:

1. `js/00-state.js`
2. `js/01-data.js`
3. `js/02-hangar-tech-tree.js`
4. `js/03-events-store-profile.js`
5. `js/04-ui-developer.js`
6. `js/05-battle-maps.js`
7. `js/06-battle-logic.js`
8. `js/07-battle-render.js`
9. `js/08-startup.js`

Все функции и переменные живут в общей глобальной области. Поэтому порядок подключения критичен: поздние файлы используют функции и переменные из ранних файлов.

## 2. Правило чтения кода

Если нужно понять пользовательский сценарий, читать так:

- запуск игры: `08-startup.js` -> `01-data.js` -> `04-ui-developer.js`;
- ангар: `02-hangar-tech-tree.js` + `04-ui-developer.js`;
- магазин/профиль/события: `03-events-store-profile.js`;
- бой: `08-startup.js` -> `06-battle-logic.js` -> `07-battle-render.js`;
- карты: `05-battle-maps.js`;
- данные танков: `01-data.js` + `data.csv`.

Если что-то сломалось визуально, сначала смотреть `css/styles.css` и `07-battle-render.js`.

Если что-то сломалось в правилах игры, сначала смотреть `06-battle-logic.js`.

Если что-то не сохраняется, сначала смотреть `01-data.js`.

## 3. DOM-каркас `index.html`

`index.html` содержит только основу интерфейса:

- `#game` - корневой контейнер игры.
- `#topBar` - верхняя панель ресурсов и кнопки боя.
- `#sideButtons` - вертикальное меню экранов.
- `#statsPanel` - характеристики выбранного танка.
- `#tankBar` - нижняя лента танков.
- `#hangarTank` - большое изображение танка в ангаре.
- `#screenOverlay` и `#overlayContent` - модальные/полноэкранные экраны.
- `#battleView` - слой боя.
- `#battleCanvas` - canvas, на котором рисуется бой.
- `#battleAmmoPanel` - выбор снарядов.
- `#reloadIndicator` - индикатор перезарядки у курсора.
- `#battleResult` - панель победы/поражения.
- `#battleBackButton` - выход из боя.

Новые экраны обычно не добавляются в HTML. Их создают JS-функции и вставляют в `overlayContent`.

## 4. Глобальное состояние `js/00-state.js`

Этот файл ничего не рисует и почти ничего не делает сам. Он объявляет все основные переменные, DOM-ссылки и константы.

### DOM-ссылки

В начале файла выбираются элементы через `document.querySelector`. Остальной код использует эти переменные напрямую:

- `game`, `topBar`, `sideButtons`, `statsPanel`, `tankBar`, `hangarTank`;
- `screenOverlay`, `overlayContent`, `backButton`;
- `battleView`, `battleCanvas`, `battleAmmoPanel`, `reloadIndicator`, `battleResult`, `battleBackButton`;
- `battleContext` - 2D-контекст canvas.

Если поменять `id` в HTML, нужно поменять его здесь.

### Константы экономики и событий

- `containerTankDropChance` - шанс танка из контейнера.
- `containerGoldPrice` - цена контейнера.
- `containerPrizeCount` - число ресурсных призов.
- `duplicateTankGoldReward` - компенсация за дубль танка.
- `adGoldReward` - награда за рекламу.
- `victoryDayEvent` - настройки события 7-15 мая.
- `developerModeKey` - код включения developer mode.

### Константы боя

- `projectileSpeed` - скорость обычного снаряда.
- `baseCaptureDuration` - базовое время захвата базы.
- `warPointCaptureDuration` - время захвата точки в режиме войны.
- `baseCaptureTankMultiplier` - ускорение захвата несколькими танками.
- `movementStepPixels` - базовая величина для пересчета скорости из CSV.

### `battleModes`

Массив режимов боя. У каждого режима есть:

- `id` - машинный ключ;
- `title` - текст в UI;
- `size` - размер команды;
- `image` - картинка режима;
- `description` - описание.

Сейчас есть `company`, `platoon`, `duel`, `commander`, `war`.

### `playerResources`, `playerProfile`, `playerStats`

Эти объекты держат ресурсы, профиль и статистику игрока. Загружаются и сохраняются в `01-data.js`.

### Основные выбранные значения

- `selectedTank` - текущий танк в ангаре и для старта боя.
- `loadedTanks` - танки из `data.csv`.
- `developerModeEnabled` - включен ли developer mode.
- `selectedBattleMode` - выбранный режим боя.
- `selectedTechTreeNation` - выбранная нация дерева.
- `gameSettings` - текущие настройки.

### `battleState`

Главный объект боя. В нем хранится все, что нужно боевому циклу:

- активен ли бой;
- размеры карты;
- игрок, союзники, враги;
- снаряды;
- камера;
- мышь и курсор;
- выбранный снаряд;
- состояние списков команд и артиллерийского вида;
- статистика боя;
- состояние базы;
- состояние режима войны;
- обучение;
- камни, детали карты, реки.

Почти весь `06-battle-logic.js` меняет `battleState`.

### `fallbackTanks`

Минимальный набор танков, если `data.csv` не загрузился. Если тестер видит только несколько стартовых танков, значит CSV не был загружен.

## 5. Данные и сохранение `js/01-data.js`

Этот файл отвечает за:

- фон;
- localStorage/cookie;
- профиль;
- статистику;
- настройки;
- ресурсы;
- парсинг CSV;
- нормализацию чисел;
- загрузку танков.

### Сохранение

`setCookie(name, value)` сначала пишет в `localStorage`, потом дублирует в `document.cookie`.

`getCookie(name)` сначала читает `localStorage`, потом cookie. Это сделано для совместимости.

Не нужно добавлять новый способ хранения, пока нет веской причины. Новые простые поля лучше сохранять через эти функции.

### Нормализация чисел

- `normalizeNumber(value)` возвращает положительное целое или `0`.
- `normalizePositiveFloat(value)` возвращает положительное дробное число или `0`; поддерживает запятую как десятичный разделитель.
- `clampNumber(value, min, max)` ограничивает число диапазоном.
- `toEightDigits(value)` хранит опыт как строку из 8 цифр.

Важно: `normalizeNumber` отбрасывает отрицательные и дробную часть. Если нужны дроби, использовать `normalizePositiveFloat`.

### Профиль и статистика

- `loadPlayerProfile()` читает имя и ID; если ID плохой, создает новый 16-значный.
- `savePlayerProfile()` сохраняет профиль.
- `loadPlayerStats()` читает общую статистику и приводит числа к нормальному виду.
- `savePlayerStats()` сохраняет статистику.

### Настройки

- `loadGameSettings()` читает настройки и сливает их с `defaultGameSettings`.
- `saveGameSettings()` сохраняет.
- `applyGameSettings()` применяет CSS-фильтры и масштаб UI.
- `isFullscreenActive()` проверяет fullscreen.

### Состояние танков

- `getTankExperienceCookieName(tank)` - ключ опыта.
- `getTankStateCookieName(tank)` - ключ состояния.
- `getDefaultTankState(tank)` - дефолтное состояние: МС-1 всегда доступен, танки 1 уровня обычно открыты.
- `applyStoredTankExperience(tanks)` накладывает сохраненный опыт и состояние на список танков.

Состояния:

- `0` - закрыт;
- `1` - исследован;
- `2` - куплен/доступен.

### CSV

`parseCsvLine(line)` - простой CSV-парсер с поддержкой кавычек.

`parseTankRows(csvText)` превращает строки CSV в объекты танков. Именно здесь задаются поля:

- `name`, `level`, `nation`, `className`;
- `health`, `reloadTime`, `movementDelay`, `hullTurnDelay`;
- `penetration`, `averageArmor`, `penetrationChance`;
- `gunType`, `shellsPerShot`, `clipSize`, `gunSpreadDegrees`;
- `shells`;
- `researchTargets`, `researchParents`;
- `techTreeEligible`, `futureTank`, `containerEligible`, `premium`, `botEligible`.

Колонка `AD` сейчас имеет важные значения:

- `0` - будущий танк, не должен выбираться ботами;
- `1` - обычная техника дерева;
- `2` - премиум/контейнерная техника.

Если добавляете колонку в CSV, менять нужно `parseTankRows` и документацию.

### Загрузка

`loadTankRows()` делает `fetch("./data.csv", { cache: "no-store" })`. Если загрузка не удалась, возвращает `fallbackTanks`.

Для нормальной загрузки нужен HTTP-сервер, не `file://`.

## 6. Ангар и дерево `js/02-hangar-tech-tree.js`

Этот файл отвечает за выбранный танк, нижнюю ленту, карточки техники, дерево исследований и экран улучшений.

### Выбор и карточки

- `selectTankCard(card, tank)` меняет выделение карточек и выбирает танк.
- `createHangarTankStat(label, value)` создает одну строку характеристики.
- `renderHangarTankStats(tank)` перерисовывает панель характеристик.
- `selectTank(tank)` выбирает танк, обновляет статы, картинку, top bar.
- `setTankImage(image, tankName)` выставляет картинку танка.
- `createTankCard(tank, selected, onSelect)` делает карточку в нижней ленте.
- `renderTankBar(tanks)` сортирует и рисует нижнюю ленту.
- `createTankSlot(tank, selected, onSelect)` делает универсальный слот танка для других экранов.

Если танк не отображается в ангаре, смотреть `setTankImage`, имя файла в `img/` и поле `name` в CSV.

### Поиск танков и сохранение

- `normalizeTankName(value)` приводит имя к удобному виду для сравнения.
- `findLoadedTankByReference(tank)` ищет реальный объект танка из `loadedTanks`.
- `findResearchTarget(value)` ищет цель исследования.
- `getResearchPrice(targetTank)` возвращает цену исследования.
- `saveTankExperience`, `saveTankState`, `savePlayerResources` сохраняют изменения.

### Исследование и покупка

`selectTankFromUpgrade(tank)` обрабатывает клик по танку на экране улучшений:

- если танк закрыт, пытается исследовать за опыт;
- если исследован, пытается купить за серебро;
- если доступен, выбирает его.

Важно: опыт списывается с текущего выбранного танка, серебро - из общих ресурсов.

### Дерево наций

- `techTreeNationConfigs` - список наций, их метки и фоновые картинки.
- `getTechTreeTanks(nation)` выбирает танки по нации и `techTreeEligible`.
- `addTechTreeEdge*` строит связи между танками.
- `addManualTechTreeEdges` добавляет ручные связи для СССР.
- `buildTechTreeLayout(nation)` рассчитывает позиции узлов дерева.
- `renderTechTreeLines(svg, edges)` рисует линии.
- `createTechTreeNode(item)` делает узел дерева.
- `renderNationTechTreeScreen()` открывает экран дерева.

Если линии дерева съехали, смотреть `buildTechTreeLayout`, `renderTechTreeLines`, CSS классы `techTree*`.

### Экран улучшений

- `renderUpgradeScreen()` рисует выбранный танк и цели исследования.
- `drawUpgradeLines(screen)` рисует линии между текущим танком и целями.
- `rerenderUpgradeScreen()` обновляет экран, если он открыт.

## 7. События, магазин и профиль `js/03-events-store-profile.js`

### Событие

- `victoryDayEventIsActive(date)` проверяет дату 7-15 мая.
- `victoryDayEventModeIsEligible(mode)` проверяет режимы `commander` и `war`.
- `getVictoryDayEventWins`, `setVictoryDayEventWins` читают/пишут прогресс.
- `claimVictoryDayEventReward()` выдает наградной танк.
- `recordVictoryDayEventProgress(result)` добавляет победу после боя.
- `renderEventsScreen()` рисует экран события.

Если событие "не работает", проверить дату браузера, `victoryDayEvent` в `00-state.js` и выбранный режим.

### Магазин

- `getContainerTankPool()` возвращает танки для контейнера.
- `getPremiumStoreTanks()` возвращает премиум-танки.
- `buyPremiumTank(tank, currency, button)` покупает танк за золото или чертежи.
- `createPremiumStoreItem`, `createPremiumStorePanel` рисуют премиум-магазин.
- `createContainerResourceReward()` создает ресурсный приз.
- `openContainer(button)` списывает золото и выдает награду.
- `renderStoreScreen()` рисует магазин.

Контейнер:

- цена берется из `containerGoldPrice`;
- шанс танка - `containerTankDropChance`;
- если выпал уже купленный танк, добавляется `duplicateTankGoldReward`.

### Реклама и SDK

- `isYandexGamesServer()` проверяет, похож ли хост на Яндекс Игры.
- `initializeYandexGamesSdk()` подключает SDK, если игра на нужном домене.
- `showRewardedGoldAd(button)` пытается показать rewarded video.

В локальной разработке реклама должна корректно падать в безопасную ошибку, не ломая игру.

### Профиль

- `getProfileSummary()` собирает сводку по игроку.
- `getPlayerRank(summary)` рассчитывает ранг.
- `getProfileMedals(summary)` возвращает медали и условия.
- `createProfileTankRow(tank)` рисует строку танка.
- `renderProfileScreen()` рисует профиль.

Имя игрока сохраняется через `savePlayerProfile()`.

## 8. UI, настройки и developer mode `js/04-ui-developer.js`

### Режимы боя

- `getBattleModeSchedule(mode)` возвращает расписание для режимов события.
- `battleModeIsAvailable(mode)` проверяет, доступен ли режим сейчас.
- `getAvailableBattleMode(fallback)` выбирает доступный режим.
- `renderBattleModeScreen()` рисует экран выбора режима.

Сейчас `commander` и `war` завязаны на дату события.

### Настройки

- `settingsControls` - слайдеры: яркость, контраст, насыщенность, масштаб UI.
- `settingsToggles` - чекбоксы: HP, маркеры, КД, панель результата, fullscreen.
- `normalizeGameSettings()` приводит настройки к допустимым значениям.
- `createSettingsItem`, `createSettingsToggle` создают UI.
- `renderSettingsScreen()` рисует экран.
- `syncFullscreenSetting()` синхронизирует checkbox с реальным fullscreen.

### Оверлеи

- `openOverlay(screenName)` открывает нужный экран.
- `closeOverlay()` закрывает экран и возвращает ангар.

Если добавляете новый боковой экран:

1. Добавить кнопку в `sideButtonIcons` в `00-state.js`.
2. Добавить обработку `screenName` в `openOverlay`.
3. Написать функцию `render...Screen`.

### Developer mode

Developer mode включается в консоли:

```javascript
dev("ujfgav8b6rvcb75av5tva7sr4av4456w*/va5*4w-bva4/-4gb-w89`7`9y7fhg9a")
```

Команды:

- `id = 2` - выбрать id танка для операций.
- `tank` - получить текущий выбранный объект developer mode.
- `tankInfo()` - вывести таблицу по танку.
- `tankById(2)` - выбрать и вывести танк.
- `state = 2` - изменить состояние танка.
- `experience = 1500` - изменить опыт танка.
- `gold = 999`, `silver = 100000`, `blueprints = 25` - изменить ресурсы.

Функции:

- `findTankById`;
- `getDeveloperTankData`;
- `logDeveloperTank`;
- `refreshSelectedTank`;
- `refreshDeveloperChanges`;
- `setDeveloperResource`;
- `setDeveloperTankValue`;
- `enableDeveloperMode`.

### Top bar и боковые кнопки

В файле есть два определения `renderTopBar()`. Второе перекрывает первое. Это технический долг: при рефакторинге оставить одно определение.

- `createTopSlot` создает ячейку верхней панели.
- `createBattleControlSlot` создает выбор режима и кнопку боя.
- `renderTopBar` рисует ресурсы и бой.
- `renderSideButtons` рисует левое меню.

### Изображения и canvas

- `getBattleImage(path, fallbackPath)` кеширует картинки для боя.
- `resizeBattleCanvas()` подгоняет canvas под размер экрана и devicePixelRatio.

## 9. Карты `js/05-battle-maps.js`

Файл содержит пресеты карт и генераторы деталей.

### Пресеты

- `battleMapPresets` - обычные карты.
- `warBattleMapPresets` - большие карты для режима войны.

У пресета могут быть:

- `width`, `height`;
- цвета земли;
- реки;
- база;
- камни;
- здания;
- детали;
- точки и базы войны;
- специальный объект вроде рейхстага.

### Функции

- `clonePoint(point)` копирует точку.
- `cloneBattleMapPreset(preset)` делает безопасную копию пресета.
- `victoryDayMapIsAvailable(date)` проверяет дату для специальной карты.
- `pickBattleMapPreset()` выбирает карту по текущему режиму.
- `getCurrentMapPreset()` возвращает текущую карту или дефолт.
- `createBattleRocks()` создает камни для столкновений.
- `createBattleMapDetails()` создает декоративные объекты.

Если карта меняется во время боя, это ошибка: пресет должен выбираться в `startBattle()`.

## 10. Боевая логика `js/06-battle-logic.js`

Это самый важный и самый рискованный файл. Он отвечает за правила боя, физику, ботов, урон, захват и награды.

### 10.1 Типы танков и снарядов

- `tankHasRotatingTurret(className)` возвращает false для ПТ, ПТ-САУ, САУ.
- `tankIsWheeled(tank)` проверяет колесные классы.
- `tankIsArtillery(tank)` проверяет САУ или `gunType = 6`.
- `normalizeShellType(value)` приводит тип снаряда к верхнему регистру без пробелов.
- `shellIsFire(shell)` проверяет `ОГОНЬ`/`FIRE`.
- `shellIsGuidedMissile(shell)` проверяет `ПТУР`/`ATGM`.
- `getShellPenetration(tank, shellType)` берет пробитие из данных танка.
- `getTankShells(tank)` собирает 3 слота снарядов для боя.

Если добавляете новый тип снаряда, начать отсюда.

### 10.2 Расчет характеристик

- `getTankHealth` берет HP.
- `getTankReloadTime` считает перезарядку; у огня КД фактически 0.
- `getTankMoveSpeed` считает скорость по `movementDelay`.
- `getTankTurnSpeed` считает поворот корпуса.
- `getTankCamouflage` и `getTankViewRange` нужны для засвета.
- `getBestShell` выбирает самый сильный снаряд.
- `getTankDamagePotential` оценивает опасность цели для ботов.

### 10.3 Засвет

- `canTankSeeTank(observer, target)` проверяет дистанцию обзора с учетом маскировки.
- `updateSpotting()` обновляет `spotted` у всех танков.

Враги рисуются, только если засвечены, кроме специальных случаев вроде САУ.

### 10.4 UI боеприпасов

- `renderBattleAmmoPanel()` рисует снаряды и магазин/залп.
- `selectPlayerShell(index)` меняет выбранный снаряд.
- `playerCanToggleClipFireMode(player)` проверяет режим залпа.
- `togglePlayerClipFireMode()` включает/выключает залп.

### 10.5 Создание боевого танка

`createBattleTank(tank, x, y, angle, isBot, team, nickname)` превращает CSV-танк в боевой объект.

В боевом объекте появляются:

- координаты и угол;
- HP;
- скорость и поворот;
- корпус/башня;
- снаряды;
- перезарядка;
- поля бота;
- изображения корпуса/башни.

Не путать CSV-танк и боевой танк. CSV-танк лежит в поле `battleTank.tank`.

### 10.6 Геометрия и столкновения

Группа функций:

- `normalizeAngle`;
- `rotateAngleToward`;
- `circleIntersectsRect`;
- `createRotatedRect`;
- `getTankCollisionRect`;
- `getRotatedRectCorners`;
- `getRotatedRectBounds`;
- `rangesOverlap`;
- `projectPoints`;
- `getRectAxes`;
- `rotatedRectsIntersect`;
- `circleIntersectsRotatedRect`;
- `rotatedRectTouchesCircle`.

Это база для столкновений танков, зданий, камней и снарядов. Менять осторожно: одна ошибка ломает движение, урон и препятствия.

### 10.7 Препятствия и реки

- `getBuildingCollisionRect(building)` - прямоугольник здания.
- `getRockCollisionRect(rock, index)` - прямоугольник камня.
- `distancePointToSegmentSquared` - расстояние до отрезка реки.
- `circleTouchesRiver` - проверка касания реки.
- `tankIsInRiver` - танк в реке.
- `getTerrainSpeedMultiplier` - замедление в реке.
- `tankCollides` - общий тест столкновений.

### 10.8 Движение игрока

- `moveTank(tank, distance)` двигает обычный танк с проверкой столкновений.
- `updateWheeledSpeed`, `updateWheeledSteering`, `moveWheeledTank` - колесная модель.
- `updatePlayerTank(delta)` читает `pressedKeys`, мышь и обновляет корпус/башню.

Управление мышью использует `battleState.mouse`, который обновляется в `08-startup.js`.

### 10.9 Перезарядка

`updateReloadTimers(delta)` уменьшает таймеры:

- обычный `reloadTimer`;
- поток огня `fireStreamTimer`;
- барабан/магазин;
- дозарядка для `gunType = 3`.

Если орудие стреляет слишком быстро или не стреляет, смотреть сюда и `tankCanFire`.

### 10.10 Боты

Ключевые функции:

- `getEnemyTanksFor(bot)` - враги для бота.
- `getMostDangerousTarget(bot)` - выбор цели.
- `getCoverPointFromTarget` - точка укрытия.
- `getKitingPoint` - отход на дистанцию.
- `chooseBestDetourPoint` - объезд препятствий.
- `getTeamFallbackPoint`, `getTeamForwardPoint`, `getTeamScoutPoint`, `getTeamArtilleryPoint` - базовые точки поведения.
- `getNearestAllyHeavy`, `getSupportPointBehind` - поддержка тяжелого танка.
- `getPatrolPoint` - патруль.
- `getBotDriveTarget` - главная функция выбора точки движения.
- `botPathIsBlocked`, `getBotNavigationPoint`, `updateBotStuckState` - навигация и антизастревание.
- `updateBotTank(bot, delta)` - полный update одного бота.

В режиме войны дополнительно:

- `getWarBotObjective`;
- `getWarRallyPoint`;
- `assignWarBotOrders`.

Боты выбираются в `startBattle()` из `08-startup.js`; танки с `botEligible === false` не должны попадать в пул.

### 10.11 Захват баз и режим войны

- `tankIsInsideBase(tank, base)` проверяет нахождение в зоне.
- `createCaptureState()` создает состояние обычной базы.
- `createWarObjective()` создает точку/базу войны.
- `createWarState()` создает все точки режима войны.
- `teamOwnsAllWarPoints(team)` проверяет контроль всех точек.
- `updateCaptureZone(zone, delta, options)` универсальный захват.
- `updateBaseCapture(delta)` обычная база.
- `updateWarCapture(delta)` точки и финальные базы войны.

Если победа не наступает после захвата, смотреть `updateBaseCapture`, `updateWarCapture`, `checkBattleOutcome`.

### 10.12 Снаряды и урон

- `getProjectileTargets(projectile)` выбирает цели по команде.
- `shellCanPierceRock(shell)` разрешает пробитие камней.
- `projectileHitsObstacle(projectile)` проверяет камни, здания, мертвые танки.
- `getRandomizedShellDamage(shell)` рандомизирует урон 75-125%.
- `shellPenetratesTarget(shell, target)` считает пробитие.
- `getProjectileDamageAfterPenetration(projectile, penetrated)` считает итоговый урон.
- `damageTank(tank, damage)` снимает HP и ставит танк в смерть.
- `createShellProjectile(tank, shell, angle)` создает снаряд.
- `tankCanFire(tank, shell)` проверяет возможность выстрела.
- `fireTankShell`, `firePlayerShell`, `fireBotShell` стреляют.
- `updateGuidedProjectileAngle(projectile, delta)` управляет ПТУР первые 15 секунд.
- `updateProjectiles(delta)` двигает снаряды, проверяет попадания и урон.

ПТУР:

- тип снаряда должен быть `ПТУР` или `ATGM`;
- скорость ниже обычного снаряда;
- поле `guided = true`;
- поле `guidedControlTime = 15`;
- после 15 секунд ракета не доворачивает.

### 10.13 Камера, наблюдение, результат

- `getNextSpectatorTarget`, `switchSpectatorTarget` переключают союзников после смерти.
- `getCameraTarget` выбирает, за кем следит камера.
- `playerUsesFullMapView` включает полный обзор для САУ.
- `calculateBattleRewards` считает награды.
- `recordBattleStats` пишет статистику.
- `applyBattleRewards` начисляет опыт/серебро.
- `evaluateBattleMedals` выдает медали.
- `renderBattleResultPanel` рисует результат.
- `showBattleResult` завершает бой.
- `checkBattleOutcome` проверяет условия победы/поражения.
- `updateBattle(delta)` - главный update боя.

`updateBattle` вызывается каждый кадр из `battleLoop` в `07-battle-render.js`.

## 11. Отрисовка боя `js/07-battle-render.js`

Этот файл только рисует и содержит часть функций, связанных с canvas-циклом и респавном.

### Карта и окружение

- `drawBattleMap(ctx)` рисует землю, реки, камни, здания, базы.
- `drawBattleFire`, `drawBattleSmoke`, `drawWreck`, `drawRubble` - эффекты.
- `drawBattleBuilding`, `drawReichstag` - здания.
- `drawBattleBase` - обычная база.
- `drawWarCaptureZone`, `drawWarPointDecoration`, `drawWarObjectives` - режим войны.
- `drawArtilleryMapBackdrop` - фон полного артиллерийского обзора.
- `drawPolyline` - реки/линии.

### Танки и снаряды

- `getFittedImageSize` - вписывание картинки.
- `drawTankPart` - рисует корпус/башню или fallback.
- `drawBattleTank` - рисует танк.
- `drawTankHealthBar` - HP над танком.
- `drawProjectile` - обычные снаряды, огонь и ПТУР.
- `drawTankMarker`, `drawCommanderMarker` - маркеры.

Если танк в бою невидимый, проверить `getBattleImage`, пути `img/korpus` и `img/bashnya`, а потом `drawTankPart`.

### HUD

- `drawMinimapPoint`, `drawMinimap` - мини-карта.
- `resetBattleTutorial`, `getBattleObjectiveHint`, `getBattleTutorialContent` - обучение.
- `drawWrappedText`, `drawBattleTutorial` - текст обучения.
- `drawBattleHud` - HP игрока, команды, режимные подсказки.
- `drawBattleTeamList` - списки команд.

### Главный render loop

- `renderBattle()` очищает canvas, выставляет камеру, рисует карту, снаряды, танки, HUD.
- `battleLoop(time)` считает `delta`, вызывает `updateBattle(delta)`, затем `renderBattle()`, затем `requestAnimationFrame`.

### Спавн и респавн

- `getTeamSpawnPoints(team, count)` возвращает точки появления.
- `createPlacedBattleTank` пытается поставить танк без коллизий.
- `getRespawnPoint(tank)` ищет точку респавна.
- `respawnBattleTank(tank)` пересоздает танк в войне.
- `updateWarRespawns(delta)` уменьшает таймеры респавна.

Да, часть логики респавна находится в файле рендера. Это технический долг.

## 12. Старт и ввод `js/08-startup.js`

Этот файл связывает игру с событиями браузера.

### `startBattle()`

Главная функция запуска боя:

1. Проверяет доступность режима.
2. Находит выбранный танк.
3. Собирает пул ботов того же уровня.
4. Исключает из пула танки с `botEligible === false`.
5. Закрывает оверлей.
6. Показывает `battleView`.
7. Выбирает карту.
8. Создает игрока, союзников и врагов.
9. Сбрасывает статистику и обучение.
10. Создает базы/точки.
11. Выбирает первый снаряд.
12. Запускает `requestAnimationFrame(battleLoop)`.

Если бой стартует с неправильными танками, смотреть первые строки `startBattle`.

### `stopBattle()`

Останавливает бой:

- `battleState.active = false`;
- отменяет animation frame;
- скрывает battle view;
- очищает списки танков, снаряды, карту, состояние боя;
- возвращает интерфейс ангара.

### Клавиатура

`keydown`:

- стрелки - смена наблюдаемого союзника;
- `Tab` - списки команд;
- `H` - обучение;
- `1/2/3` - снаряды;
- `4` - залп/барабан;
- `G` - артиллерийский обзор;
- `W/A/S/D` и русские аналоги - движение.

`keyup` удаляет клавишу из `pressedKeys`.

### Мышь

- `pointermove` обновляет `battleState.cursor` и `battleState.mouse`.
- `pointerdown` по canvas стреляет.
- `pointerup` и `pointerleave` выключают удержание огня.

Важно: `battleState.cursor` - координаты на экране, `battleState.mouse` - координаты в мире карты.

### Старт игры

- `startGame()` загружает настройки, ресурсы, профиль, статистику, танки, затем рисует ангар.
- `showNextLoadingFrame()` крутит загрузочные картинки.
- `waitForYandexSdkAndStartGame()` ждет SDK и стартует.

Внизу также есть блок, который запрещает контекстное меню и перетаскивание изображений.

## 13. Как добавить новый танк

1. Добавить строку в `data.csv`.
2. Проверить название танка: оно должно совпасть с файлами изображений.
3. Добавить `img/<название>.png` для ангара/карточки.
4. Добавить `img/korpus/<название>.png` для боя.
5. Если танк с башней, добавить `img/bashnya/<название>.png`.
6. Указать класс, HP, перезарядку, снаряды, пробитие, цены.
7. Указать `AD`: `1` для обычного, `2` для премиума/контейнера, `0` для будущего.
8. Проверить ангар, дерево, бой, магазин, выбор ботами.

## 14. Как добавить новый снаряд

1. Добавить тип в CSV в одну из колонок `B-D`.
2. Добавить урон в соответствующую колонку `E-G`.
3. Если нужна особая логика, добавить функцию проверки в `06-battle-logic.js`.
4. Обновить `createShellProjectile`, `tankCanFire`, `updateProjectiles` или урон, если нужно.
5. Обновить `drawProjectile` в `07-battle-render.js`, если нужен особый вид.
6. Обновить документацию.

Для ПТУР это уже сделано через `shellIsGuidedMissile`.

## 15. Как добавить новый режим боя

1. Добавить объект в `battleModes` в `00-state.js`.
2. Если режим временный, обновить `battleModeIsAvailable`.
3. В `startBattle` проверить размер команды и нужные стартовые состояния.
4. В `checkBattleOutcome` добавить условия победы/поражения.
5. В `drawBattleHud` добавить подсказки, если нужны.
6. Если нужны специальные объекты карты, добавить их в `05-battle-maps.js`.
7. Прогнать регрессию боя.

## 16. Как добавить новый экран

1. Добавить кнопку в `sideButtonIcons` в `00-state.js`.
2. Создать `renderNewScreen()` в подходящем JS-файле.
3. Добавить ветку в `openOverlay(screenName)` в `04-ui-developer.js`.
4. Добавить CSS-классы в `styles.css`.
5. Проверить кнопку назад, ресайз и мобильный экран.

## 17. Как безопасно менять экономику

Экономика размазана между CSV и константами:

- цены исследования/покупки танков - `data.csv`;
- контейнеры - `00-state.js`;
- награды боя - `calculateBattleRewards` в `06-battle-logic.js`;
- премиум/контейнерные танки - `AD = 2`.

После изменения экономики проверять:

- покупку танка;
- исследование;
- контейнер;
- награды после победы/поражения;
- профиль и статистику.

## 18. Технические долги и осторожность

Известные слабые места:

- нет модульной системы, все глобально;
- два определения `renderTopBar` в `04-ui-developer.js`;
- часть логики респавна лежит в `07-battle-render.js`;
- `data.csv` без заголовков, поэтому индексы колонок легко сломать;
- `fallbackTanks` неполные по сравнению с полноценными CSV-танками;
- много логики завязано на точное название танка и файл изображения.

Что не делать без полной регрессии:

- менять порядок подключения JS;
- переименовывать поля `battleState`;
- менять индексы CSV;
- удалять `normalize*` функции;
- менять геометрию столкновений;
- менять `updateBattle` или `battleLoop` без проверки всех режимов.

## 19. Минимальная проверка после любой правки

```powershell
node --check js\00-state.js
node --check js\01-data.js
node --check js\02-hangar-tech-tree.js
node --check js\03-events-store-profile.js
node --check js\04-ui-developer.js
node --check js\05-battle-maps.js
node --check js\06-battle-logic.js
node --check js\07-battle-render.js
node --check js\08-startup.js
```

Потом вручную:

1. Запустить через HTTP-сервер.
2. Убедиться, что `loadedTanks.length` больше fallback-набора.
3. Открыть ангар, дерево, магазин, профиль, настройки.
4. Сыграть дуэль.
5. Сыграть командный бой.
6. Проверить консоль на ошибки.

## 20. Быстрые команды для отладки

Включить developer mode:

```javascript
dev("ujfgav8b6rvcb75av5tva7sr4av4456w*/va5*4w-bva4/-4gb-w89`7`9y7fhg9a")
```

Выдать ресурсы:

```javascript
gold = 10000
silver = 1000000
blueprints = 100
```

Открыть танк:

```javascript
tankById(10)
state = 2
experience = 999999
```

Проверить танки, запрещенные ботам:

```javascript
loadedTanks.filter(t => t.botEligible === false).map(t => t.name)
```

Проверить текущие снаряды игрока в бою:

```javascript
battleState.player.shells
```

Проверить активные снаряды:

```javascript
battleState.projectiles
```

