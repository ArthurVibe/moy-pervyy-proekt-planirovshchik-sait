# WHAT’S UP, BRO? — THE PRIVATE CLUB

Header + Hero, инженерная доводка по ТЗ v3.3. Рабочая ветка — `feature/private-club-hero`; эталон композиции и материала — `e5fd5aa`.

Внешние области трёх кнопок теперь неподвижны: фон, рамка, текст, стрелка и тень поднимаются вместе внутри `.button-face`. Повторные наведения сбрасывают и запускают один новый проход; фокус, reduced motion и touch имеют отдельную безопасную реакцию. Отражение BRO? получило тёплый светлый центр с медными краями. Положение элементов, фотографии, тексты и бронзовый материал сохранены.

## Посмотреть результат без архива

[Новая запись MP4 — анимации и проверки нижней границы](docs/previews/v3.3/hover-and-edge-tests.mp4?raw=1) · [Desktop 1440×900](docs/previews/v3.3/desktop-after-1440x900.png) · [Mobile 390×844](docs/previews/v3.3/mobile-after-390x844.png) · [Отчёт v3.3](docs/hero-v3.3-report.md)

Видео 39,2 секунды: Meet Bro → How It Works → Get Early Access → BRO?, затем быстрые наведения и удержание курсора у нижней границы Meet Bro и Get Early Access. Каждый обычный hover удерживается около 2,3 секунды, проверки границы — по 3,2 секунды. Подписи и указатель наложены только на запись; анимации сняты в браузере.

Крупные кадры DPR 2: [Meet Bro](docs/previews/v3.3/meet-bro-hover-2x.png) · [How It Works](docs/previews/v3.3/how-it-works-hover-2x.png) · [Get Early Access](docs/previews/v3.3/get-early-access-hover-2x.png) · [волна BRO?](docs/previews/v3.3/logo-wave-2x.png).

## Интерактивный просмотр на вашем компьютере

При установленных Git и Python:

```sh
git clone --branch feature/private-club-hero --single-branch https://github.com/ArthurVibe/moy-pervyy-proekt-planirovshchik-sait.git private-club-preview
cd private-club-preview
python3 -m http.server 8000 --bind 127.0.0.1
```

На Windows последнюю команду можно выполнить через `py -m http.server 8000 --bind 127.0.0.1`.

В браузере на том же компьютере:

- Обычный режим: `http://127.0.0.1:8000/`
- Warm Welcome выключен: `http://127.0.0.1:8000/?warmWelcome=off`

Сервер доступен только на локальном компьютере. Фотография, Playfair Display и код локальные; интернет странице не нужен. Лицензия шрифта — `assets/fonts/OFL.txt`. Ссылки и кнопки будущих разделов сохраняют сообщение Coming soon.

## Проверки

Chromium 154.0.8037.57, Linux: 12 основных групп и 4 дополнительные проверки пройдены. У каждой кнопки проверены 1/2/3 px над нижней границей с удержанием по 3 секунды, медленный вход снизу, быстрые повторные наведения, клавиатура и совместный фокус/hover. Touch проверен в эмуляции. Контраст в 42 состояниях — от 4,623:1; вне зафиксированных масок кнопок — ноль изменившихся пикселей при 1440×900 и 390×844. Небольшие отличия внутри масок описаны в отчёте.

Firefox и WebKit не установлены, их загрузочные хосты не разрешены политикой среды. Реальные Safari/iOS/Android и гибридное устройство не проверены; синтетический сценарий гибридного ввода не заменяет устройство. Подробности, крупные кадры фокуса, сравнения до/после, маски и воспроизводимые сценарии — в [отчёте](docs/hero-v3.3-report.md).

## Сохранённые версии

Утверждённая статичная версия: тег [`private-club-hero-v1.0`](https://github.com/ArthurVibe/moy-pervyy-proekt-planirovshchik-sait/tree/private-club-hero-v1.0), коммит `bffb72c9e968b81a941399d9e1a7f0d2ea5764f6`. `main`, тег и действующий сайт не менялись. Новый этап не объединён с main и не опубликован через GitHub Pages. Новых тегов нет.

Предыдущие материалы: [финальная бронза](docs/final-bronze-report.md) · [Floating Invitation](docs/floating-invitation-report.md) · [бронзовый материал](docs/bronze-material-report.md) · [Aged Bronze](docs/aged-bronze-report.md) · [этап 2](docs/stage2-report.md).

Ожидается визуальное согласование.
