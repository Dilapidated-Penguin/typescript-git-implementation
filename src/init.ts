import fs from "fs";
import hidefile from "hidefile";
import { mkdirSync } from "node:fs";
import * as path from "path";
import { directory_obj } from "./util/interfaces";

import config from "./util/config.json";

import { add } from "./commands/add";
import { branch } from "./commands/branch";
import { checkout } from "./commands/checkout";
import { commit } from "./commands/commit";
import { log } from "./commands/log";
import { merge } from "./commands/merge";
import { status } from "./commands/status";
import { list_tags, tag } from "./commands/tag";

export function init(repo_directory?:string) {

  const repo_paths:directory_obj = current_working_directory(repo_directory)
  const structure = [
    repo_paths.ref_heads_dir,
    repo_paths.ref_tags_dir,
    repo_paths.object_dir,
  ];

  structure.map((dir) => {
    return mkdirSync(dir,{recursive:true})
  })

  fs.writeFileSync(repo_paths.index_dir, JSON.stringify([]), 'utf-8')
  fs.writeFileSync(repo_paths.HEAD_dir, 'main', 'utf-8')
  hidefile.hideSync(repo_paths.repo_dir)
}

export function repo_exists(path_to_dir:string):boolean{
  const path_stats = fs.statSync(path_to_dir)
  if(path_stats.isDirectory()){
    return fs.existsSync(path.join(path_to_dir,config.repo_dir))
  }else{
    throw(console.error(`${path_to_dir} is an invalid directory`))
  }
}

export function current_working_directory(working_directory: string = process.cwd()): directory_obj{
  const default_repo: string = path.join(working_directory,config.repo_dir)

  return {
    ref_heads_dir: path.join(default_repo,...config.ref_heads_dir),
    ref_tags_dir: path.join(default_repo,...config.ref_tags_dir),
    object_dir:path.join(default_repo,config.object_dir),
    HEAD_dir: path.join(default_repo,config.HEAD_dir),
    index_dir:path.join(default_repo,config.index_dir),
    repo_dir: default_repo,
    path: working_directory,
    merge_head: path.join(default_repo, config.merge_head),
    merge_msg: path.join(default_repo, config.merge_msg)
  }
}
export function Repository(repo_dir: string) {
  const repo_paths = current_working_directory(repo_dir)

  const bind = (fn: Function) => fn.bind(repo_paths)
  init(repo_dir)

  return {
    repo_paths,
    add: bind(add),
    status: bind(status),
    log: bind(log),
    merge: bind(merge),
    list_tags: bind(list_tags),
    tag: bind(tag),
    checkout: bind(checkout),
    commit: bind(commit),
    branch: bind(branch),
  }
}
