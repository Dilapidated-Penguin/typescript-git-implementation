import { commit_type,changes, tree_reference, directory_obj } from "../../util/interfaces";
import { change_operations } from "../../util/changes";
import { object_library } from "../../util/object_library";

export function index_logic(path_directories: directory_obj) {
  const { hash_to_directory } = change_operations(path_directories)
  return {
    retrieve_references: (ancestor_commit_hash:string):tree_reference[]=>{
      const ancestor_tree:Map<string,string> = hash_to_directory(ancestor_commit_hash)

      let res:tree_reference[] = []
      for (const [path,hash] of ancestor_tree) {
        res.push({
          reference_type:"file",
          hash:hash,
          reference_path:path,
          stage:0
        })
      }
      return res
    },
    changes_to_index: (current_changes: changes, blob_stage: number): tree_reference[]=>{
      let index_blobs: tree_reference[] = []

      Object.keys(current_changes).forEach((property:string)=>{
        const current_change_property:Map<string,string> = current_changes[property as keyof changes]
        for (const [entry_directory,entry_hash] of current_change_property) {
          index_blobs.push({
            reference_type:'file',
            hash:entry_hash,
            reference_path:entry_directory,
            stage:blob_stage
          })
        }
      })
      return index_blobs
    },
    changes_to_map: (current_changes: changes, blob_stage: number): Map<string, tree_reference> => {
      let reference_list: Map<string,tree_reference> = new Map()

      Object.keys(current_changes).forEach((property:string)=>{
        const current_change_property:Map<string,string> = current_changes[property as keyof changes]
        for (const [entry_directory,entry_hash] of current_change_property) {
          reference_list.set(entry_directory,{
            reference_type:'file',
            hash:entry_hash,
            reference_path: entry_directory,
            stage: blob_stage
          })
        }
      })
      return reference_list
    },
    index_to_map: (index: tree_reference[]): Map<string, tree_reference> => {
      const index_map: Map<string, tree_reference> = new Map()
      for (const entry of index) {
        index_map.set(entry.reference_path,entry)
      }
      return index_map
    }
  }

}
