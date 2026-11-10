import { branch_operations } from "../util/branch_logic"
import { commit_type } from "../util/interfaces"
import { object_library } from "../util/object_library"
import { directory_obj } from "../util/interfaces"

import fs from "fs"
import path from "path"

export interface log_object{
  commit: commit_type,
  commit_hash: string,
  tags?: string[]
  branch_heads?: string[],
  HEAD?:boolean,//assumed false|//detached HEADS(heads pointing to a hash) is not included in this implementation
}
/**
 * Returns:
 * an array of commits providing the history of the present branch
 * @returns {history:commit[]}
 */
export function log(this: directory_obj, branch_name?: string):log_object[]{

  const { get_HEAD_branch, get_branch_hash } = branch_operations(this)
  const { get_commit } = object_library(this)
  branch_name = branch_name ?? get_HEAD_branch()
  /*
  Check index file(directory/index) to check present add status
  Use present HEAD pointer to find most recent commit name => use that name to find the most recent commit in the als.objects and then recursively display those commits until one has no parent
  */
  const present_branch_hash: string | null = get_branch_hash(branch_name)
  if (present_branch_hash === null) {
    return []
  }

  let current_commit: commit_type = get_commit(present_branch_hash)!
  //tags
  let tags_map: Map<string, string[]> = directory_to_map(this.ref_tags_dir)
  let head_map: Map<string, string[]> = directory_to_map(this.ref_heads_dir)

  //derive log list
  let resultant_list: log_object[] = [
    {
      commit: current_commit,
      commit_hash: present_branch_hash,
      branch_heads: [branch_name],
      HEAD: (branch_name === get_HEAD_branch()),
      tags: tags_map.get(present_branch_hash)
    }
  ]
  let last_commit: boolean = false
  while (!last_commit) {
    if (current_commit.parent !== undefined) {
      const prev_hash:string=current_commit.parent
      current_commit = get_commit(current_commit.parent)!
      resultant_list.push({
        commit: current_commit,
        commit_hash: prev_hash,
        branch_heads: head_map.get(prev_hash),
        tags: tags_map.get(prev_hash),
      })
    } else {
      last_commit = true
    }
  }
  return resultant_list
}
const directory_to_map = (dir: string): Map<string, string[]> => {
  const directory_list:string[] = fs.readdirSync(dir)
  let resultant_map: Map<string, string[]> = new Map<string, string[]>()

  directory_list.forEach((filename: string) => {
    const hash = fs.readFileSync(path.join(dir, filename), 'utf-8').trim()

    if (resultant_map.has(hash)) {
      resultant_map.get(hash)!.push(filename)
    } else {
      resultant_map.set(hash, [filename])
    }
  })
  return resultant_map
}
