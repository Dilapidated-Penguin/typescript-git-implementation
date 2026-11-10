#!/usr/bin/env node
import colors from "colors";
import { Command } from "commander";
import { version } from "../package.json";
import { commands } from "./command";
import { node_git_command } from "./util/interfaces";
import { repo_exists } from "./init";

const program = new Command();

program
  .name("node-git")
  .description("An implementation of git using node")
  .version(version);

function showError(message: string) {
  console.log(colors.red.bold(`Error: ${message}`));
}

commands.forEach((cli_command_element:node_git_command) => {
  const current_c = program.command(cli_command_element.name).description(cli_command_element.description);

  cli_command_element.args?.forEach((arg) => {
    const argName = arg.variadic ? `<${arg.name}>` : (arg.optional ? `[${arg.name}]` : `<${arg.name}>`);
    current_c.argument(argName, arg.description, arg.default);
  });

  cli_command_element.options?.forEach((opt) => {
    current_c.option(opt.flags, opt.description, opt.default);
  });

  current_c.action((...args) => {
    const repo_dir = process.cwd();

    if (cli_command_element.requiresRepo !== false && !repo_exists(repo_dir)) {
      return showError("Not a repository");
    }

    try {
      const result = cli_command_element.action(...args);
      // Handle output using custom format or default behavior
      if (result !== undefined && result !== null) {
        const output = cli_command_element.format ? cli_command_element.format(result) : result;
        if (typeof output === "string" && output.length > 0) {
          console.log(output);
        } else if (typeof output === "object" && output.message) {
           console.log(output.message);
        }
      }
    } catch (err: any) {
      // showError(err.message);
      console.dir(err)
    }
  });
});

program.parse();
