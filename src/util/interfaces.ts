import color from "colors"
export interface commit_type{
  parent?: string,//hash representing the previous commit
  additional_parents?:string[]
  tree_hash:string//another hashed object referring to each file version and associated blob
  description?:string|null,
  date:number//epoch
}
export interface tree_reference{
  reference_type?:'file'|'tree'
  reference_path:string
  hash: string
  stage?:number
}
export interface changes{
  // renamed:Map<string,string>,//git works out the difference between a renamed one and a new file of the same content using heuristics
  modified:Map<string, string>,
  deleted:Map<string, string>,
  new_files: Map<string, string>,
}

export interface node_git_command {
  name: string;
  description: string;
  args?: { name: string; description: string; variadic?: boolean; optional?: boolean; default?: any }[];
  options?: { flags: string; description: string; default?: any }[];
  requiresRepo?: boolean; // Default to true in consumer
  action: (...args: any[]) => any;
  format?: (data: any) => string;
}
export interface directory_obj{
  ref_heads_dir: string,
  ref_tags_dir: string,
  object_dir:string,
  HEAD_dir: string,
  index_dir: string,
  repo_dir: string,
  path: string,
  merge_head: string,
  merge_msg: string
}
export interface change_plus_unchanged extends changes{
  unchanged:Map<string,string>
}
