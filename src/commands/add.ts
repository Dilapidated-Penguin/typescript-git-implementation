import path from "path"
import { convertPathToPattern, globbySync } from "globby"
import fs from "fs"

import { directory_obj, tree_reference } from "../util/interfaces"
import { staging_logic } from "../util/branch_logic"
import { object_library } from "../util/object_library"

/**
 * @param {string[]} input_paths The list of paths the user is looking to add
 * @param {string[]} to_ignore The list of files and directories the user is looking to be ignored.
 * A list of tree_references is generated for the files to be committed and then written to the index file
 * All files staged to be committed are made into blobs and those blobs are hashed and placed into the objects directory
 * Any files that have been deleted in the file system have any reference to them removed from the index
 */
export function add(this: directory_obj, input_paths: string[], to_ignore: string[]) {
  const { save_object } = object_library(this)
  const { append_index,get_index,set_index } = staging_logic(this)

  to_ignore.push(this.repo_dir.replace(/\\/g, '/'))
  to_ignore = to_ignore.map((ignore_path: string) => {
    return convertPathToPattern(ignore_path)
  })

  const path_glob_list: string[] = input_paths.map((current_path: string) => {
    const rel_path = path.relative(this.path, current_path)
    return rel_path.replace(/\\/g, '/')
  })


  let index_deletion:string[] = []
  const matched_files = path_glob_list.flatMap((path_glob: string) => {
    const path_files:string[] = globbySync(path_glob, {
      expandDirectories: true,
      ignore: to_ignore,
      ignoreFiles: '.gitignore',
      cwd:this.path
    })

    if (path_files.length === 0) {
      const index_contains_glob: boolean = get_index().find((index_entry: tree_reference) => {
        return path.normalize(index_entry.reference_path)  === path.normalize(path.join(this.path,path_glob))
      }) !== undefined

      if (index_contains_glob) {
        index_deletion.push(path.normalize(path.join(this.path,path_glob)))
        return []
      } else {
        throw new Error(`fatal: pathspec '${path_glob}' did not match any files`)
      }
    } else {
      return path_files
    }
  })

  const index_addition: tree_reference[] = matched_files.flatMap((rel_file_path: string) => {
    try {
      const file_data:string = fs.readFileSync(rel_file_path, 'utf-8')
      return {
        reference_path: path.join(this.path,rel_file_path).replace(/\\/g, '/'),
        hash: save_object(file_data),
        stage:0
      }
    } catch (err) {
      if (err instanceof Error && 'code' in err) {
        switch ((err as NodeJS.ErrnoException).code) {
          case 'ENOENT':
            throw new Error(`file: ${rel_file_path} not found`)
          case 'EACCES':
            throw new Error(`permission denied for file: ${rel_file_path}`)
          default:
            throw new Error(`unexpected error, code:${err.code}`)
        }
      }
      return []// non-Error throws (shouldn't happen, but satisfies return type)
    }

  })
  index_deletion.map((path_glob: string) => {
    const current_index:tree_reference[]= get_index()
    const updated_index:tree_reference[] = current_index.filter((entry: tree_reference) => {
      return path.normalize(entry.reference_path) !== path_glob
    })
    if (updated_index === current_index) {
      throw new Error(`fatal: pathspec ${path_glob} did not match any files`)
    }
    set_index(updated_index)
  })
  console.dir(index_addition)
  append_index(index_addition)
}
