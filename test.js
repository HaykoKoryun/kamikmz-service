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

command.on('error', function(err)
{
  console.log(err);
});

escort.on('error', function(err)
{
  console.log(err);
});

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
            fileStream = fs.createReadStream
            (
              "./test/original.skp",
              {defaultEncoding:"binary"}
            );

            return new Promise(function(resolve, reject)
            {
              fileStream.on('open',function()
              {
                console.log("sending file");
                fileStream.pipe(escort, {end:false});
                fileStream.on("end", function()
                {
                  console.log("complete");
                  fileStream.unpipe(escort);
                  fileStream.close();
                  resolve("complete");
                });
              });
            }).then(function(answer)
            {
              return question("complete\n");
            });
          }
        }).then(function(answer)
        {
          if(answer == "exported")
          {
            return question("size\n");
          }
        }).then(function(answer)
        {
          console.log("setting up file transfer, size: " + answer);

          fileStream = fs.createWriteStream
          (
            "./test/export.kmz",
            {defaultEncoding:"binary"}
          );
          escort.setEncoding("binary");
          escort.pipe(fileStream, {end:false});
          var size = answer;

          var received = 0;

          return Promise.join
          (
            question("ready\n"),
            new Promise(function(resolve, reject)
            {
              escort.on("data", function(data)
              {
                received += data.length;

                if(received == size)
                {
                  escort.unpipe(fileStream);
                  fileStream.close();
                  completed = true;
                  console.log("complete");
                  resolve("complete");
                }
              });
            }).then(function(result){return result;})
          )
        }).then(function(answer)
        {
          console.log("conversion complete");
          return question("complete\n");
        });
      }
    });
  }
});

escort.connect(config.escort, "127.0.0.1", function()
{
  console.log("escort connected");
});
