var net = require('net');
var fs = require('fs');

var config = JSON.parse
(
  fs.readFileSync("config.json")
);

var socket = new net.Socket();

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
