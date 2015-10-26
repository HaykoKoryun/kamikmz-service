var net = require('net');
var fs = require('fs');
var readline = require('readline');
var Promise = require("bluebird");

var config = JSON.parse
(
  fs.readFileSync("config.json")
);

var command = new net.Socket();
var escort = new net.Socket();

command.connect(config.command, "127.0.0.1", function()
{
  console.log("command connected");

  var fileStream;

  var rl = readline.createInterface
  ({
    input: command,
    output: command
  });

  var question = Promise.promisify(function(question, callback)
  {
    rl.question(question, callback.bind(null, null));
  });

  command.setEncoding("utf8");

  loop();

  function loop()
  {
    rl.once("line", function(data)
    {
      if(data == "ready")
      {
        console.log("command ready");

        question("convert\n").then(function(answer)
        {
          if(answer == "size")
          {
            console.log("ready to convert, sending file size");
            var stats = fs.statSync("./test/original.skp");
            var size = stats["size"];
            return question(size + "\n");
          }
        }).then(function(answer)
        {
          if(answer == "ready")
          {
            console.log("ready to send");
            fileStream = fs.createReadStream("./test/original.skp");

            fileStream.on('open',function()
            {
              console.log("sending file");
              fileStream.pipe(escort, {end:false});
              fileStream.on("end", function()
              {
                console.log("complete");
                fileStream.unpipe(escort);
                fileStream.close();
                return question("complete\n");
              });
            });
          }
        });
      }
    });
  }
});

escort.connect(config.escort, "127.0.0.1", function()
{
  console.log("escort connected");
});

/*
var MODE_SENDING = 0;
var MODE_RECEIVING = 2;

socket.connect(config.port, "127.0.0.1", function()
{
  console.log("connected to kamikmz-service server");

  var mode = MODE_SENDING;

  socket.setEncoding("utf8");

  console.log("sending convert command");

  var fileStream;

  socket.on("data", function(data)
  {
    console.log(data);
    console.log("###");
    switch(mode)
    {
      case MODE_SENDING:
      {
        if(data.trim() != "ok") return;

        console.log("received ok");

        fileStream = fs.createReadStream("./test/original.skp");

        fileStream.on('open',function()
        {
          console.log("sending file");
          fileStream.pipe(socket, {end:false});
          fileStream.on("end", function()
          {
            console.log("done");
            fileStream.unpipe(socket);
            fileStream.close();
            socket.write("done","utf8");

            fileStream = fs.createWriteStream("./test/exported.kmz", {defaultEncoding:"binary"});

            socket.pipe(fileStream, {end:false});

            console.log("receiving file");
            mode = MODE_RECEIVING;
          });
        });

      } break;

      case MODE_RECEIVING:
      {
        if(data.trim() != "done") return;

        socket.unpipe(fileStream);
        fileStream.close();
        console.log("done");
        socket.end();
      } break;
    }
  });

  socket.write("convert\n", "utf8");
});

socket.on('error', function(err)
{
  console.log(err);
});
*/
