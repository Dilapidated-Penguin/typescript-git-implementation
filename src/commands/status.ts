import * as fs from "fs"
import path from "path"
import colors from "colors"
import { convertPathToPattern, globbySync } from "globby"

import { current_working_directory } from "../init"

import { changes,commit_type,tree_reference } from "../util/interfaces"
import { object_library } from "../util/object_library"
import { staging_logic,branch_operations } from "../util/branch_logic"
import { change_operations} from "../util/changes"
import { directory_obj } from "../util/interfaces"

/**
 * Generate an array of blob references for the index and the current file state.
Create a function to infer the different edits:
** works with and outputs files only**
 */
export function status(this:directory_obj): {
  unstaged_changes?: changes,
  staged_changes?: changes,
  message:string
}{
  const { flatten_tree, infer_changes } = change_operations(this)
  const { get_HEAD_branch, get_branch_hash } = branch_operations(this)
  const { get_object, get_commit } = object_library(this)
  const { get_index } = staging_logic(this)

  let commit_message: string = ''

  const changes_without_unchanged = (key: string, val: string) => {
    key = (key === 'unchanged') ? '' : (key === 'new_files') ? 'new file: ' : `${key}: `
    return `\t${key}${val}`
  }

  const index: tree_reference[] = get_index()
  const index_map: Map<string, string> = flatten_tree(index, { files_only: true })//index
  const mid_merge:boolean = fs.existsSync(this.merge_head)
  //conflict --------------------------
  if (mid_merge) {
    commit_message + 'you have unmerged paths \n'
  }

  const project_working_state: Map<string, string> = current_project_state.bind(this)()//working directory

  const branch_name:string = get_HEAD_branch()
  const branch_hash: string | null = get_branch_hash(branch_name)
  let last_commit_directory:Map<string,string> = new Map()//last commit directory
  commit_message += `on branch ${branch_name}\n`
  if (branch_hash === null) {
    commit_message += 'No commits yet\n'
  } else {
    const last_commit: commit_type = get_commit(branch_hash)!
    last_commit_directory = flatten_tree(get_object(last_commit.tree_hash))
  }

  const inferred_staged: changes = infer_changes(last_commit_directory, index_map, {only_new_changes:false})
  const index_changes_occur: boolean = Object.values(inferred_staged).find((prop_map) => prop_map.size !== 0) !== undefined

  const unstaged_changes: changes = infer_changes(index_map, project_working_state, {only_new_changes:false})
  const untracked_files: Map<string, string> = new Map(unstaged_changes.new_files)
  unstaged_changes.new_files = new Map()

  const unstaged_changes_occur: boolean = Object.values(unstaged_changes).find((prop_map) => prop_map.size !== 0) !== undefined
  const working_tree_clean: boolean = (!index_changes_occur) && (!unstaged_changes_occur) && (untracked_files.size === 0)
  if (working_tree_clean) {
    commit_message += 'nothing to commit(create/copy files to track), working tree clean\n'
    return {
      message: commit_message
    }
  }

  //changes to be committed:
  if (index_changes_occur) {
    commit_message += `Changes to be committed:\n   `
    commit_message += colors.red(output_changes(inferred_staged, changes_without_unchanged)) + `\n`
  }

  //changes not staged:
  if (unstaged_changes_occur) {
    commit_message += `changes not staged:\n   `
    commit_message += colors.red(output_changes(unstaged_changes, changes_without_unchanged)) + `\n`
  }

  //untracked files:
  if (untracked_files.size !== 0) {
    commit_message += `untracked files:\n   (use "node-git add <file>..." to stage)\n`
    commit_message += colors.red(output_record(untracked_files,undefined)) + `\n`
  }

  //merge conflict
  if (mid_merge) {
    commit_message += `
    Unmerged paths:\n
      (use "git add <file>..." to mark resolution)\n
      (use "git rm <file>..." to mark resolution)\n
    \t${fs.readFileSync(this.merge_msg)}
    `
  }
  return {
    message: commit_message,
    unstaged_changes: unstaged_changes,
    staged_changes: inferred_staged,
  }
}

//helper-------------------------------------------------------------
/**
 * returns a map where Map<string,string> = Map<directory,hash>.
 * Each entry represent a file in the project directory
 * The repo directory is ignored as well as all paths specified in a .gitignore file wihtin the project
 * @param project_path
 * @returns {Map<string,string>} Map<directory,hash>.
 */
export function current_project_state(this:directory_obj,project_path?: string): Map<string, string>{
  const { derive_object_hash } = object_library(this)

  project_path = project_path ?? process.cwd()
  const results:string[] = globbySync(convertPathToPattern(project_path), {
    expandDirectories:true,
    ignore: [current_working_directory(project_path).repo_dir],
    ignoreFiles: '.gitignore',
    cwd:project_path
  })

  let resultant_map:Map<string,string> = new Map<string, string>()

  for (const file_path of results) {
    const file_data: string = fs.readFileSync(file_path, 'utf-8')
    resultant_map.set(file_path, derive_object_hash(file_data).hash)
  }
  return resultant_map
}
export function output_record(record: Map<string, string>,status?:string, output_format?:(key:string,val:string)=>string,working_path:string = process.cwd()): string{
  return [...record.keys()]
    .map((directory: string) => {
      const record_dir: string = path.relative(working_path, directory)
      if (output_format) {
        return output_format(status??'',record_dir.replace(/\\/g, '/'))
      }
      return `\t${status?`${status}: `:''}${record_dir.replace(/\\/g, '/')}`
    }).join(`\n`)
}

export function output_changes(change_obj: changes,output_format?:(key:string,val:string)=>string): string {
  return Object.entries(change_obj)
    .filter(([change_key,record])=>record.size>0)
    .map(([change_key, record]) => {
      return output_record(record,change_key,output_format)
      })
    .join('\n')
}
