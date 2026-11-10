import { commit_type, directory_obj, logger, tree_reference } from "../util/interfaces"
import path from "path"
import fs from "fs"
import { branch_operations } from "./branch_logic"
import pako from "pako"
import { hasher } from 'node-object-hash'

export function object_library(path_directories: directory_obj) {
  const { hash_to_dir } = branch_operations(path_directories)
  //get_commands
  const get_commit = (hash: string): commit_type|null=>{
    return get_object(hash) as commit_type
  }
  const get_object = (hash: string):any|null=>{
    const commit_dir:string = path.join(path_directories.object_dir,...hash_to_dir(hash))
    if(fs.existsSync(commit_dir)){
      return JSON.parse(pako.inflate(new Uint8Array(fs.readFileSync(commit_dir)),{to:'string'}))
    }else {
      return null
    }
  }
  //set_commands
  const derive_object_hash = (obj: any): { compressed_data: Uint8Array, hash: string } => {
    const compressed_data = pako.deflate(JSON.stringify(obj))
    var tree_hasher = hasher({ sort: true, coerce: true })
    return {compressed_data: compressed_data,hash:tree_hasher.hash(compressed_data)}
  }

  const save_object = (object_to_save: any): string => {
    const {compressed_data, hash: object_hash} = derive_object_hash(object_to_save)
    const object_directory: string = path.join(path_directories.object_dir, ...hash_to_dir(object_hash))

    if (!fs.existsSync(object_directory)) {
      fs.mkdirSync(path.dirname(object_directory), {recursive:true})
      fs.writeFileSync(object_directory, compressed_data)
    }
    return object_hash
  }

  const is_object = (object_hash:string):boolean=>{
    const file:string = path.join(path_directories.object_dir,...hash_to_dir(object_hash))
    const object_stats = fs.statSync(file)
    return object_stats.isFile()
  }
  const clear_directory = () => {
    fs.readdirSync(path_directories.path)
      .filter(sub_path => {
        return path.resolve(sub_path) !== path.resolve(path_directories.repo_dir)
      })
      .map((sub_path: string) => {
        fs.rmSync(sub_path)
      })
  }

  return { get_commit, get_object, save_object, is_object, derive_object_hash, clear_directory }
}
