var fs = require("fs");
var exec = require('child_process').execSync;

var config = JSON.parse
(
  fs.readFileSync("config.json")
);
config["import-path"] = config["import-path"].replace(/\\/ig, "\\\\");
config["export-path"] = config["export-path"].replace(/\\/ig, "\\\\");

var template = fs.readFileSync("template.rb", "utf8");

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
