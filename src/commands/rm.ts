import path from "path"
import { globbySync } from "globby"
import { directory_obj } from "../util/interfaces"
import { tree_reference } from "../util/interfaces"
import { staging_logic } from "../util/branch_logic"
import fs from "fs"

export function rm(this: directory_obj, file_names: string[], remove_from_index: boolean) {
  const { get_index,set_index } = staging_logic(this)
  const path_glob_list: string[] = file_names.map((current_path: string) => {
    const rel_path = path.relative(this.path, current_path)
    return rel_path.replace(/\\/g, '/')
  })

  const matched_files:string[] = path_glob_list.flatMap((path_glob: string) => {
    const path_files:string[] = globbySync(path_glob_list, {
      expandDirectories: true,
      ignoreFiles: '.gitignore',
      cwd:this.path
    })

    if (path_files.length === 0) {
      throw new Error(`fatal: pathspec '${path_glob}' did not match any files`)
    } else {
      return path_files
    }
  })
  matched_files.map((file_to_delete: string) => {
    file_to_delete = path.join(this.path, file_to_delete)
    if (remove_from_index) {
      const updated_index:tree_reference[] = get_index().filter((entry: tree_reference) => {
        return path.normalize(entry.reference_path) !== path.normalize(file_to_delete)
      })
      set_index(updated_index)
    } else {
      fs.rmSync(file_to_delete)

    }
  })
}
