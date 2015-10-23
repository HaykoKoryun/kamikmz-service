var fs = require("fs");
var exec = require('child_process').execSync;

var config = JSON.parse
(
  fs.readFileSync("config.json")
);
config["import-path"] = config["import-path"].replace(/\\/ig, "\\\\");
config["export-path"] = config["export-path"].replace(/\\/ig, "\\\\");

var template = fs.readFileSync("template.rb", "utf8");
var logo = fs.readFileSync("logo.txt", "utf8");

var MODE_COMMAND = 0;
var MODE_RECEIVE = 1;
var MODE_RECEIVING = 2;

function convert()
{
  fs.writeFileSync
  (
    "export.rb",
    template
    .replace
    (
      "{{import}}",
      config["import-path"] + "import.skp"
    )
    .replace
    (
      "{{export}}",
      config["export-path"] + "export.kmz"
    )
  );

  exec("\"" + config["sketchup-bin"] + "\" -RubyStartup " + __dirname + "\\export.rb");
}

var net = require('net');

var server = net.createServer(function(conn){});

server.listen(config.port, config.host, function()
{
  server.on("connection", function(socket)
  {
    console.log("client connected");

    socket.setEncoding("utf8");
  	socket.write(logo + "\r\n");

    var buffer = "";
    var mode = MODE_COMMAND;

    var fileStream;

    socket.on('data', function(data)
    {
      if(mode == MODE_RECEIVING && data.trim() == "finished")
      {
        socket.unpipe(fileStream);
        fileStream.close();
        mode = MODE_COMMAND;
        console.log("finished");
      }
      if(mode == MODE_COMMAND && data.trim() == "convert")
      {
        console.log("convert command received, waiting for file");

        socket.write("ok\n");
        mode = MODE_RECEIVE;

        fileStream = fs.createWriteStream(config["import-path"] + "import.skp", {defaultEncoding:"binary"});
        socket.setEncoding("binary");
        socket.pipe(fileStream, {end:false});
      }
      else if(mode == MODE_RECEIVE)
      {
        console.log("receiving file");
        mode = MODE_RECEIVING;
      }
    });
  });
});

console.log(logo);
