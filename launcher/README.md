# Games Studio Launcher

Нативный Windows-лаунчер на Java 17. Он не использует браузерный движок.

## Сборка

```powershell
./build.ps1
```

Скрипт создаёт `build/GamesStudioLauncher.jar` и переносимую Windows-сборку в `dist/`. Для создания одного установочного `.exe` нужен WiX Toolset 3+ в `PATH`, после чего можно заменить в `build.ps1` `--type app-image` на `--type exe`.

## Обновления

После публикации сайта файл `launcher/manifest.json` доступен по адресу `https://gamestudio.su/launcher/manifest.json`. Лаунчер загружает его при запуске и по кнопке «Проверить обновления».

- Если версия игры в манифесте выше локальной, кнопка меняется на «Обновить».
- Для `packageType: "zip"` архив скачивается, безопасно распаковывается в `%LOCALAPPDATA%/GamesStudioLauncher/games/<id>` и заменяет прошлую версию.
- Для `packageType: "installer"` лаунчер скачивает и запускает установщик Windows. Для полностью автоматических обновлений игр публикуйте ZIP-сборки.
- Чтобы включить обновление самого лаунчера, укажите новый `launcher.version` и прямую ссылку на новый `.exe` в `launcher.installerUrl`.

Для Tanks Wars нужно опубликовать Windows ZIP-архив и заполнить `downloadUrl`; внутри архива файл запуска должен соответствовать `executable`.
