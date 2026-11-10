"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.structural_merge_helpers = structural_merge_helpers;
const changes_1 = require("../../util/changes");
const branch_logic_1 = require("../../util/branch_logic");
const object_library_1 = require("../../util/object_library");
function structural_merge_helpers(path_directories) {
    const { flatten_tree, infer_changes } = (0, changes_1.change_operations)(path_directories);
    const { get_object, get_commit } = (0, object_library_1.object_library)(path_directories);
    const { get_branch_hash } = (0, branch_logic_1.branch_operations)(path_directories);
    const return_tree_diff = (common_commit, future_commit) => {
        const future_commit_tree = get_object(future_commit.tree_hash);
        const common_commit_tree = get_object(common_commit.tree_hash);
        const previous_commit_state = flatten_tree(common_commit_tree);
        const future_commit_state = flatten_tree(future_commit_tree);
        return infer_changes(previous_commit_state, future_commit_state, {});
    };
    const return_common_ancestor = (branch_name, feature_name) => {
        const return_branch_hash = (branch_name) => {
            let commit_hash = get_branch_hash(branch_name);
            if (commit_hash === null) {
                return [];
            }
            let branch_list = [commit_hash];
            let has_parent = true;
            while (has_parent) {
                const current_commit = get_commit(commit_hash);
                if (current_commit.parent !== undefined) {
                    branch_list.push(current_commit.parent);
                    commit_hash = current_commit.parent;
                }
                else {
                    has_parent = false;
                }
            }
            return branch_list;
        };
        const main_branch = return_branch_hash(branch_name);
        const feature_branch = return_branch_hash(feature_name);
        let shared_ancestor = undefined;
        for (const commit_hash of main_branch) {
            shared_ancestor = feature_branch.find((feature_hash) => {
                return feature_hash === commit_hash;
            });
            if (shared_ancestor !== undefined) {
                break;
            }
        }
        return shared_ancestor;
    };
    //
    const BASE = 4, OURS = 2, THEIRS = 1;
    const conflictLabels = {
        [BASE | OURS | THEIRS]: "both modified",
        [BASE | THEIRS]: "deleted by us",
        [BASE | OURS]: "deleted by them",
        [OURS | THEIRS]: "both added",
        [BASE]: "both deleted",
        [OURS]: "added by us",
        [THEIRS]: "added by them",
    };
    const get_conflict_label = (has_base, has_theirs, has_ours) => {
        var _a;
        const key = (has_base ? BASE : 0) | (has_ours ? OURS : 0) | (has_theirs ? THEIRS : 0);
        return (_a = conflictLabels[key]) !== null && _a !== void 0 ? _a : "unknown conflict state";
    };
    return { return_tree_diff, return_common_ancestor, get_conflict_label };
}
