# kamikmz-service

create a `config.json` file next to `main.js` with the following:
```json
{
  "sketchup-bin" :
    "f:\\path\\to\\sketchup\\bin",
  "import-path" :
    "f:\\path\\to\\import\\files\\",
  "export-path" :
    "f:\\path\\to\\export\\files\\",
  "address" :
    "127.0.0.1",
  "port" :
    "1337"
}
```
for example
```json
{
  "sketchup-bin" :
    "c:\\Program Files\\SketchUp\\SketchUp 2015\\SketchUp.exe",
  "import-path" :
    "f:\\projects\\kamikmz\\import\\",
  "export-path" :
    "f:\\projects\\kamikmz\\export\\",
  "address" :
    "127.0.0.1",
  "port" :
    "1337"
}
```

run `main.js` with node and you are done!
