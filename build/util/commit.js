"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inititialize_repo = inititialize_repo;
exports.repo_exists = repo_exists;
exports.createTag = createTag;
exports.createBranch = createBranch;
exports.createAdd = createAdd;
exports.createStatus = createStatus;
exports.createLog = createLog;
exports.createCommit = createCommit;
exports.createMerge = createMerge;
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const hidefile_1 = __importDefault(require("hidefile"));
const config_json_1 = __importDefault(require("./config.json"));
const myers = require("myers-diff");
const helper = __importStar(require("./helper"));
function inititialize_repo(designated_directory) {
    const als_path = path_1.default.join(designated_directory, config_json_1.default.default_repo_dir);
    if (!fs.existsSync(als_path)) {
        //make the repo directory folder and it's contents
        fs.mkdirSync(als_path);
        const file_structure = [[config_json_1.default.HEAD_dir], config_json_1.default.ref_heads_dir, config_json_1.default.ref_tags_dir, [config_json_1.default.object_dir], [config_json_1.default.index_dir]];
        file_structure.map((sub_path) => {
            const complete_path = path_1.default.join(als_path, ...sub_path);
            fs.mkdirSync(complete_path);
        });
        hidefile_1.default.hideSync(als_path);
        console.log('repository initialized');
    }
}
function repo_exists(path_to_dir) {
    const path_stats = fs.statSync(path_to_dir);
    if (path_stats.isDirectory()) {
        return fs.existsSync(path_1.default.join(path_to_dir, config_json_1.default.default_repo_dir));
    }
    else {
        throw (console.error(`${path_to_dir} is an invalid directory`));
    }
}
function createTag(directory) {
    /**
     * associates an immutable tag with a commits hash
     * @param {string} tag_name - Name of the tag. To be a valid tag_name the string must also be a valid file name. ie. no spaces etc
     * @param {string} commit_hash The hash to associate the tag with.
     */
    function tag(tag_name, commit_hash) {
        if (valid_file_name(tag_name)) {
            throw new TypeError('Invalid tag name');
        }
        const tag_path = path_1.default.join(directory, config_json_1.default.default_repo_dir, ...config_json_1.default.ref_tags_dir, tag_name);
        const tag_path_stats = fs.statSync(tag_path);
        if (helper.is_object(directory, commit_hash)) {
            if (!tag_path_stats.isFile()) {
                fs.writeFileSync(tag_path, commit_hash);
            }
            else {
                throw new Error(`tag: ${tag_name} already exists. Cannot create duplicate of immutable tag`);
            }
        }
        else {
            throw new Error(`${commit_hash} is not known hash`);
        }
    }
    return tag;
}
function createBranch(directory) {
    /**
     * A function that either removes or creates a branch
     * @param {string} branch_name Name of the branch
     * @param {string} commit the hash associated with the branch
     * @param {boolean} branch_to_be_removed Indicate whether the function creates or removes a branch
     */
    function branch(branch_name, commit = helper.get_head_hash(directory, helper.get_HEAD_branch_name(directory)), branch_to_be_removed = false) {
        if (!valid_file_name(branch_name)) {
            throw new TypeError('Invalid branch name');
        }
        const branch_path = path_1.default.join(directory, config_json_1.default.default_repo_dir, ...config_json_1.default.ref_heads_dir, branch_name);
        const branch_path_stats = fs.statSync(branch_path);
        if (!branch_path_stats.isFile()) {
            fs.writeFileSync(branch_path, commit);
        }
        else {
            if (branch_to_be_removed) {
                fs.rmSync(branch_path);
            }
            else {
                throw new Error(`branch name: ${branch_name} already exists`);
            }
        }
    }
    return branch;
}
function createAdd(designated_directory) {
    /**
     * @param {string[]} paths_to_add The list of files directories the user is looking to at the commit
     * @param {string[]} to_ignore The list of files and directories the user is looking to be ignored
     * A tree is generated for the files to be committed and then written to the index file
     * All files staged to be committed are made into blobs and those blobs are hashed and placed into the objects directory
     */
    function add(paths_to_add, to_ignore) {
        const repo_directory = path_1.default.join(designated_directory, config_json_1.default.default_repo_dir);
        to_ignore.push(repo_directory);
        const res = paths_to_add.flatMap((path_add) => {
            return helper.execute_on_files((path_to_work) => {
                const data = JSON.parse(fs.readFileSync(path_to_work).toString());
                const compressed_blob_hash = helper.save_object(designated_directory, data);
                //push the file to the tree
                res.push({
                    hash: compressed_blob_hash,
                    file_directory: path_1.default.basename(path_to_work),
                    stage: 0
                });
            }, path_add);
        });
        return fs.writeFileSync(path_1.default.join(repo_directory, config_json_1.default.index_dir), JSON.stringify(res));
    }
    return add;
}
function createStatus(root_directory) {
    /*
    generate an array of blob references for the index and the current file state.
    Create a function to infer the different edits:
    {
        renamed: unknown directory + known hash
        new file: unknown hash + unknown directory
        modified: known directory + new hash
        deleted: no present instance of the hash or the directory

        ++any files staged to be committed

        changes,staged
    }
    */
    function status() {
        let staged_changes = helper.return_staged_changes(root_directory);
        const examine_path = (initial_path) => {
            let resultant_map = new Map();
            fs.readdirSync(initial_path)
                .forEach((dir_item) => {
                const item_directory = path_1.default.join(initial_path, dir_item);
                const item_stats = fs.statSync(item_directory);
                if (item_stats.isDirectory()) {
                    resultant_map = new Map([...examine_path(item_directory), ...resultant_map]);
                }
                else if (item_stats.isFile()) {
                    const file_data = fs.readFileSync(item_directory).toString();
                    resultant_map.set(item_directory, helper.return_object_hash(file_data));
                }
            });
            return resultant_map;
        };
        let directory_state = examine_path(root_directory);
        const latest_commit = helper.return_commit_from_hash(root_directory, helper.get_head_hash(root_directory, helper.get_HEAD_branch_name(root_directory)));
        const flattened_commit_tree = helper.flatten_tree(root_directory, helper.return_object_from_hash(root_directory, latest_commit.tree_hash));
        for (const [path, hash] of directory_state) {
            const is_in_staged_changes = (staged_changes.find(blob_ref => (blob_ref.file_directory === path) &&
                (blob_ref.hash === hash))) !== undefined;
            if (is_in_staged_changes) {
                directory_state.delete(path);
            }
            const previous_commit_entry = flattened_commit_tree.get(path);
            if (previous_commit_entry !== undefined) {
                if (previous_commit_entry === hash) {
                    directory_state.delete(path);
                }
            }
        }
        return {
            changes: helper.infer_changes(flattened_commit_tree, directory_state),
            staged: staged_changes
        };
    }
    return status;
}
const valid_file_name = (branch) => {
    const regex = /^[^/\0]+$/;
    return regex.test(branch);
};
function createLog(root_directory) {
    /**
     * Returns:
     * an array of commits providing the history of the present branch
     * @returns {history:commit[]}
     */
    function log(branch_name = helper.get_HEAD_branch_name(root_directory)) {
        /*
        Check index file(directory/index) to check present add status
        Use present HEAD pointer to find most recent commit name => use that name to find the most recent commit in the als.objects and then recursively display those commits until one has no parent
        */
        const return_branch_history = () => {
            //use that branch name to get the commit hash
            const present_branch_hash = helper.get_head_hash(root_directory, branch_name);
            //derive the object directory:
            let current_commit = helper.return_commit_from_hash(root_directory, present_branch_hash);
            let last_commit = false;
            let res = [];
            while (!last_commit) {
                res.push(current_commit);
                if (!(current_commit.parent === undefined)) {
                    current_commit = helper.return_commit_from_hash(root_directory, current_commit.parent);
                }
                else {
                    last_commit = true;
                }
            }
            return res;
        };
        return return_branch_history();
    }
    return log;
}
function createCommit(root_directory) {
    function commit(description = null) {
        const index_references = helper.return_staged_changes(root_directory);
        if (index_references.length !== 0) {
            const index_tree = helper.index_to_tree(root_directory, index_references);
            fs.writeFileSync(path_1.default.join(root_directory, config_json_1.default.default_repo_dir, config_json_1.default.index_dir), '');
            //take the tree *** from the index to the objects directory
            const index_tree_hash = helper.save_object(root_directory, index_tree);
            let res_commit = {
                description: description,
                tree_hash: index_tree_hash,
                date: Date.now(),
                parent: undefined
            };
            const current_branch_ref = path_1.default.join(root_directory, config_json_1.default.default_repo_dir, ...config_json_1.default.ref_heads_dir, helper.get_HEAD_branch_name(root_directory));
            if (fs.statSync(current_branch_ref).isFile()) {
                const branch_latest_commit = helper.get_head_hash(root_directory, helper.get_HEAD_branch_name(root_directory));
                //Determine the possible parents of the commit
                if (branch_latest_commit !== '') {
                    res_commit.parent = branch_latest_commit;
                }
            }
            const res_commit_hash = helper.save_object(root_directory, res_commit);
            //update the branch in the ref/heads file to correspond with new commit to branch and clear the index file of the tree
            fs.writeFileSync(current_branch_ref, res_commit_hash);
        }
        else {
            throw new Error('Nothing is staged to be committed');
        }
    }
    return commit;
}
function createMerge(directory) {
    return function merge(master_head = helper.get_HEAD_branch_name(directory), feature_head) {
        if (!helper.is_branch(directory, master_head)) {
            throw new Error(`${master_head} does not exist`);
        }
        if (!helper.is_branch(directory, feature_head)) {
            throw new Error(`${feature_head} does not exist`);
        }
        const return_common_ancestor = (branch_name, feature_name) => {
            var _a, _b, _c, _d;
            let current_branch_hash = helper.get_head_hash(directory, branch_name);
            let current_feature_hash = helper.get_head_hash(directory, feature_name);
            let flag_history = new Map();
            let common_ancestor_branch = false;
            let common_ancestor_feature = false;
            while (!common_ancestor_branch || !common_ancestor_feature) {
                //branch
                if (current_branch_hash !== '') {
                    let current_branch_flags = (_a = flag_history.get(current_branch_hash)) !== null && _a !== void 0 ? _a : {
                        seen_from_branch: false,
                        seen_from_feature: false
                    };
                    current_branch_flags.seen_from_branch = true;
                    common_ancestor_branch = current_branch_flags.seen_from_branch && current_branch_flags.seen_from_feature;
                    if (common_ancestor_branch) {
                        return current_branch_hash;
                    }
                    else {
                        current_branch_hash = (_b = helper.return_commit_from_hash(directory, current_branch_hash).parent) !== null && _b !== void 0 ? _b : '';
                        flag_history.set(current_branch_hash, current_branch_flags);
                    }
                }
                //feature
                if (current_feature_hash !== '') {
                    let current_feature_flags = (_c = flag_history.get(current_feature_hash)) !== null && _c !== void 0 ? _c : {
                        seen_from_branch: false,
                        seen_from_feature: false
                    };
                    current_feature_flags.seen_from_feature = true;
                    common_ancestor_feature = current_feature_flags.seen_from_branch && current_feature_flags.seen_from_feature;
                    if (common_ancestor_feature) {
                        return current_feature_hash;
                    }
                    else {
                        current_feature_hash = (_d = helper.return_commit_from_hash(directory, current_feature_hash).parent) !== null && _d !== void 0 ? _d : '';
                        flag_history.set(current_feature_hash, current_feature_flags);
                    }
                }
            }
        };
        const return_tree_diff = (common_commit, future_commit) => {
            const common_commit_tree = helper.return_object_from_hash(directory, common_commit.tree_hash);
            const future_commit_tree = helper.return_object_from_hash(directory, future_commit.tree_hash);
            const previous_commit_state = helper.flatten_tree(directory, common_commit_tree);
            const future_commit_state = helper.flatten_tree(directory, future_commit_tree);
            return helper.infer_changes(previous_commit_state, future_commit_state);
        };
        //generate diffs for the og=>feature + og=>main and then deal with any tree conflicts
        const master_commit = helper.return_commit_from_hash(directory, helper.get_head_hash(directory, master_head));
        const feature_commit = helper.return_commit_from_hash(directory, helper.get_head_hash(directory, feature_head));
        const common_ancestor_hash = return_common_ancestor(master_head, feature_head);
        if (common_ancestor_hash !== undefined) {
            const common_ancestor = helper.return_commit_from_hash(directory, common_ancestor_hash);
            const ancestor_master_diff = return_tree_diff(common_ancestor, master_commit);
            const ancestor_feature_diff = return_tree_diff(common_ancestor, feature_commit);
            /*recognise tree conflicts:
            if any file:
            deletion conflicts: modified, renamed in one branches differences is deleted in another(directory conflict)

            new_file conflicts: the new files made somehow intersect with the others directories
                (the file inherently doesn't intersect with any files in its own commit changes)
            rename conflicts: a renamed file is renamed into a directory that exits in another(rename + new file [directory conflicts])
            
            modified conflicts: a file edited in one file is also edited by another
            */
            function commit_to_index(ancestor_commit) {
                const ancestor_tree = helper.flatten_tree(directory, helper.return_object_from_hash(directory, ancestor_commit.tree_hash));
                let res = [];
                for (const [path, hash] of ancestor_tree) {
                    res.push({
                        hash: hash,
                        file_directory: path,
                        stage: 0
                    });
                }
                return res;
            }
            const initial_index = commit_to_index(common_ancestor);
            const master_changes_blobs = changes_to_index(ancestor_master_diff, 2);
            const feature_changes_blobs = changes_to_index(ancestor_feature_diff, 3);
            function changes_to_index(current_changes, blob_stage) {
                let index_blobs = [];
                Object.keys(current_changes).forEach((property) => {
                    const current_change_property = current_changes[property];
                    for (const [entry_directory, entry_hash] of current_change_property) {
                        index_blobs.push({
                            hash: entry_hash,
                            file_directory: entry_directory,
                            stage: blob_stage
                        });
                    }
                });
                return index_blobs;
            }
            function create_final_index(initial_index, master_changes, feature_changes) {
                let final_index = [];
                let contains_conflicts = false;
                for (const initial_blob of initial_index) {
                    const master_conflict = master_changes.find((master_blob) => master_blob.file_directory === initial_blob.file_directory);
                    const feature_conflict = feature_changes.find((feature_blob) => feature_blob.file_directory === initial_blob.file_directory);
                    if (master_conflict !== undefined) {
                        if (feature_conflict === undefined) {
                            master_conflict.stage = 0;
                            final_index.push(master_conflict);
                        }
                        else {
                            //conflict
                            initial_blob.stage = 1;
                            master_conflict.stage = 2;
                            feature_conflict.stage = 3;
                            final_index.push(...[initial_blob, master_conflict, feature_conflict]);
                            contains_conflicts = true;
                        }
                    }
                    else {
                        if (feature_conflict !== undefined) {
                            feature_conflict.stage = 0;
                            final_index.push(feature_conflict);
                        }
                    }
                }
                return {
                    index: final_index,
                    conflicts: contains_conflicts
                };
            }
            const merge_result = create_final_index(initial_index, master_changes_blobs, feature_changes_blobs);
            fs.writeFileSync(path_1.default.join(directory, config_json_1.default.default_repo_dir, config_json_1.default.index_dir), JSON.stringify(merge_result.index));
            if (merge_result.conflicts) {
                /*
                console to the user that conflicts occurred
                update the index file

                infer the type of conflict seen then either leave the structural problem to be solved by a git resolve/ open a text editor
                */
            }
            else {
                //merge successful:display that fact
            }
        }
    };
}
