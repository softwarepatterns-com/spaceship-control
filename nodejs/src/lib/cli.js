import fs from "fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

export const getArgs = () => {
  const argv = yargs(hideBin(process.argv))
    .option("token", {
      alias: "t",
      description: "The token for authentication",
      type: "string",
      demandOption: true, // makes the argument mandatory
    })
    .option("endpoint", {
      alias: "e",
      description: "The API endpoint",
      type: "string",
      demandOption: true,
    })
    .option("cert", {
      alias: "c",
      description: "Path to the certificate file",
      type: "string",
      demandOption: true,
      coerce: (path) => {
        try {
          return fs.readFileSync(path);
        } catch (error) {
          throw new Error(
            `Failed to read certificate file at ${path}: ${error.message}`
          );
        }
      },
    })
    .help()
    .alias("help", "h").argv;

  // Use the parsed arguments
  console.log(`Token: ${argv.token}`);
  console.log(`Endpoint: ${argv.endpoint}`);
  console.log(`Certificate: \n${argv.cert ? "found" : "not found"}`);

  return argv;
};
