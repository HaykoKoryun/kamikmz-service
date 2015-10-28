var net = require('net');
var fs = require('fs');
var readline = require('readline');
var Promise = require("bluebird");

var host = "127.0.0.1";

if(process.argv.length > 2)
{
  host = process.argv[2];
}

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

command.connect(config.command, host, function()
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

        question("send\n").then(function(answer)
        {
          if(answer == "size")
          {
            console.log("ready to send file, sending file size");
            var stats = fs.statSync("./test/original.skp");
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
            fileStream = fs.createReadStream
            (
              "./test/original.skp",
              {defaultEncoding:"binary"}
            );

            return Promise.join
            (
              new Promise(function(resolve, reject)
              {
                fileStream.on('open', function()
                {
                  console.log("sending file");
                  fileStream.pipe(escort, {end:false});
                  fileStream.on("end", function()
                  {
                    console.log("complete");
                    resolve("complete");
                  });
                });
              }),
              question("complete\n")
            ).then(function()
            {
              fileStream.unpipe(escort);
              fileStream.close();

              return question("export\n");
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
          var size = answer;
          console.log("setting up file transfer, size: " + size);

          fileStream = fs.createWriteStream
          (
            "./test/export.kmz",
            {defaultEncoding:"binary"}
          );
          escort.setEncoding("binary");
          escort.pipe(fileStream, {end:false});

          return Promise.join
          (
            new Promise(function(resolve, reject)
            {
              var received = 0;

              escort.on("data", function(data)
              {
                received += data.length;

                if(received == size)
                {
                  completed = true;
                  console.log("complete");
                  resolve("complete");
                }
              });
            }),
            question("ready\n")
          ).then(function()
          {
            escort.unpipe(fileStream);
            fileStream.close();
            console.log("conversion complete");
            return question("complete\n");
          });
        }).then(function(answer)
        {
          if(answer == "continue")
          {
            command.write("no\n");
            process.exit();
          }
        });
      }
    });
  }
});

escort.connect(config.escort, host, function()
{
  console.log("escort connected");
});
