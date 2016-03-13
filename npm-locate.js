#!/usr/bin/env node
'use strict';

const os             = require("os");
const readline       = require("readline");
const path           = require("path");
const Promise        = require("bluebird");
const fs             = Promise.promisifyAll(require("fs"));
const ArgumentParser = require("argparse").ArgumentParser;
const got            = require("got");
const chalk          = require("chalk");
const progressbar    = require("./progressbar");


const getCacheDir = () => {
  const home = os.homedir();
  const platform = os.platform();

  if(platform === "darwin"){
    return path.join(home, "Library", "Caches");
  }
  else if(platform === "win32"){
    return process.env["LOCALAPPDATA"] || process.env["APPDATA"];
  }
  else{
    return process.env["XDG_CACHE_HOME"] || path.join(home, ".cache");
  }
};


const cachedir = path.join(getCacheDir(), "npm-locate");


const download = () => {
  return new Promise((resolve, reject) => {

    let contentLength = 1;
    const progress = () => {
      process.stdout.write(`\r${progressbar(writer.bytesWritten, contentLength)}`);
    };

    const indexpath = path.join(cachedir, "index.json");
    const filename = path.join(cachedir, "index.json.1");
    const writer = fs.createWriteStream(filename);
    writer.on("finish", () => {
      progress();

      fs.renameAsync(filename, indexpath)
      .then(() => {
        resolve(indexpath);
      })
      .catch(reject);

    });

    got.stream("https://registry.npmjs.org/-/all")
    .on("response", resp => {
      contentLength = +resp.headers["content-length"];

      resp.on("data", () => {
        progress();
      });

    })
    .pipe(writer);

  });
};


const build = (filepath) => {
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(path.join(cachedir, "index.db"));
    writer.on("finish", () => resolve(true));

    const esc = (s) => {
      return ((s||"")+"")
      .replace(/\|/g, "\\|")
      .replace(/\n|\r/g, "");
    };

    console.log("[Build] reading ", filepath);
    fs.readFile(filepath, "utf8", (err, data) => {
      if(err){
        return reject(err);
      }

      console.log("[Build] parsing JSON");
      console.time("parseJSON");
      const result = JSON.parse(data);
      console.timeEnd("parseJSON");

      console.log("[Build] Building database");
      console.time("buildDB");
      Object.keys(result).forEach((key) => {
        const pkg = result[key];
        writer.write([
          esc(pkg.name),
          esc(pkg.description),
          esc(pkg.keywords)
        ].join(" |") + "\n");
      });
      console.timeEnd("buildDB");

      writer.end();
    });
  });
};


const main = (options) => {
  if(options.update){
    return download().then(build)
    .catch((e) => console.error(e.stack));
  }
  else if(options.build){
    return build(path.join(cachedir, "index.json"))
    .catch((e) => console.error(e.stack));
  }

  new Promise((resolve, reject) => {
    const reader = fs.createReadStream(path.join(cachedir, "index.db"))
    .on("error", (e) => reject(e))
    .on("readable", () => resolve(reader));
  })
  .then((reader) => {
    const rl = readline.createInterface({
      input: reader,
      output: {}
    });

    const hi = (str, keyword) => {
      return str.replace(keyword, chalk.green(keyword));
    };

    let total = 0;
    let results = [];

    rl.on("line", (line) => {
      const data = line.split(" |");
      const name = data[0];
      const description = data[1];
      const keywords = data[2];
      let display = true;

      let output = {
        name: "",
        description: "",
        keywords: ""
      };

      output.name = chalk.blue(name);
      if(options.verbose){
        output.description = description;
        output.keywords = keywords.split(",").join(", ");
      }

      if(options.match){
        if(name === options.match){
          //output.name = hi(name, options.name);
        }
        else{
          return;
        }
      }

      if(options.keywords){
        let keys = keywords.split(",");
        let match = options.keywords.split(",").every((keyword) => {
          let pos = keys.indexOf(keyword);
          if(~pos){
            keys[pos] = chalk.green(keys[pos]);
            return true;
          }
          else{
            return false;
          }
        });

        if(!match){
          return;
        }

        output.keywords = keys.join(", ");
      }

      if(options.description){
        if(description.includes(options.description)){
          output.description = hi(description, options.description);
        }
        else{
          return;
        }
      }

      if(options.name){
        if(name.includes(options.name)){
          output.name = hi(name, options.name);
        }
        else{
          return;
        }
      }

      total++;
      results.push(name);
      console.log(chalk.gray("\u2713"), output.name);
      if(output.description){
        console.log("  ", output.description);
      }
      if(output.keywords){
        console.log("  ", chalk.gray("$"), output.keywords);
      }
    });

    rl.on("close", () => {
      console.log("\n", chalk.cyan("\u276f"), "Total:", total, "packages.");

      if(options.trends && results.length <= 10){
        console.log(`http://www.npmtrends.com/${results.join("-vs-")}`);
      }
    });

  })

  .catch((e) => {
    console.log(e.stack);
    console.error(chalk.yellow("index.db not found.\n Please press $ npm-locate --update"));
  });
}



const parser = new ArgumentParser({
  description: "Locate npm package."
});

parser.addArgument(["-n", "--name"], {
  help: "name filter"
});

parser.addArgument(["-N", "--match"], {
  help: "name filter(match)"
});

parser.addArgument(["-d", "--description"], {
  help: "description filter"
});

parser.addArgument(["-k", "--keywords"], {
  help: "keywords filter",
  metavar: "keyword1,keyword2,..."
});

parser.addArgument(["--update"], {
  help: "Update database",
  action: "storeTrue"
});

parser.addArgument(["--build"], {
  help: "Build database",
  action: "storeTrue"
});

parser.addArgument(["-v", "--verbose"], {
  action: "storeTrue"
});

parser.addArgument(["--trends"], {
  help: "Create [http://www.npmtrends.com/] query (total <= 10)",
  action: "storeTrue"
});


fs.mkdirAsync(cachedir)
.catch((e) => {
  // errno -17: EEXIST
  if(e.errno !== -17){
    throw e;
  }
})
.then(() => {
  main(parser.parseArgs());
});
