import { commit_type, logger, tree_reference } from "../util/interfaces"
import { object_library } from "../util/object_library"
import { change_operations } from "../util/changes"
import { branch_operations,staging_logic } from "../util/branch_logic"
import { directory_obj,changes } from "../util/interfaces"
import path from "path"
import fs from "fs"

export function commit(this: directory_obj, description?: string) {
  const { get_index } = staging_logic(this)
  const { get_HEAD_branch, get_branch_hash } = branch_operations(this)
  const { save_object, get_object, get_commit } = object_library(this)
  const { flatten_tree, infer_changes } = change_operations(this)

  const index: tree_reference[] = get_index()

  if (index.find(entry => entry.stage !== 0)) {
    throw new Error('fatal: Exiting because of an unresolved conflict.')
  }
  const HEAD_branch: string = get_HEAD_branch()
  const HEAD_hash: string | undefined = get_branch_hash(HEAD_branch) ?? undefined

  let last_commit_directory: Map<string, string> = new Map()
  if (HEAD_hash) {
    const last_commit: commit_type = get_commit(HEAD_hash)!
    last_commit_directory = flatten_tree(get_object(last_commit.tree_hash))
  }
  const index_map: Map<string, string> = flatten_tree(index,{ files_only: true })
  const staged_changes: changes = infer_changes(last_commit_directory, index_map, { only_new_changes: false })
  const staged_changes_occur: boolean = Object.values(staged_changes).find((prop_map) => prop_map.size !== 0) !== undefined

  if (!staged_changes_occur) {
    throw new Error('Nothing is staged to be committed')
  }

  const commit_tree:tree_reference[] = (index.length === 0)?[]:build_commit_tree.call(this, index.map((entry:tree_reference) => {
    return {...entry,reference_type:'file'}
  }))
  const new_commit:commit_type = {
    parent: HEAD_hash,
    additional_parents:fs.existsSync(this.merge_head)? fs.readFileSync(this.merge_head).toString().split('\n') : undefined,
    tree_hash: save_object(commit_tree),
    description: description,
    date:Date.now()
  }
  logger('new commit has been made')
  const new_commit_hash: string = save_object(new_commit)

  //update the branch in the ref/heads file to correspond with new commit to branch and clear the index file of the tree
  const branch_ref_dir: string = path.join(this.ref_heads_dir, HEAD_branch)
  fs.writeFileSync(branch_ref_dir, new_commit_hash)
  fs.rmSync(this.merge_head, { force: true })
  fs.rmSync(this.merge_msg, {force:true})
}

/**
 * builds the final tree for the commit
 * @param ref_list
 * @returns
 */
function build_commit_tree(this: directory_obj, ref_list: tree_reference[]): tree_reference[] {
  const { save_object } = object_library(this)
  const folder_map = new Map<string, tree_reference[]>()

  // Group entries by their parent folder
  for (const entry of ref_list) {

    const segments: string[] = path.relative(this.path, entry.reference_path)
      .split(path.sep)
    // Walk each folder level and ensure it exists in the map
    for (let i = 0; i < segments.length; i++) {
      const folder_path: string = segments.slice(0, i).join(path.sep)

      if (!folder_map.has(folder_path)) {
        folder_map.set(folder_path, [])
      }
    }
    const parent_path: string = segments.slice(0, -1).join(path.sep)
    logger('parent_path: ', parent_path)
    folder_map.get(parent_path)!.push(entry)
  }

  // Process folders deepest first so child hashes are ready for parents
  const sorted_folders: string[] = [...folder_map.keys()]
    .filter(k => k !== "")
    .sort((a: string, b: string) => b.split(path.sep).length - a.split(path.sep).length)
    .concat("")//a single key of "" represents our entire correspond

  for (const folder_path of sorted_folders) {
    if (folder_path === "") { continue }

    const children: tree_reference[] = folder_map.get(folder_path)!

    const folder_hash:string = save_object(children)
    const folder_entry: tree_reference = {
      hash: folder_hash,
      reference_path: folder_path,
      reference_type:'tree'
    }

    // Update parent folder's children to include this folder entry
    const segments:string[] = folder_path.split(path.sep)
    const parent_path: string = segments.slice(0, -1).join(path.sep)

    folder_map.get(parent_path)!.push(folder_entry)
    folder_map.delete(folder_path)
  }
  return folder_map.get("")!
}
