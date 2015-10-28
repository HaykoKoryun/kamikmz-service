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

function exportkmz()
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
    if(connected)
    {
      _socket.write("only one escort connection allowed!\n");
      _socket.end();
      return;
    }

    connected = true;

    socket = _socket;

    socket.on("error", function()
    {
      reset();
    });

    socket.on("close", function()
    {
      reset();
    });
  });

  function reset()
  {
    connected = false;

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

  _instance.receive = function(size, complete)
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

    return Promise.join
    (
      complete,
      new Promise(function(resolve, reject)
      {
        socket.on("data", function(data)
        {
          received += data.length;

          if(received == size)
          {
            completed = true;
            console.log("complete");
            resolve("complete");
          }
        });
      })
    ).then(function()
    {
      socket.unpipe(fileStream);
      fileStream.close();

      return "complete";
    });
  }

  _instance.send = function(complete)
  {
    console.log("setting up file transfer");

    fileStream = fs.createReadStream
    (
      config["export-path"] + "export.kmz",
      {defaultEncoding:"binary"}
    );

    return Promise.join
    (
      new Promise(function(resolve, reject)
      {
        fileStream.on('open',function()
        {
          console.log("sending file");
          fileStream.pipe(socket, {end:false});
          socket.setEncoding("binary");

          fileStream.on("end", function()
          {
            console.log("complete");
            resolve("complete");
          });
        });
      }),
      complete
    ).then(function()
    {
      fileStream.unpipe(escort);
      fileStream.close();
      return "complete";
    });
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
  var socket;

  server.on("connection", function(_socket)
  {
    console.log("command connected");
    if(connected)
    {
      _socket.write("only one command connection allowed!\n");
      _socket.end();
      return;
    }

    socket = _socket;

    connected = true;

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
        if(answer == "send")
        {
          console.log("ready to receive file, requesting file size");
          return question("size\n");
        }
        else
        {
          return Promise.reject(new Error("incorrect command, expecting 'receive'"));
        }
      }).then(function(answer)
      {
        if(!isNaN(answer))
        {
          return escort.receive(answer, question("ready\n"))
          .then(function(answer)
          {
            if(answer == "complete")
            {
              console.log("file received");
              return question("ok\n");
            }
          });
        }
        else
        {
          return Promise.reject(new Error("incorrect size, expecting a number"));
        }
      }).then(function(answer)
      {
        if(answer == "export")
        {
          exportkmz();
          return question("exported\n");
        }
        else
        {
          return Promise.reject(new Error("incorrect command, expecting 'export'"));
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
          return Promise.reject(new Error("incorrect command, expecting 'size'"));
        }
      }).then(function(answer)
      {
        if(answer == "ready")
        {
          console.log("ready to send exported file");

          return escort.send().then(function()
          {
            return question("complete\n");
          });
        }
        else
        {
          return Promise.reject(new Error("incorrect command, expecting 'ready'"));
        }
      }).then(function(answer)
      {
        if(answer == "complete")
        {
          console.log("conversion complete");
          return question("continue\n");
        }
      }).then(function(answer)
      {
        if(answer == "yes")
        {
          setTimeout(loop, 100);
        }
      }).error(function(error)
      {
        socket.write(error + "\r\n");
        setTimeout(loop, 100);
      });
    }

    socket.on("error", function()
    {
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
      connected = false;
    }
    catch(e)
    {

    }
  }
})();

console.log(logo);
