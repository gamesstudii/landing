# Флаги

Помещайте изображения флагов в эту папку и добавляйте их в `manifest.json`.

Пример:

```json
{
  "flags": [
    { "name": "Франция", "file": "france.png" },
    { "name": "Англия", "file": "england.svg" }
  ]
}
```

Поддерживаются форматы, которые отображает браузер: PNG, JPG, WebP, GIF и SVG.

Чтобы флаги появились в редакторе, после добавления файлов запустите из корня проекта:

```powershell
powershell -ExecutionPolicy Bypass -File tools/update-flags-manifest.ps1
```
