import { node_git_command, commit_type } from "./util/interfaces";
import colors from "colors";

import { current_working_directory, init, repo_exists } from "./init";
import { add } from "./commands/add";
import { status } from "./commands/status";
import { log, log_object } from "./commands/log";
import { merge } from "./commands/merge";
import { list_tags, tag } from "./commands/tag";
import { checkout } from "./commands/checkout";
import { commit } from "./commands/commit";
import { branch } from "./commands/branch";
import { rm } from "./commands/rm";

const command_directory = current_working_directory()

export function valid_file_name(branch: string){
  const regex = /^[^/\0]+$/
  return regex.test(branch)
}

export const commands: node_git_command[] = [
  {
    name: "init",
    description: "Create an empty Git repository or reinitialize an existing one",
    requiresRepo: false,
    action: () => {
      const path_directory: string = process.cwd();
      if (repo_exists(path_directory)) {
        throw new Error('A repository already exists within this directory');
      } else {
        init(path_directory)
        console.log('Repository initialized')
      }
    }
  },
  {
    name: "add",
    description: "Add file contents to the index",
    args: [
      { name: "files...", description: "The files you wish to stage to be committed", variadic: true }
    ],
    action: (files: string[]) => add.call(command_directory, files, [])
  },
  {
    name: "status",
    description: "Show the working tree status",
    action: () => status.call(command_directory),
    format: (result) => result.message
  },
  {
    name: "log",
    description: "Show commit logs",
    action: () => log.call(command_directory),
    format: (branch_log: log_object[]) => {
      return branch_log.map((commit_log: log_object) => {
        let message: string = `commit ${commit_log.commit_hash} `
        if (commit_log.branch_heads) {
          if (commit_log.HEAD) {
            message += `${colors.cyan('HEAD') + colors.yellow('->')}`
          }
          message += `(${colors.green(commit_log.branch_heads.join(colors.yellow(', ')))})`
        }
        if (commit_log.tags) {
          message += `(${colors.green(commit_log.tags.join(colors.yellow(', ')))})` + `\n`
        }
        message += `Date: ${new Date(commit_log.commit.date).toLocaleString()}\n`

        message += `\t${colors.blue(commit_log.commit.description ?? '[no message]')}`
        return message
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
    action: (options: any) => {
      return commit.call(command_directory, options?.message);
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
    action: (files:string[],options: any) => {
      return rm.call(command_directory,files, options?.cached);
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
    action: (tag_name?: string, commit_hash?: string, options?: any):string|string[] => {
      const deleting_tag:boolean = options?.delete ?? false
      if (tag_name) {
        return tag.call(command_directory, tag_name, commit_hash, deleting_tag);
      } else {
        return list_tags.call(command_directory)
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
    action: (branch_name: string | undefined, options: any) => {
      const branch_func = branch.bind(command_directory)
      if (!branch_name) {
        return branch_func();
      } else {
        return branch_func(branch_name, options.delete);
      }
    },
    format: (result: string | string[]) => {
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
    action: (branch_name: string) => checkout.call(command_directory, branch_name)
  },
  {
    name: "merge",
    description: "Join two or more development histories together",
    args: [
      { name: "feature", description: "branch containing feature(s) you care to include" }
    ],
    action: (feature: string) => merge.call(command_directory, feature)
  }
];
