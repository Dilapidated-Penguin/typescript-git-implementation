import fs from "fs"
import { branch_operations, staging_logic } from "../util/branch_logic"
import { object_library } from "../util/object_library"
import { directory_obj,commit_type,tree_reference, changes, logger } from "../util/interfaces"
import { structural_merge_helpers} from "./merge/structural_merge"
import { hunk, merge_helper } from "./merge/merge"
import { index_logic } from "./merge/index_logic"
import { commit } from "./commit";

export function merge(this: directory_obj, feature_head: string, master_head?: string) {
  const { calc_hunks, three_way_merge, structural_merge } = merge_helper()
  const { get_commit, get_object, clear_directory, derive_object_hash } = object_library(this)
  const { retrieve_references, changes_to_map, index_to_map } = index_logic(this)
  const {return_common_ancestor,return_tree_diff,get_conflict_label} = structural_merge_helpers(this)
  const { is_branch, get_branch_hash, get_HEAD_branch } = branch_operations(this)
  const { set_index } = staging_logic(this)
  function hash_sequence(hash: string): string[]{
    return (get_object(hash) as string).split(`\n`)
  }
  master_head = master_head ?? get_HEAD_branch()
  if(!is_branch(master_head)){
    throw new Error(`branch ${master_head} does not exist`)
  }
  if(!is_branch(feature_head)){
    throw new Error(`branch ${feature_head} does not exist`)
  }
  if (feature_head === master_head) {
    return
  }

  const master_hash: string | null = get_branch_hash(master_head)
  const feature_hash: string | null = get_branch_hash(feature_head)
  if (!master_hash) {
   throw Error(`Merge Error: branch ${master_head} contains no commits yet`)
  }
  if(!feature_hash){
    throw Error(`Merge Error: branch ${feature_head} contains no commits yet`)
  }
  //generate diffs for the og=>feature + og=>main and then deal with any tree conflicts
  const master_commit:commit_type = get_commit(master_hash)!
  const feature_commit:commit_type = get_commit(feature_hash)!
  const common_ancestor_hash: string | undefined = return_common_ancestor(master_head, feature_head)

  if (common_ancestor_hash === undefined) {
    throw new Error('fatal: refusing to merge unrelated histories')
  }

  const common_ancestor: commit_type = get_commit(common_ancestor_hash)!

  const ancestor_master_diff:changes = return_tree_diff(common_ancestor,master_commit)
  const ancestor_feature_diff:changes = return_tree_diff(common_ancestor,feature_commit)
  /*recognise tree conflicts:
  if any file:
    deletion conflicts: modified, renamed in one branches differences is deleted in another(directory conflict)

    new_file conflicts: the new files made somehow intersect with the others directories
      (the file inherently doesn't intersect with any files in its own commit changes)

    modified conflicts: a file edited in one file is also edited by another
    */
  const initial_index:Map<string,tree_reference> = index_to_map(retrieve_references(common_ancestor_hash))
  const master_changes_blobs:Map<string,tree_reference> = changes_to_map(ancestor_master_diff,2)
  const feature_changes_blobs: Map<string,tree_reference> = changes_to_map(ancestor_feature_diff, 3)

  const structural_merge_result = structural_merge(initial_index,master_changes_blobs,feature_changes_blobs)
  console.dir(structural_merge_result)

  if (!structural_merge_result.conflict_flag) {
    clear_directory()
    set_index(structural_merge_result.index)
    structural_merge_result.index.map((entry: tree_reference) => {
      fs.writeFileSync(entry.reference_path, get_object(entry.hash)!)
    })
    commit.call(this, `Merge branch ${feature_head} into ${master_head}`)
    console.log(`Merge completed successfully`)
    return
  }

  const index_map_keys: string[] = [...new Set(structural_merge_result.index.map((blob) => blob.reference_path))]
  let merge_output: string = ''
  clear_directory()
  let files_changes:number = 0
  for (const reference_path of index_map_keys) {
    const conflict_exists: boolean = structural_merge_result.index.some((entry: tree_reference) => {
      return entry.stage !== 0
    })

    if (!conflict_exists) {
      const file_ref:tree_reference = structural_merge_result.index.find((entry) => entry.reference_path === reference_path)!
      fs.writeFileSync(reference_path, (get_object(file_ref.hash) as string))
      continue
    }
    files_changes++
    function predicate_stage(stage:number){
      return (entry:tree_reference)=>{
        return (entry.stage === stage) && (entry.reference_path === reference_path)
      }
    }
    const root_blob: tree_reference | undefined = structural_merge_result.index.find(predicate_stage(1))
    const master_blob: tree_reference | undefined = structural_merge_result.index.find(predicate_stage(2))
    const feature_blob: tree_reference | undefined = structural_merge_result.index.find(predicate_stage(3))

    merge_output += `${get_conflict_label(root_blob,feature_blob,master_blob)}: ${reference_path} \n`

    let root_sequence: string[] = []
    if (root_blob) { root_sequence = hash_sequence(root_blob.hash) }
    let master_sequence: string[] = []
    if (master_blob) { master_sequence = hash_sequence(master_blob.hash) }
    let feature_sequence: string[] = []
    if (feature_blob) { feature_sequence = hash_sequence(feature_blob.hash) }

    const root_master_hunks:hunk[] = calc_hunks(root_sequence,master_sequence)
    const root_feature_hunks: hunk[] = calc_hunks(root_sequence, feature_sequence)

    let file_merge_results:merge_helper = three_way_merge(root_sequence,root_feature_hunks,root_master_hunks,feature_head)
    const file_result: string = file_merge_results.final_sequence.join(`\n`)
    logger('file result')
    console.dir(file_result)

    if (!file_merge_results.file_contains_conflict) {
      structural_merge_result.index = structural_merge_result.index.filter((entry: tree_reference) => {
        return entry.reference_path !== reference_path
      })
      structural_merge_result.index.push({
        reference_path: reference_path,
        hash: derive_object_hash(file_result).hash,
        stage:0
      })
    }

    //update the file in the file directory
    fs.writeFileSync(reference_path, file_result)
  }
  fs.writeFileSync(this.merge_head, feature_head)
  fs.writeFileSync(this.merge_msg, merge_output)
  console.log(merge_output)
  console.log(`${files_changes} files changed`)
  console.log(`Failed to automerge branch ${feature_head} into ${master_head}`)
}
