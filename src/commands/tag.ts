import * as path from "path"
import fs from "fs"
import { object_library } from "../util/object_library"
import { valid_file_name } from "../command"
import { branch_operations } from "../util/branch_logic"
import { directory_obj } from "../util/interfaces"

/**
 * associates an immutable tag with a commits hash
 * @param {string} tag_name - Name of the tag. To be a valid tag_name the string must also be a valid file name. ie. no spaces etc
 * @param {string} commit_to_tag The hash to associate the tag with.
 * @returns {string} message indicating success or failure
 */
export function tag(this: directory_obj, tag_name: string, commit_to_tag: string | null |undefined , deleting_tag: boolean = false): string {
  const { is_object } = object_library(this)
  const { get_HEAD_hash } = branch_operations(this)

  commit_to_tag = (commit_to_tag === undefined) ? get_HEAD_hash() : commit_to_tag

  if (commit_to_tag === null) {
    throw new Error('Cannot tag with null commit hash')
  }
  if(valid_file_name(tag_name)){
    throw new TypeError('Invalid tag name')
  }

  const tag_path:string = path.join(this.ref_tags_dir,tag_name)

  const tag_path_stats: fs.Stats = fs.statSync(tag_path)
  if (!is_object(commit_to_tag)) {
    throw new Error(`${commit_to_tag} is not a known commit`)
  }

  if (deleting_tag) {
    if (!tag_path_stats.isFile()) {
      throw new Error(`tag: ${tag_name} does not exist. Cannot delete non-existent tag`)
    }
    fs.rmSync(tag_path)
    return `tag: ${tag_name} deleted`
  } else {
    if (tag_path_stats.isFile()) {
      throw new Error(`tag: ${tag_name} already exists. Cannot create duplicate of immutable tag`)
    }
    fs.writeFileSync(tag_path,commit_to_tag)
    return `tag: ${tag_name} created`
  }
}
/**
 * @returns {string[]} sorted list of tag names
 */
export function list_tags(this:directory_obj): string[] {
  const tags_dir = this.ref_tags_dir
  const tag_files = fs.readdirSync(tags_dir)
  return tag_files.sort()
}
