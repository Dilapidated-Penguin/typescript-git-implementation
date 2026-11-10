"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commands = void 0;
exports.valid_file_name = valid_file_name;
const colors_1 = __importDefault(require("colors"));
const init_1 = require("./init");
const add_1 = require("./commands/add");
const status_1 = require("./commands/status");
const log_1 = require("./commands/log");
const merge_1 = require("./commands/merge");
const tag_1 = require("./commands/tag");
const checkout_1 = require("./commands/checkout");
const commit_1 = require("./commands/commit");
const branch_1 = require("./commands/branch");
const rm_1 = require("./commands/rm");
const command_directory = (0, init_1.current_working_directory)();
function valid_file_name(branch) {
    const regex = /^[^/\0]+$/;
    return regex.test(branch);
}
exports.commands = [
    {
        name: "init",
        description: "Create an empty Git repository or reinitialize an existing one",
        requiresRepo: false,
        action: () => {
            const path_directory = process.cwd();
            if ((0, init_1.repo_exists)(path_directory)) {
                throw new Error('A repository already exists within this directory');
            }
            else {
                (0, init_1.init)(path_directory);
                console.log('Repository initialized');
            }
        }
    },
    {
        name: "add",
        description: "Add file contents to the index",
        args: [
            { name: "files...", description: "The files you wish to stage to be committed", variadic: true }
        ],
        action: (files) => add_1.add.call(command_directory, files, [])
    },
    {
        name: "status",
        description: "Show the working tree status",
        action: () => status_1.status.call(command_directory),
        format: (result) => result.message
    },
    {
        name: "log",
        description: "Show commit logs",
        action: () => log_1.log.call(command_directory),
        format: (branch_log) => {
            return branch_log.map((commit_log) => {
                var _a;
                let message = `commit ${commit_log.commit_hash} `;
                if (commit_log.branch_heads) {
                    if (commit_log.HEAD) {
                        message += `${colors_1.default.cyan('HEAD') + colors_1.default.yellow('->')}`;
                    }
                    message += `(${colors_1.default.green(commit_log.branch_heads.join(colors_1.default.yellow(', ')))})`;
                }
                if (commit_log.tags) {
                    message += `(${colors_1.default.green(commit_log.tags.join(colors_1.default.yellow(', ')))})` + `\n`;
                }
                message += `Date: ${new Date(commit_log.commit.date).toLocaleString()}\n`;
                message += `\t${colors_1.default.blue((_a = commit_log.commit.description) !== null && _a !== void 0 ? _a : '[no message]')}`;
                return message;
            }).join(`\n`);
        }
    },
    {
        name: "commit",
        description: "Record changes to the repository",
        // args: [
        //   { name: "message", description: "message of the commit", optional: true }
        // ],
        options: [
            { flags: "-m, --message [char]", description: "commit message" }
        ],
        action: (options) => {
            return commit_1.commit.call(command_directory, options === null || options === void 0 ? void 0 : options.message);
        }
    },
    {
        name: "rm",
        description: "Remove files from the index or working directory",
        args: [
            { name: "files...", description: "The files you wish to stage to be committed", variadic: true }
        ],
        options: [
            { flags: "-c, --cached", description: "remove files from the index" }
        ],
        action: (files, options) => {
            return rm_1.rm.call(command_directory, files, options === null || options === void 0 ? void 0 : options.cached);
        }
    },
    {
        name: "tag",
        description: "Create, list, delete a tag object",
        args: [
            { name: "tag-name", description: "the tag name" },
            { name: "commit-hash", description: "the hash of the commit to be tagged", optional: true }
        ],
        options: [
            { flags: "-d, --delete", description: "delete existing tag" }
        ],
        action: (tag_name, commit_hash, options) => {
            var _a;
            const deleting_tag = (_a = options === null || options === void 0 ? void 0 : options.delete) !== null && _a !== void 0 ? _a : false;
            if (tag_name) {
                return tag_1.tag.call(command_directory, tag_name, commit_hash, deleting_tag);
            }
            else {
                return tag_1.list_tags.call(command_directory);
            }
        }
    },
    {
        name: "branch",
        description: "List, create, or delete branches",
        args: [
            { name: "branch", description: "name of the branch to be created/deleted", optional: true }
        ],
        options: [
            { flags: "-d, --delete", description: "delete existing branch" }
        ],
        action: (branch_name, options) => {
            const branch_func = branch_1.branch.bind(command_directory);
            if (!branch_name) {
                return branch_func();
            }
            else {
                return branch_func(branch_name, options.delete);
            }
        },
        format: (result) => {
            if (Array.isArray(result)) {
                return result.join('\n');
            }
            return result;
        }
    },
    {
        name: "checkout",
        description: "Switch branches or restore working tree files",
        args: [
            { name: "branch", description: "branch to checkout" }
        ],
        action: (branch_name) => checkout_1.checkout.call(command_directory, branch_name)
    },
    {
        name: "merge",
        description: "Join two or more development histories together",
        args: [
            { name: "feature", description: "branch containing feature(s) you care to include" }
        ],
        action: (feature) => merge_1.merge.call(command_directory, feature)
    }
];
