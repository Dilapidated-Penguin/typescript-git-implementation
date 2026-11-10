import { diff } from "fast-myers-diff"
import { change_operations } from "../../util/changes"
//interfaces:
import {tree_reference} from "../../util/interfaces"
interface edit{
    /**
     * The output of the diff function(fast-myers-diff).
     * The coordinates of the edits in the original files in a tuple format:`[sx, ex, sy, ey]`
     * - `sx` : start line in the first file
    * - `ex` : end line in the first file
    * - `sy` : start line in the second file
    * - `ey` : end line in the second file
     */
    original_output:[number,number,number,number]
    /**
     * @description
     * The location and length of the edit in the base space:
     * `[sx,l]`
     * - `sx`:the line in base space where the change occurs
     * - `l`: the number of lines consumed by the edit
     * @example
     * - `[2,0]` // a pure insertion that consumed no lines
     * - `[3,5]` // a change starting at line 3 that consumes(deletes) 5 lines
     */
    base_space:[number,number]
    /**
     *slice of all the lines from ys which are replacing the deleted lines
     */
    ys_slice:string[]
}
export interface hunk{
    /** An array containing all edits coalesced into the hunk */
    edit_list:edit[]
    /**A */
    hunk_space:[number,number]
}

export interface merge_helper{
    final_sequence:string[]
    file_contains_conflict:boolean
}

function base_space_to_interval(base_space:[number,number]):[number,number]{
    return [
        base_space[0],//sx
        base_space[0] + base_space[1]//sx+l
    ]
}

function edit_root_branch(root_sequence: string[], branch_sequence: string[]): edit[]{
    const normalize_line = (line: string): string => {
        // Only strip a trailing carriage return (CRLF -> LF safety).
        return line.endsWith('\r') ? line.slice(0, -1) : line
    };
    /*
    diff returns: Generator<[number, number, number,number]>
    where [number, number, number,number] = [sx, ex, sy, ey],
    where [sx, ex) indicates a range to delete from xs and [sy, ey) indicates a range from ys to replace the deleted material with.
    Simple deletions are indicated when sy === ey
    simple insertions when sx === ex
    */
    const diff_root_branch = diff(root_sequence, branch_sequence, (i: number, j: number) => {
        return normalize_line(root_sequence[i]) === normalize_line(branch_sequence[j])
    });
    /**
    * @param branch_diff IterableIterator<[sx, ex, sy, ey],any,any>
    * @returns edit[]
    */
    function diff_to_edits(branch_diff:IterableIterator<[number,number,number,number],any,any>):edit[]{

        let changes_in_base_space:edit[] = []
        for (const edit_quadruple of branch_diff) {
            const [sx,ex,sy,ey] = edit_quadruple

            changes_in_base_space.push({
                original_output:[sx,ex,sy,ey],
                base_space:[sx,ex-sx],
                ys_slice:(sy === ey) ? [] : branch_sequence.slice(sy,ey)
            })
        }
        return changes_in_base_space
    }
    return diff_to_edits(diff_root_branch)
}


export function merge_helper() {
  const intersecting_base_space = (current_hunk: hunk, opposite_hunk_list: hunk[]): hunk | undefined =>{

    const [current_hunk_s, current_hunk_e] = base_space_to_interval(current_hunk.hunk_space);
    return opposite_hunk_list.find((potential_intersect: hunk) => {
      const [os, oe] = base_space_to_interval(potential_intersect.hunk_space)
      return (os < current_hunk_e) && (current_hunk_s < oe)
    });
  }

  const three_way_merge = (root_sequence: string[], feature_hunk_list: hunk[], master_hunk_list: hunk[], feature_branch_name?:string):merge_helper=>{
    let contains_conflict:boolean = false

    for (let base_i = 0; base_i < root_sequence.length+1; base_i++) {
      const feature_hunk: hunk | undefined = feature_hunk_list.find((given_hunk: hunk) => given_hunk.hunk_space[0] === base_i)
      const master_hunk: hunk | undefined = master_hunk_list.find((given_hunk: hunk) => given_hunk.hunk_space[0] === base_i)

      function merge_hunk_to_root(hunk_to_merge: hunk) {
        let [sx, l] = [hunk_to_merge.hunk_space[0], 0]
        let last_edit_length:number = 0
        for (const edit of hunk_to_merge.edit_list) {
          [sx,l] = edit.base_space

          root_sequence.splice(sx, l, ...edit.ys_slice)//when l=0(i.e. a pure insertion) nothing is deleted
          last_edit_length = edit.ys_slice.length
        }
        base_i = sx-l+last_edit_length
      }
      /**
          * @param our_hunk The hunk from the master branch
          * @param their_hunk The hunk from the feature branch being merged
          */
      function log_conflict(our_hunk: hunk, their_hunk: hunk) {
        contains_conflict = true
        const our_hunk_edits:string[] = our_hunk.edit_list.flatMap((current_edit:edit)=>{
          return current_edit.ys_slice
        })
        const their_hunk_edits:string[] = their_hunk.edit_list.flatMap((current_edit:edit)=>{
          return current_edit.ys_slice
        })

        const [our_sx,our_l] = our_hunk.hunk_space
        const [their_sx, their_l] = their_hunk.hunk_space
        const conflict_splice:string[] = [
          `<<<<<<< HEAD`,
          ...our_hunk_edits,
          `=======`,
          ...their_hunk_edits,
          `>>>>>>> ${feature_branch_name??'theirs'}`
        ]
        const sx: number = Math.min(our_sx, their_sx)
        const l: number = Math.max(our_l, their_l)

        root_sequence.splice(sx, l, ...conflict_splice)
        base_i = sx-l+conflict_splice.length

      }

      if(feature_hunk && master_hunk){
        log_conflict(master_hunk, feature_hunk)
        continue
      }
      let conflicting_hunk:hunk|undefined

      if(master_hunk){
        if(!(conflicting_hunk = intersecting_base_space(master_hunk,feature_hunk_list))){
          merge_hunk_to_root(master_hunk)
        }else{
          log_conflict(master_hunk,conflicting_hunk)
        }
        continue
      }

      if(feature_hunk){
        if(!(conflicting_hunk = intersecting_base_space(feature_hunk,master_hunk_list))){
          merge_hunk_to_root(feature_hunk)
        }else{
          log_conflict(conflicting_hunk,feature_hunk)
        }
        continue
      }


    }
    return {
      final_sequence:root_sequence,
      file_contains_conflict:contains_conflict
    }
  }

  /**
   * @param edit_list a list of edits
   * @returns hunk[]
   * @description group edits that are immediately adjacent or would share a context line(i.e. Have a gap of one line between them)
   */
  const edits_to_hunks = (edit_list:edit[]):hunk[]=>{
      let edit_list_index:number = 1
      let resultant_hunk_list:hunk[] = [{
        edit_list:[edit_list[0]],
        hunk_space:edit_list[0].base_space
      }]
      let hunk_list_index:number = 0
      while(edit_list_index < edit_list.length){
        const right_edit:edit = edit_list[edit_list_index]
        const left_edit:edit = edit_list[edit_list_index-1]

        const distance_between_edits:number =
          left_edit.base_space[0]+left_edit.base_space[1] -
          right_edit.base_space[0]

        if(distance_between_edits <= 2){
          //there is no more than 1 context line between two edits(therefore change)
          resultant_hunk_list[hunk_list_index].edit_list.push(right_edit)
          resultant_hunk_list[hunk_list_index].hunk_space[1] += (distance_between_edits-1) + right_edit.base_space[1]
        }else{
          hunk_list_index++
          resultant_hunk_list[hunk_list_index] ={
            edit_list:[right_edit],
            hunk_space:right_edit.base_space
          }
        }
        edit_list_index++
      }
      return resultant_hunk_list
  }

  const calc_hunks = (root_sequence:string[],branch_sequence:string[])=>{
    return edits_to_hunks(edit_root_branch(root_sequence,branch_sequence))
  }

  const structural_merge = (initial_index:Map<string,tree_reference>,master_files:Map<string,tree_reference>,feature_files:Map<string,tree_reference>):{index:tree_reference[],conflict_flag:string|undefined}=>{
    let final_index:tree_reference[] = []
    let contains_conflicts:string | undefined
    const all_files:string[] = [...new Set([...initial_index.keys(), ...master_files.keys(), ...feature_files.keys()])]

    for (const current_file of all_files) {
      const initial_blob: tree_reference | undefined = initial_index.get(current_file)
      const master_conflict: tree_reference | undefined = master_files.get(current_file)
      const feature_conflict: tree_reference | undefined = feature_files.get(current_file)

      if ((master_conflict && feature_conflict) && (master_conflict?.hash !== feature_conflict?.hash)) {
        contains_conflicts += `CONFLICT (add/add): Merge conflict in ${current_file}\n`
        if (initial_blob) {
          initial_blob.stage = 1
          final_index.push(initial_blob)
        }

        master_conflict.stage = 2
        feature_conflict.stage = 3
        final_index.push(...[master_conflict,feature_conflict])
      } else {
        //one of these must exist as current_file must be from at least one of the three maps ∴ index_entry must be defined
        const index_entry: tree_reference = (master_conflict ?? feature_conflict ?? initial_blob)!
        index_entry.stage = 0
        final_index.push(index_entry)
      }
    }
    return {
      index:final_index,
      conflict_flag:contains_conflicts
    }
  }
  return { edits_to_hunks, intersecting_base_space, three_way_merge, calc_hunks, structural_merge }
}
