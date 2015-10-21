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

function commander(command, socket)
{
  switch(command)
  {
    case "convert":
    {
      socket.write("converting file\r\n");
      convert();
      socket.write("done\r\n");
    } break;
  }
}

var net = require('net');

var server = net.createServer(function(socket)
{
  socket.setEncoding("utf8");
	socket.write(logo + "\r\n");

  var buffer = "";
  socket.on('data', function(data)
  {
    if(data == "\r\n")
    {
      commander(buffer, socket);
      buffer = "";
    }
    else
    {
      buffer += data;
    }
  });
});

server.listen(config.port, config.address);

console.log(logo);
