# What’s Up, Bro? — The Private Club

Этап 2: сдержанные анимации Header + Hero. Последняя корректировка — бронзовые кнопки Aged Bronze. Рабочая ветка — `feature/private-club-hero`.

Утверждённая статичная композиция сохранена тегом [`private-club-hero-v1.0`](https://github.com/ArthurVibe/moy-pervyy-proekt-planirovshchik-sait/tree/private-club-hero-v1.0), коммит `bffb72c9e968b81a941399d9e1a7f0d2ea5764f6`. Основная ветка, тег и действующий сайт не изменялись. Этап 2 не опубликован через GitHub Pages и не объединён с main.

## Посмотреть эффекты без архива

[Открыть GIF-запись бронзовых кнопок](docs/previews/aged-bronze-hover.gif) · [MP4 1440×900](docs/previews/aged-bronze-hover.mp4?raw=1)

![Наведение на бронзовые кнопки Meet Bro и Get Early Access](docs/previews/aged-bronze-hover.gif)

Запись около 8 секунд: два наведения на Meet Bro → два наведения на Get Early Access. GIF повторяет запись для удобства просмотра; блик на самой странице выполняется однократно за наведение. Видео и GIF — записи браузера, а не интерактивный сайт. Для оценки бронзового оттенка используйте PNG или MP4; GIF имеет ограниченную палитру.

[Новый скриншот Desktop 1440×900](docs/previews/aged-bronze-desktop-1440x900.png). [Отчёт Aged Bronze и проверка контраста](docs/aged-bronze-report.md).

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

- Meet Bro / Aged Bronze: мягкий бронзовый градиент, тонкая рамка, верхний отблеск и нижняя тень. Однократный бронзовый блик 600 мс, подъём 6 px, стрелка 3 px, нажатие 0.99.
- Warm Welcome: радиальное пятно 360 px, итоговая непрозрачность 0.12, появление 500 мс, исчезновение 550 мс. Слой под текстом обрезан перед фигурой Bro.
- Living Engraving: однократный блик 400 мс только на BRO?, без изменения размеров.
- How It Works: рамка, тёплый фон и стрелка за 300 мс.
- Embossed Invitation: внутренний контур и стрелка за 260 мс.
- Навигация: цвет и подчёркивание за 220 мс.
- Однократное появление текста за 550 мс, без перемещения.

При системном reduced motion декоративные анимации отключены. Hover-эффекты работают только с точным указателем, поддерживающим наведение; касания их не запускают. Coming soon и клавиатурный фокус сохранены.

## Проверки

13 проверок Chromium повторно пройдены после изменения кнопок. Геометрия и шрифты desktop/mobile совпадают с утверждённым тегом; исходные PNG/WebP не изменены. Минимальный расчётный контраст текста на бронзовой поверхности — 4,56:1. Подробности — [отчёт Aged Bronze](docs/aged-bronze-report.md); предыдущий этап — [отчёт анимаций](docs/stage2-report.md).

Safari, Firefox, Edge и реальные смартфоны не проверялись. Сайт ожидает визуального согласования; слияние и публикация не выполнялись.
