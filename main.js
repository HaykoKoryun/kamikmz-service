var fs = require("fs");
var exec = require('child_process').execSync;
var readline = require('readline');
var Promise = require("bluebird");

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

var escort = (function()
{
  var net = require('net');
  var server = net.createServer(function(conn){});
  server.listen(config.escort, config.host, function(){});

  var _instance = {};

  var connected = false;
  var completed = false;
  var socket;
  var fileStream;
  var size = -1;

  server.on("connection", function(_socket)
  {
    console.log("escort connected");
    connected = true;

    socket = _socket;

    socket.on("error", function()
    {
      socket.end();
      reset();
    });

    socket.on("close", function()
    {
      reset();
    });
  });

  function reset()
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

  _instance.connected = function()
  {
    return connected;
  };

  _instance.receive = function(size)
  {
    console.log("setting up file transfer, size: " + size);

    fileStream = fs.createWriteStream
    (
      config["import-path"] + "import.skp",
      {defaultEncoding:"binary"}
    );
    socket.setEncoding("binary");
    socket.pipe(fileStream, {end:false});
    size = size;

    var received = 0;

    return new Promise(function(resolve, reject)
    {
      socket.on("data", function(data)
      {
        received += data.length;

        if(received == size)
        {
          socket.unpipe(fileStream);
          fileStream.close();
          completed = true;
          console.log("complete");
          resolve("complete");
        }
      });
    }).then(function(result){return result;});
  }

  _instance.send = function()
  {
    console.log("setting up file transfer");

    fileStream = fs.createReadStream
    (
      config["export-path"] + "export.kmz",
      {defaultEncoding:"binary"}
    );

    return new Promise(function(resolve, reject)
    {
      fileStream.on('open',function()
      {
        console.log("sending file");
        fileStream.pipe(socket, {end:false});
        socket.setEncoding("binary");
        fileStream.on("end", function()
        {
          fileStream.unpipe(escort);
          fileStream.close();
          console.log("complete");
          resolve("complete");
        });
      });
    }).then(function(result){return result;});
  };

  _instance.completed = function()
  {
    return completed;
  }

  return _instance;
})();

var command = (function()
{
  var net = require('net');
  var server = net.createServer(function(conn){});
  server.listen(config.command, config.host, function(){});

  var connected = false;

  server.on("connection", function(socket)
  {
    console.log("command connected");

    var rl = readline.createInterface
    ({
      input: socket,
      output: socket
    });

    var question = Promise.promisify(function(question, callback)
    {
      rl.question(question, callback.bind(null, null));
    });

    socket.setEncoding("utf8");

    loop();

    function loop()
    {
      question("ready\n").then(function(answer)
      {
        if(answer == "convert")
        {
          console.log("ready to convert, requesting file size");
          return question("size\n");
        }
        else
        {
          return Promise.reject(new Error("incorrect command, expecting 'convert'"));
        }
      }).then(function(answer)
      {
        if(!isNaN(answer))
        {
          return Promise.join
          (
            question("ready\n"),
            escort.receive(answer)
          );
        }
        else
        {
          return Promise.reject(new Error("incorrect size, expecting a number"));
        }
      }).then(function(answers)
      {
        if(answers[0] == "complete" && answers[1] == "complete")
        {
          console.log("file received");
          convert();
          return question("exported\n");
        }
      }).then(function(answer)
      {
        if(answer == "size")
        {
          var stats = fs.statSync(config["export-path"] + "export.kmz");
          var size = stats["size"];
          return question(size + "\n");
        }
        else
        {

        }
      }).then(function(answer)
      {
        if(answer == "ready")
        {
          console.log("ready to send exported file");

          return Promise.join
          (
            escort.send(),
            question("complete\n")
          );
        }
      }).then(function(answers)
      {
        if(answers[0] == "complete" && answers[1] == "complete")
        {
          console.log("conversion complete");
        }
      }).error(function(error)
      {
        socket.write(error + "\r\n");
        setTimeout(loop, 100);
      });
    }

    socket.on("error", function()
    {
      socket.end();
      reset();
    });

    socket.on("close", function()
    {
      reset();
    });
  });

  function reset()
  {

  }
})();

console.log(logo);
