# What’s Up, Bro? — The Private Club

Этап 2: интерактивность Header + Hero. Последняя корректировка — финальная медно-коричневая бронза, заметное осветление кнопок при hover и широкие тёплые металлические волны. Рабочая ветка — `feature/private-club-hero`.

Утверждённая статичная композиция сохранена тегом [`private-club-hero-v1.0`](https://github.com/ArthurVibe/moy-pervyy-proekt-planirovshchik-sait/tree/private-club-hero-v1.0), коммит `bffb72c9e968b81a941399d9e1a7f0d2ea5764f6`. Основная ветка, тег и действующий сайт не изменялись. Этап 2 не опубликован через GitHub Pages и не объединён с main.

## Посмотреть эффекты без архива

[Новое видео четырёх hover-состояний, MP4 1440×900](docs/previews/final-bronze-hover.mp4?raw=1) · [Крупный план GIF](docs/previews/final-bronze-closeup.gif)

![Финальная бронза: Meet Bro, How It Works, Get Early Access и BRO?](docs/previews/final-bronze-closeup.gif)

Последовательность: Meet Bro → How It Works → Get Early Access → BRO?. Курсор задерживается на каждом элементе примерно на 2,3 секунды. Видео длится около 16 секунд. GIF показывает те же записанные области в масштабе 2×. Подписи и указатель добавлены только в запись. GIF повторяется для удобства просмотра; блики на странице выполняются однократно за новое наведение. Для точной оценки бронзы используйте PNG или MP4; GIF имеет ограниченную палитру.

[Обновлённый Desktop 1440×900](docs/previews/final-bronze-desktop-1440x900.png) · [Отчёт по финальному заданию](docs/final-bronze-report.md).

Предыдущий этап: [Floating Invitation — движение всех трёх кнопок](docs/previews/floating-invitation-hover.mp4?raw=1).

Материалы до изменения палитры: [все анимации](docs/previews/hero-animations.gif) · [Mobile 390 px](docs/previews/stage2-mobile-390.png) · [Warm Welcome включён](docs/previews/warm-welcome-on.png) · [Warm Welcome выключен](docs/previews/warm-welcome-off.png).

## Интерактивный просмотр на вашем компьютере

При установленных Git и Python:

```sh
git clone --branch feature/private-club-hero --single-branch https://github.com/ArthurVibe/moy-pervyy-proekt-planirovshchik-sait.git private-club-preview
cd private-club-preview
python3 -m http.server 8000 --bind 127.0.0.1
```

На Windows последнюю команду можно выполнить через `py -m http.server 8000 --bind 127.0.0.1`.

В браузере на том же компьютере откройте:

- Обычный режим: `http://127.0.0.1:8000/`
- Только Warm Welcome выключен: `http://127.0.0.1:8000/?warmWelcome=off`

Сервер привязан только к локальному компьютеру; это не публичная публикация. Интернет для самой страницы не нужен: фотография, шрифт Playfair Display и код локальные. Шрифт распространяется с лицензией SIL OFL в `assets/fonts/OFL.txt`.

## Реализованные эффекты

- Meet Bro: медно-коричневый градиент, глубокий нижний край и тень. При hover осветляется вся кнопка, усиливается верхний акцент, проходит широкая бронзовая волна 800 мс. Подъём 6 px за 400 мс, стрелка вправо на 5 px, нажатие 0.99 с небольшим опусканием.
- Warm Welcome: радиальное пятно 360 px, итоговая непрозрачность 0.12, появление 500 мс, исчезновение 550 мс. Слой под текстом обрезан перед фигурой Bro.
- Living Engraving: заметная тёплая волна 850 мс только на BRO?, с медными краями и шампань-бронзовым центром. Буквы не перемещаются и не масштабируются; WHAT’S UP, сохраняет свой цвет.
- How It Works: подъём 4 px, более яркая рамка, тёплый светлый оттенок тёмного фона и мягкая тень; стрелка вправо на 4 px. Кнопка остаётся второстепенной.
- Get Early Access: общее осветление, более сдержанная волна 700 мс, подъём 4 px и внутренняя глубина. Стрелка вправо на 3 px.
- Навигация: цвет и подчёркивание за 220 мс.
- Однократное появление текста за 550 мс, без перемещения.

При системном reduced motion декоративные анимации отключены. Hover-эффекты работают только с точным указателем, поддерживающим наведение; касания их не запускают. Coming soon и клавиатурный фокус сохранены.

## Проверки

Восемь групп проверок Chromium пройдены: геометрия при 1440×900 / 390×844, движение и возврат 6 / 4 / 4 px, осветление кнопок и стрелки, клавиатура, сенсорное меню, reduced motion и однократные волны. Контраст надписей на отрисованном бронзовом фоне — от 4,62:1. Исходные PNG/WebP не изменены. Подробности — [финальный отчёт](docs/final-bronze-report.md). Предыдущие проверки сохранены в отчётах [материала](docs/bronze-material-report.md), [Floating Invitation](docs/floating-invitation-report.md), [Aged Bronze](docs/aged-bronze-report.md) и [анимаций](docs/stage2-report.md).

Safari, Firefox, Edge и реальные смартфоны не проверялись. Сайт ожидает визуального согласования; слияние и публикация не выполнялись.
