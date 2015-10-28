```
        __                    __ __                   
       |  | _______    _____ |__|  | __ _____ ________
       |  |/ /\__  \  /     \|  |  |/ //     \\___   /
       |    <  / __ \|  Y Y  \  |    <|  Y Y  \/    /
       |__|_ \(____  /__|_|  /__|__|_ \__|_|  /_____ \
```
# kamikmz service
A NodeJS application running as a [Trimble SketchUp](http://www.sketchup.com/) to [Google KMZ](https://developers.google.com/kml/documentation/kmzarchives?hl=en) conversion service.

A client uses the `kamikmz-service` by creating two `TCP` connections:   
-o one for sending and receiving `commands`  
-o the second for sending and receiving `files` (kinda like FTP).

The only prerequisite is that you need to have `Trimble SketchUp` installed on the machine that will host the service, as the application invokes it with a `Ruby` script to make the conversion.

To run the service, just create a `config.json` file next to `main.js` with the following:
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

For example
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

Run `node main.js` and the service should kick in!

###### (don't forget to run `npm install` first as currently the only dependency is the [bluebird](https://github.com/petkaantonov/bluebird) package)

## Testing
Just to make sure everything is peachy, run `node test.js` on the same machine  which will do a test transfer and conversion with `console.log`s.

To test the setup from a remote machine, just copy `package.json`, the `test` folder and `test.js` to the remote machine, `npm install` and then run `node test.js hostname command escort` replacing `hostname`, `command` and `escort` with their respective values.

Teapot model used for testing from [Trimble Sketchup 3D Warehouse](https://3dwarehouse.sketchup.com/model.html?id=452baec912c0eba8f10c4513652c1c5e)
