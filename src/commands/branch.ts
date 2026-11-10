import * as path from "path"
import fs from "fs"
import colors from "colors"
import { valid_file_name } from "../command"
import { branch_operations } from "../util/branch_logic"
import { directory_obj } from "../util/interfaces"

/**
 * @returns {string[]} a list of all existing branch names as strings
 */
export function branch(): string[]
/**
 * Deletes/Creates the named branch
 * @param {string} branch_name The branch name to delete
 * @param {boolean} branch_to_be_removed
 * @returns {void}
 */
export function branch(branch_name: string, branch_to_be_removed: boolean): string
export function branch(this: directory_obj, branch_name?: string, branch_to_be_removed?: boolean): string | string[] {
  const { get_HEAD_branch, get_branch_hash,is_branch } = branch_operations(this)

  const branches: string[] = fs.readdirSync(this.ref_heads_dir)
  const head_branch: string = get_HEAD_branch()

  if (branch_name === undefined) {
    if (branches.length === 0) {
      return [colors.green(head_branch)]
    } else {
      branches.splice(
        branches.indexOf(head_branch),1,colors.green(head_branch)
      )
      return branches
    }
  }
  if (branches.length === 0) {
    throw Error(`fatal: not a valid object name: 'main'`)
  }

  const branch_exists: boolean = is_branch(branch_name)
  const branch_path: string = path.join(this.ref_heads_dir, branch_name)
  if (branch_to_be_removed) {
    if ((branch_name === head_branch)) {
      throw Error('User cannot delete the branch currently checked out')
    }
    if (!branch_exists) {
      throw Error(`branch ${branch_name} does not exist`)
    }
    fs.rmSync(branch_path)
    return `${branch_name} has been deleted`
  } else {
    if(!valid_file_name(branch_name)){
      throw new TypeError(`${branch_name} is and invalid branch name`)
    }
    if (branch_exists) {
      throw new Error(`branch name: ${branch_name} already exists`)
    }

    fs.writeFileSync(branch_path, get_branch_hash(head_branch) ?? '')//creates new branch and point it to the current head commit
    return `${branch_name} created`
  }
}
