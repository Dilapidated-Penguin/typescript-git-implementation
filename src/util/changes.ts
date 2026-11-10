import { tree_reference, changes, change_plus_unchanged, directory_obj } from "./interfaces"
import { object_library } from "./object_library"

interface flatten_option{
  files_only?:boolean
}
interface infer_options{
  staged_changes?: tree_reference[],
  only_new_changes?: boolean,
}

export function change_operations(path_directories: directory_obj) {
  const { get_object,get_commit } = object_library(path_directories)

  /**
   *
   * @param tree_to_flatten an array containing references to files and folders
   * @param options
   * @returns Map<string,string> = Map< reference_path, hash>, a flat list of all the files referenced
   */
  const flatten_tree = (tree_to_flatten: tree_reference[],options:flatten_option={}): Map<string, string>=>{
    let resultant_flat_map = new Map<string,string>()

    const dump_to_res = (outer_tree: tree_reference[]) => {
      for (const ref of outer_tree) {
        if((ref.reference_type === 'file')||(options?.files_only)){
          resultant_flat_map.set(ref.reference_path.replace(/\\/g, '/'), ref.hash)
        }else if(ref.reference_type === 'tree'){
          const tree_object: tree_reference[] = get_object(ref.hash)!
          dump_to_res(tree_object)
        }
      }
    }
    dump_to_res(tree_to_flatten)
    return resultant_flat_map
  }

  const hash_to_directory = (commit_hash: string|undefined): Map<string,string> => {
    let latest_commit
    if (commit_hash && (latest_commit = get_commit(commit_hash))) {
      const commit_tree: tree_reference[] = get_object(latest_commit.tree_hash) as tree_reference[]
      return flatten_tree(commit_tree)
    }
    return new Map()
  }
  /**
   * Deletes all entries within directory_map which are within the staged_changes array and returns the filtered directory_map
   * @param staged_changes
   * @param directory_map
   */
  const filter_staged_changes = (staged_changes: tree_reference[], directory_map: Map<string, string>): Map<string, string>=>{
    for (const ref of staged_changes) {
      const directory_match: string | undefined = directory_map.get(ref.reference_path.replace(/\\/g, '/'))
      if (directory_match === ref.hash) {
        directory_map.delete(directory_match)
      }
    }

    return directory_map
  }


  function infer_changes(previous_commit:Map<string,string>, new_changes:Map<string,string>,options:infer_options,return_unstaged:true):change_plus_unchanged
  /**
   * @description infer_changes calculates the difference between two project states represented as two maps:
   *  where (Map<string,string>) =>Map<directory,hash>
   * @param previous_commit
   * @param new_changes
   * @returns {changes}

   */
  function infer_changes(previous_commit: Map<string, string>, new_changes: Map<string, string>, options: infer_options):changes
  function infer_changes(previous_commit: Map<string, string>, new_changes: Map<string, string>, options: infer_options, return_unstaged: boolean = false): changes | change_plus_unchanged {
    previous_commit = new Map(previous_commit)
    new_changes = new Map(new_changes)
    let resultant_changes:changes = {
      modified:new Map<string,string>,
      new_files:new Map<string,string>,
      deleted: new Map<string, string>,
    }
    let unchanged_files = new Map<string,string>
    if (options?.staged_changes !== undefined) {
      new_changes = filter_staged_changes(options.staged_changes, new_changes)
    }
    for (const [new_change_path, new_change_hash] of new_changes) {
      const old_hash:string|undefined = previous_commit.get(new_change_path)

      if (old_hash !== undefined) {
        if(old_hash !== new_change_hash){
          resultant_changes.modified.set(new_change_path,new_change_hash)
        }
        if (return_unstaged) {
          unchanged_files.set(new_change_path,new_change_hash)
        }
      } else {
        //no file existed at this path ∴ new file
        resultant_changes.new_files.set(new_change_path,new_change_hash)
      }
      previous_commit.delete(new_change_path)
    }
    if ((options === undefined) || (options?.only_new_changes === false)) {
      resultant_changes.deleted = previous_commit
    }
    return (return_unstaged) ? { ...resultant_changes, unchanged: unchanged_files } : resultant_changes
  }

  return {flatten_tree,filter_staged_changes,infer_changes,hash_to_directory}
}
