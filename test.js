var net = require('net');
var fs = require('fs');

var config = JSON.parse
(
  fs.readFileSync("config.json")
);

var socket = new net.Socket();

socket.connect(config.port, "127.0.0.1", function()
{
  console.log("connected to kamikmz-service server");

  socket.setEncoding("utf8");

  console.log("sending convert command");
  socket.write("convert\n", "utf8");

  socket.on("data", function(data)
  {
    if(data.trim() == "ok")
    {
      console.log("received ok");

      var fileStream = fs.createReadStream("./test/original.skp");

      fileStream.on('error', function(err)
      {
          console.log(err);
      });

      fileStream.on('open',function()
      {
        console.log("sending file");
        //socket.setEncoding("binary");
        fileStream.pipe(socket, {end:false});
        fileStream.on("end", function()
        {
          console.log("done");
          fileStream.unpipe(socket);
          socket.write("","utf8", function()
          {
            socket.write("\nfinished","utf8");
          });
        });
      });
    }
  });
});

socket.on('close', function()
{
  console.log('server closed connection')
});

socket.on('error', function(err)
{
  console.log(err);
});
