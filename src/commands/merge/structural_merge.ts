import {commit_type,changes,tree_reference,directory_obj} from "../../util/interfaces"
import { change_operations } from "../../util/changes"
import { branch_operations } from "../../util/branch_logic"
import { object_library } from "../../util/object_library"
import { commit } from "../commit"


export function structural_merge_helpers(path_directories: directory_obj) {
  const { flatten_tree, infer_changes } = change_operations(path_directories)
  const { get_object,get_commit } = object_library(path_directories)
  const { get_branch_hash } = branch_operations(path_directories)

  const return_tree_diff = (common_commit: commit_type, future_commit: commit_type): changes => {
    const future_commit_tree:tree_reference[] = get_object(future_commit.tree_hash)
    const common_commit_tree:tree_reference[] = get_object(common_commit.tree_hash)

    const previous_commit_state:Map<string,string> = flatten_tree(common_commit_tree)
    const future_commit_state:Map<string,string> = flatten_tree(future_commit_tree)

    return infer_changes(previous_commit_state,future_commit_state,{})
  }

  const return_common_ancestor = (branch_name:string,feature_name:string):string|undefined=>{
    const return_branch_hash = (branch_name: string):string[] => {
      let commit_hash: string | null = get_branch_hash(branch_name)
      if (commit_hash === null) {
        return []
      }
      let branch_list: string[] = [commit_hash]

      let has_parent: boolean = true
      while (has_parent) {
        const current_commit: commit_type = get_commit(commit_hash)!
        if (current_commit.parent !== undefined) {
          branch_list.push(current_commit.parent)
          commit_hash = current_commit.parent
        } else {
          has_parent = false
        }
      }
      return branch_list
    }

    const main_branch: string[] = return_branch_hash(branch_name)
    const feature_branch: string[] = return_branch_hash(feature_name)
    let shared_ancestor:string|undefined = undefined
    for (const commit_hash of main_branch) {
      shared_ancestor = feature_branch.find((feature_hash: string) => {
        return feature_hash === commit_hash
      })
      if (shared_ancestor !== undefined) {
        break
      }
    }
    return shared_ancestor
  }

  //
  const BASE = 4, OURS = 2, THEIRS = 1

  const conflictLabels: Record<number, string> = {
      [BASE | OURS | THEIRS]: "both modified",
      [BASE | THEIRS]:        "deleted by us",
      [BASE | OURS]:           "deleted by them",
      [OURS | THEIRS]:         "both added",
      [BASE]:                  "both deleted",
      [OURS]:                  "added by us",
      [THEIRS]:                "added by them",
  }
  const get_conflict_label = (has_base:tree_reference | undefined,has_theirs:tree_reference | undefined,has_ours:tree_reference | undefined):string => {
    const key = (has_base ? BASE : 0) | (has_ours ? OURS : 0) | (has_theirs ? THEIRS : 0);
    return conflictLabels[key] ?? "unknown conflict state"
  }
  return {return_tree_diff,return_common_ancestor,get_conflict_label}
}
