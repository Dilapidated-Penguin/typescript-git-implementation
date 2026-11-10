import fs from "fs"
import * as path from "path"
import { tree_reference,directory_obj } from "./interfaces"

export function branch_operations(path_directories:directory_obj){
  const hash_to_dir = (hash: string): string[]=>{
    return [hash.slice(0,2),hash.slice(2)]
  }
  const get_HEAD_branch = ():string=>{
    return fs.readFileSync(path_directories.HEAD_dir,'utf-8')
  }
  const is_branch = (branch_name: string): boolean => {
    try {
      return fs.readdirSync(path_directories.ref_heads_dir).includes(branch_name)
    } catch {
      return false
    }
  }
  const get_branch_hash = (branch_name: string): string | null=>{
    const branch_dir: string = path.join(path_directories.ref_heads_dir, branch_name)
    if (!fs.existsSync(branch_dir)) { return null }

    const last_commit:string = fs.readFileSync(branch_dir,'utf-8')
    return last_commit || null
  }
  const get_HEAD_hash = (): string | null =>{
    return get_branch_hash(get_HEAD_branch())
  }
  return { hash_to_dir, get_HEAD_branch, is_branch, get_branch_hash, get_HEAD_hash }
}
//staging logic:-----
export function staging_logic(path_directories: directory_obj) {
  const get_index = ():tree_reference[]=>{
    const raw_index = fs.readFileSync(path_directories.index_dir, 'utf-8')
    return JSON.parse(raw_index) as tree_reference[]
  }
  const set_index = (data:tree_reference[])=>{
    fs.writeFileSync(path_directories.index_dir,JSON.stringify(data))
  }

  const append_index = (new_entries: tree_reference[]) => {
    let index:tree_reference[] = get_index()
    index = index
      .filter((index_el:tree_reference) => {
        return new_entries.find((new_entry:tree_reference)=>new_entry.reference_path === index_el.reference_path) === undefined
      })
    index.push(...new_entries)
    set_index(index)
  }

  return {get_index,set_index,append_index}
}
