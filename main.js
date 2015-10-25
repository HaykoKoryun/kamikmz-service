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

var MODE_WAITING = 0;
var MODE_RECEIVE = 2;
var MODE_RECEIVING = 3;
var MODE_SENDING = 4;

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

  console.log("converting file");

  try
  {
    exec("\"" + config["sketchup-bin"] + "\" -RubyStartup " + __dirname + "\\export.rb");
  }
  catch(e)
  {

  }

  console.log("done");
}

var net = require('net');

var server = net.createServer(function(conn){});

server.listen(config.port, config.host, function(){});
server.on("connection", function(socket)
{
  console.log("client connected");

  socket.setEncoding("utf8");

  var mode = MODE_WAITING;

  var fileStream;

  socket.on('data', function(data)
  {
    switch(mode)
    {
      case MODE_WAITING:
      {
        if(data.trim() != "convert") return;

        console.log("convert command received, waiting for file");

        socket.write("ok\n");
        mode = MODE_RECEIVE;

        fileStream = fs.createWriteStream(config["import-path"] + "import.skp", {defaultEncoding:"binary"});
        socket.setEncoding("binary");
        socket.pipe(fileStream, {end:false});
      } break;

      case MODE_RECEIVE:
      {
        console.log("receiving file");
        mode = MODE_RECEIVING;
      } break;

      case MODE_RECEIVING:
      {
        if(data.trim() != "done") return;

        socket.unpipe(fileStream);
        fileStream.close();
        console.log("done");

        convert();

        fileStream = fs.createReadStream(config["export-path"] + "export.kmz");

        mode = MODE_SENDING;

        fileStream.on("open", function()
        {
          console.log("sending exported file");
          fileStream.pipe(socket, {end:false});

          fileStream.on("end", function()
          {
            console.log("done");
            fileStream.unpipe(socket);
            socket.setNoDelay(true);
            socket.write("\n\n\n", "utf8");
            socket.write("done","utf8");
            socket.setNoDelay(false);
            mode = MODE_WAITING;
            cleanTemp();
          });
        });

      } break;

      case MODE_SENDING:
      {

      } break;
    }
  });

  socket.on("error", function()
  {
    socket.end();
    cleanTemp();
  });

  socket.on("close", function()
  {
    cleanTemp();
  });
});

function cleanTemp()
{
  try
  {
    fs.unlinkSync(config["import-path"] + "import.skp");
    fs.unlinkSync(config["export-path"] + "export.kmz");
  }
  catch(e)
  {

  }
}

console.log(logo);
