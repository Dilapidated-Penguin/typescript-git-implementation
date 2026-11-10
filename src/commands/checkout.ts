import fs from "fs"
import path from "path"
import { directory_obj, tree_reference,changes } from "../util/interfaces"
import { object_library } from "../util/object_library"
import { branch_operations,staging_logic } from "../util/branch_logic"
import { current_project_state } from "./status"
import { change_operations } from "../util/changes"

export function checkout(this: directory_obj, branch: string) {
  console.log('the branch we are checkout out is ', branch)

  const alt_branch_ref: string = path.join(this.ref_heads_dir, branch)
  const { get_object, get_commit } = object_library(this)
  const { flatten_tree, infer_changes,hash_to_directory } = change_operations(this)
  const { get_HEAD_hash } = branch_operations(this)
  const { get_index, set_index } = staging_logic(this)

  if (!fs.existsSync(alt_branch_ref)) {
    throw new Error(`error: '${branch}' did not match any branches known to node-git`)
  }
  //index_declaration and conflict check
  let index: tree_reference[] = get_index()

  if (index.find((entry) => entry.stage !== 0)) {
    throw new Error('unresolved merge conflict.cannot merge. aborting')
  }

  const feature_branch_hash: string = fs.readFileSync(alt_branch_ref, 'utf-8')
  const last_commit_directory: Map<string, string> = hash_to_directory(get_HEAD_hash() ?? undefined)
  const feature_branch_directory: Map<string, string> = hash_to_directory(feature_branch_hash ?? undefined)

  const index_map: Map<string, string> = flatten_tree(index,{ files_only: true })
  const working_directory: Map<string, string> = current_project_state.bind(this)()

  //locally modified
  const staged_changes: changes = infer_changes(last_commit_directory, index_map, {})
  const unstaged_changes: changes = infer_changes(index_map, working_directory, {})

  let to_create: Map<string, string> = new Map()//dir,hash
  let to_delete: Set<string> = new Set()

  const all_keys = [...new Set([...last_commit_directory.keys(), ...feature_branch_directory.keys(), ...working_directory.keys()])]
  for (const dir of all_keys) {
    const HEAD_hash: string | undefined = last_commit_directory.get(dir)
    const target_hash: string | undefined = feature_branch_directory.get(dir)

    if (HEAD_hash !== target_hash) {
      const in_staged: boolean = Object.values(staged_changes).find((change_prop: Map<string, string>) => change_prop.has(dir))
      const in_unstaged: boolean = Object.values(unstaged_changes).find((change_prop: Map<string, string>) => change_prop.has(dir))
      const locally_changed: boolean = in_staged || in_unstaged

      if (locally_changed) {
        if (in_unstaged) {
          throw new Error(`
          error: The following untracked working tree files would be overwritten by checkout:\n
          ${dir}\n
          Aborting`)
        } else {
          throw new Error(
            `error: Your local changes to the following files would be overwritten by checkout:\n
          ${dir}\n
          Aborting`)
        }
      } else {
        if (target_hash) {
          to_create.set(dir, target_hash)
        }
        if (HEAD_hash) {
          to_delete.add(dir)
        }
      }
    }
  }
  //deleting paths:
  for (const to_delete_path of to_delete) {
    fs.rmSync(to_delete_path)
    let path_dir: string = path.dirname(to_delete_path)
    while ((path_dir !== this.repo_dir) && (path_dir !== path.dirname(path_dir))) {
      const entries: string[] = fs.readdirSync(path_dir)
      if (entries.length > 0) { break }
      fs.rmdirSync(path_dir)
      path_dir = path.dirname(path_dir)
    }
    index = index.filter((index_entry: tree_reference) => {
      return path.normalize(index_entry.reference_path) !== path.normalize(to_delete_path)
    })
  }

  //creating paths:
  for (const [to_create_path, target_hash] of to_create) {
    fs.mkdirSync(path.dirname(to_create_path), { recursive: true })
    const target_data: string = get_object(target_hash)
    fs.writeFileSync(to_create_path, target_data, 'utf-8')
    index.push({
      reference_path: to_create_path,
      hash: target_hash,
      stage: 0
    })
  }
  set_index(index)

  fs.writeFileSync(this.HEAD_dir, branch)
  console.log(`on branch ${branch}`)
}
