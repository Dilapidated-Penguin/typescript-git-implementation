"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.merge = merge;
const fs_1 = __importDefault(require("fs"));
const branch_logic_1 = require("../util/branch_logic");
const object_library_1 = require("../util/object_library");
const structural_merge_1 = require("./merge/structural_merge");
const merge_1 = require("./merge/merge");
const index_logic_1 = require("./merge/index_logic");
const commit_1 = require("./commit");
function merge(feature_head, master_head) {
    const { calc_hunks, three_way_merge, structural_merge } = (0, merge_1.merge_helper)();
    const { get_commit, get_object, clear_directory, derive_object_hash } = (0, object_library_1.object_library)(this);
    const { retrieve_references, changes_to_map, index_to_map } = (0, index_logic_1.index_logic)(this);
    const { return_common_ancestor, return_tree_diff, get_conflict_label } = (0, structural_merge_1.structural_merge_helpers)(this);
    const { is_branch, get_branch_hash, get_HEAD_branch } = (0, branch_logic_1.branch_operations)(this);
    const { set_index } = (0, branch_logic_1.staging_logic)(this);
    function hash_sequence(hash) {
        return get_object(hash).split(`\n`);
    }
    master_head = master_head !== null && master_head !== void 0 ? master_head : get_HEAD_branch();
    if (!is_branch(master_head)) {
        throw new Error(`branch ${master_head} does not exist`);
    }
    if (!is_branch(feature_head)) {
        throw new Error(`branch ${feature_head} does not exist`);
    }
    if (feature_head === master_head) {
        return;
    }
    const master_hash = get_branch_hash(master_head);
    const feature_hash = get_branch_hash(feature_head);
    if (!master_hash) {
        throw Error(`Merge Error: branch ${master_head} contains no commits yet`);
    }
    if (!feature_hash) {
        throw Error(`Merge Error: branch ${feature_head} contains no commits yet`);
    }
    //generate diffs for the og=>feature + og=>main and then deal with any tree conflicts
    const master_commit = get_commit(master_hash);
    const feature_commit = get_commit(feature_hash);
    const common_ancestor_hash = return_common_ancestor(master_head, feature_head);
    if (common_ancestor_hash === undefined) {
        throw new Error('fatal: refusing to merge unrelated histories');
    }
    const common_ancestor = get_commit(common_ancestor_hash);
    const ancestor_master_diff = return_tree_diff(common_ancestor, master_commit);
    const ancestor_feature_diff = return_tree_diff(common_ancestor, feature_commit);
    /*recognise tree conflicts:
    if any file:
      deletion conflicts: modified, renamed in one branches differences is deleted in another(directory conflict)
  
      new_file conflicts: the new files made somehow intersect with the others directories
        (the file inherently doesn't intersect with any files in its own commit changes)
  
      modified conflicts: a file edited in one file is also edited by another
      */
    const initial_index = index_to_map(retrieve_references(common_ancestor_hash));
    const master_changes_blobs = changes_to_map(ancestor_master_diff, 2);
    const feature_changes_blobs = changes_to_map(ancestor_feature_diff, 3);
    const structural_merge_result = structural_merge(initial_index, master_changes_blobs, feature_changes_blobs);
    console.dir(structural_merge_result);
    if (!structural_merge_result.conflict_flag) {
        clear_directory();
        set_index(structural_merge_result.index);
        structural_merge_result.index.map((entry) => {
            fs_1.default.writeFileSync(entry.reference_path, get_object(entry.hash));
        });
        commit_1.commit.call(this, `Merge branch ${feature_head} into ${master_head}`);
        console.log(`Merge completed successfully`);
        return;
    }
    const index_map_keys = [...new Set(structural_merge_result.index.map((blob) => blob.reference_path))];
    let merge_output = '';
    clear_directory();
    let files_changes = 0;
    for (const reference_path of index_map_keys) {
        const conflict_exists = structural_merge_result.index.some((entry) => {
            return entry.stage !== 0;
        });
        if (!conflict_exists) {
            const file_ref = structural_merge_result.index.find((entry) => entry.reference_path === reference_path);
            fs_1.default.writeFileSync(reference_path, get_object(file_ref.hash));
            continue;
        }
        files_changes++;
        function predicate_stage(stage) {
            return (entry) => {
                return (entry.stage === stage) && (entry.reference_path === reference_path);
            };
        }
        const root_blob = structural_merge_result.index.find(predicate_stage(1));
        const master_blob = structural_merge_result.index.find(predicate_stage(2));
        const feature_blob = structural_merge_result.index.find(predicate_stage(3));
        merge_output += `${get_conflict_label(root_blob, feature_blob, master_blob)}: ${reference_path} \n`;
        let root_sequence = [];
        if (root_blob) {
            root_sequence = hash_sequence(root_blob.hash);
        }
        let master_sequence = [];
        if (master_blob) {
            master_sequence = hash_sequence(master_blob.hash);
        }
        let feature_sequence = [];
        if (feature_blob) {
            feature_sequence = hash_sequence(feature_blob.hash);
        }
        const root_master_hunks = calc_hunks(root_sequence, master_sequence);
        const root_feature_hunks = calc_hunks(root_sequence, feature_sequence);
        let file_merge_results = three_way_merge(root_sequence, root_feature_hunks, root_master_hunks, feature_head);
        const file_result = file_merge_results.final_sequence.join(`\n`);
        if (!file_merge_results.file_contains_conflict) {
            structural_merge_result.index = structural_merge_result.index.filter((entry) => {
                return entry.reference_path !== reference_path;
            });
            structural_merge_result.index.push({
                reference_path: reference_path,
                hash: derive_object_hash(file_result).hash,
                stage: 0
            });
        }
        //update the file in the file directory
        fs_1.default.writeFileSync(reference_path, file_result);
    }
    fs_1.default.writeFileSync(this.merge_head, feature_head);
    fs_1.default.writeFileSync(this.merge_msg, merge_output);
    console.log(merge_output);
    console.log(`${files_changes} files changed`);
    console.log(`Failed to automerge branch ${feature_head} into ${master_head}`);
}
