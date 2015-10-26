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

  _instance.startReceive = function(size)
  {
    console.log("setting up file transfer, size: " + size);

    fileStream = fs.createWriteStream(config["import-path"] + "import.skp", {defaultEncoding:"binary"});
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
            escort.startReceive(answer)
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
          // 3. when conversion finished, tell client to get ready to receive
          return question("exported\r\n");
        }
      }).then(function(answer)
      {
        if(answer == "size")
        {
          // 1. return the size of the file to send
          // TODO return size
        }
        else
        {

        }
      }).then(function(answer)
      {
        if(answer == "ready")
        {
          // 1. tell escort to start sending file
          // 2. when escort finished sending file, return:
          return question("complete");
        }
      }).then(function(answer)
      {
        if(answer == "complete")
        {
          // TODO task is complete, rinse, repeat!
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

    /*var mode = MODE_WAITING;

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
    */
})();

console.log(logo);

/*
var net = require('net');

var server = net.createServer(function(conn){});

server.listen(config.command, config.host, function(){});

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
*/
