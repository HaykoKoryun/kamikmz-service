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
  "host" :
    "127.0.0.1",
  "command" :
    "1337",
  "escort" :
    "1338"
}
```
`command` port is for sending commands  
`escort` port is for transferring files

for example
```json
{
  "sketchup-bin" :
    "c:\\Program Files\\SketchUp\\SketchUp 2015\\SketchUp.exe",
  "import-path" :
    "f:\\projects\\kamikmz\\import\\",
  "export-path" :
    "f:\\projects\\kamikmz\\export\\",
  "host" :
    "127.0.0.1",
  "command" :
    "1337",
  "escort" :
    "1338"
}
```

run `main.js` with node and you are done!

test teapot model [from Trimble Sketchup 3D Warehouse](https://3dwarehouse.sketchup.com/model.html?id=452baec912c0eba8f10c4513652c1c5e)
