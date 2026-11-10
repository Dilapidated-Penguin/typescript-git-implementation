#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const colors_1 = __importDefault(require("colors"));
const commander_1 = require("commander");
const package_json_1 = require("../package.json");
const command_1 = require("./command");
const init_1 = require("./init");
const program = new commander_1.Command();
program
    .name("node-git")
    .description("An implementation of git using node")
    .version(package_json_1.version);
function showError(message) {
    console.log(colors_1.default.red.bold(`Error: ${message}`));
}
command_1.commands.forEach((cli_command_element) => {
    var _a, _b;
    const current_c = program.command(cli_command_element.name).description(cli_command_element.description);
    (_a = cli_command_element.args) === null || _a === void 0 ? void 0 : _a.forEach((arg) => {
        const argName = arg.variadic ? `<${arg.name}>` : (arg.optional ? `[${arg.name}]` : `<${arg.name}>`);
        current_c.argument(argName, arg.description, arg.default);
    });
    (_b = cli_command_element.options) === null || _b === void 0 ? void 0 : _b.forEach((opt) => {
        current_c.option(opt.flags, opt.description, opt.default);
    });
    current_c.action((...args) => {
        const repo_dir = process.cwd();
        if (cli_command_element.requiresRepo !== false && !(0, init_1.repo_exists)(repo_dir)) {
            return showError("Not a repository");
        }
        try {
            const result = cli_command_element.action(...args);
            // Handle output using custom format or default behavior
            if (result !== undefined && result !== null) {
                const output = cli_command_element.format ? cli_command_element.format(result) : result;
                if (typeof output === "string" && output.length > 0) {
                    console.log(output);
                }
                else if (typeof output === "object" && output.message) {
                    console.log(output.message);
                }
            }
        }
        catch (err) {
            // showError(err.message);
            console.dir(err);
        }
    });
});
program.parse();
