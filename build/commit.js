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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.current_working_directory = current_working_directory;
exports.inititialize_repo = inititialize_repo;
exports.repo_exists = repo_exists;
exports.tag = tag;
exports.branch = branch;
exports.add = add;
exports.status = status;
exports.log = log;
exports.commit = commit;
exports.merge = merge;
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const hidefile_1 = __importDefault(require("hidefile"));
const config_json_1 = __importDefault(require("./util/config.json"));
const helper = __importStar(require("./util/helper"));
const globby_1 = require("globby");
//commands:
const merge_1 = require("./commands/merge/merge");
const structural_merge_1 = require("./commands/merge/structural_merge");
const index_logic_1 = require("./commands/index_logic");
const status_1 = require("./commands/status");
const add_1 = require("./commands/add");
const promises_1 = require("fs/promises");
//--
var working_directory = undefined;
function current_working_directory(working_dir) {
    working_directory = working_dir !== null && working_dir !== void 0 ? working_dir : (working_directory !== null && working_directory !== void 0 ? working_directory : process.cwd());
    const default_repo = path_1.default.join(working_directory, config_json_1.default.default_repo_dir);
    return {
        ref_heads_dir: path_1.default.join(default_repo, ...config_json_1.default.ref_heads_dir),
        ref_tags_dir: path_1.default.join(default_repo, ...config_json_1.default.ref_tags_dir),
        object_dir: path_1.default.join(default_repo, config_json_1.default.object_dir),
        HEAD_dir: path_1.default.join(default_repo, config_json_1.default.HEAD_dir),
        index_dir: path_1.default.join(default_repo, config_json_1.default.index_dir),
        default_repo_dir: default_repo,
        path: working_directory
    };
}
//--
function inititialize_repo() {
    return __awaiter(this, void 0, void 0, function* () {
        const { ref_heads_dir, ref_tags_dir, object_dir, HEAD_dir, index_dir: index_file_dir, default_repo_dir } = current_working_directory();
        const structure = [
            ref_heads_dir,
            ref_tags_dir,
            object_dir,
            HEAD_dir,
        ];
        yield Promise.all(structure.map((dir) => {
            return (0, promises_1.mkdir)(dir, { recursive: true });
        }));
        //create the index file
        fs.writeFileSync(index_file_dir, JSON.stringify([]));
        // hile the repo file directory and
        hidefile_1.default.hideSync(default_repo_dir);
        console.log('repository initialised');
    });
}
//
function repo_exists(path_to_dir) {
    const path_stats = fs.statSync(path_to_dir);
    if (path_stats.isDirectory()) {
        return fs.existsSync(path_1.default.join(path_to_dir, config_json_1.default.default_repo_dir));
    }
    else {
        throw (console.error(`${path_to_dir} is an invalid directory`));
    }
}
/**
 * associates an immutable tag with a commits hash
 * @param {string} tag_name - Name of the tag. To be a valid tag_name the string must also be a valid file name. ie. no spaces etc
 * @param {string} commit_hash The hash to associate the tag with.
 */
function tag(tag_name, commit_hash) {
    if (valid_file_name(tag_name)) {
        throw new TypeError('Invalid tag name');
    }
    const tag_path = path_1.default.join(current_working_directory().ref_tags_dir, tag_name);
    const tag_path_stats = fs.statSync(tag_path);
    if (helper.is_object(commit_hash)) {
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
/**
 * A function that either removes or creates a branch
 * @param {string} branch_name Name of the branch
 * @param {string} commit the hash associated with the branch
 * @param {boolean} branch_to_be_removed Indicate whether the function creates or removes a branch
 */
function branch(branch_name, commit = helper.get_head_hash(helper.get_HEAD_branch_name()), branch_to_be_removed = false) {
    if (!valid_file_name(branch_name)) {
        throw new TypeError('Invalid branch name');
    }
    const branch_path = path_1.default.join(current_working_directory().ref_heads_dir, branch_name);
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
/**
 * @param {string[]} paths_to_add The list of files directories the user is looking to at the commit
 * @param {string[]} to_ignore The list of files and directories the user is looking to be ignored.
 * A tree is generated for the files to be committed and then written to the index file
 * All files staged to be committed are made into blobs and those blobs are hashed and placed into the objects directory
 */
function add(paths_to_add, to_ignore) {
    // const repo_directory: string = path.join(current_working_directory(), config.default_repo_dir)
    to_ignore.push(config_json_1.default.default_repo_dir.replace(/\\/g, '/'));
    to_ignore = to_ignore.map((ignore_path) => {
        return (0, globby_1.convertPathToPattern)(ignore_path);
    });
    const path_globs = paths_to_add.map((current_path) => {
        return (0, globby_1.convertPathToPattern)(current_path);
    });
    const matched_paths_to_add = (0, globby_1.globbySync)(path_globs, {
        expandDirectories: true,
        ignore: to_ignore,
        ignoreFiles: '.gitignore',
        cwd: current_working_directory().path
    });
    const index_file = matched_paths_to_add.map((matched_path) => {
        const path_stats = fs.statSync(matched_path);
        if (path_stats.isDirectory()) {
            return (0, add_1.save_matched_directory)(matched_path);
        }
        else {
            return (0, add_1.save_matched_file)(matched_path);
        }
    });
    fs.writeFileSync(path_1.default.join(current_working_directory().index_dir), JSON.stringify(index_file));
}
/**
 * Generate an array of blob references for the index and the current file state.
Create a function to infer the different edits:
 */
function status() {
    let staged_changes = helper.return_staged_changes();
    console.log(staged_changes);
    let directory_state = (0, status_1.examine_path)(current_working_directory().path);
    const latest_commit = helper.return_commit_from_hash(helper.get_head_hash(helper.get_HEAD_branch_name()));
    const flattened_commit_tree = helper.flatten_tree(helper.return_object_from_hash(latest_commit.tree_hash));
    for (const [path, hash] of directory_state) {
        const is_in_staged_changes = (staged_changes.find(blob_ref => (blob_ref.reference_path === path) &&
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
const valid_file_name = (branch) => {
    const regex = /^[^/\0]+$/;
    return regex.test(branch);
};
/**
 * Returns:
 * an array of commits providing the history of the present branch
 * @returns {history:commit[]}
 */
function log(branch_name = helper.get_HEAD_branch_name()) {
    /*
    Check index file(directory/index) to check present add status
    Use present HEAD pointer to find most recent commit name => use that name to find the most recent commit in the als.objects and then recursively display those commits until one has no parent
    */
    const return_branch_history = () => {
        //use that branch name to get the commit hash
        const present_branch_hash = helper.get_head_hash(branch_name);
        //derive the object directory:
        let current_commit = helper.return_commit_from_hash(present_branch_hash);
        let last_commit = false;
        let res = [];
        while (!last_commit) {
            res.push(current_commit);
            if (!(current_commit.parent === undefined)) {
                current_commit = helper.return_commit_from_hash(current_commit.parent);
            }
            else {
                last_commit = true;
            }
        }
        return res;
    };
    return return_branch_history();
}
function commit(description = null) {
    const index_references = helper.return_staged_changes();
    if (index_references.length !== 0) {
        const index_tree = index_references;
        fs.writeFileSync(path_1.default.join(current_working_directory().index_dir), '');
        //take the tree *** from the index to the objects directory
        const index_tree_hash = helper.save_object(index_tree);
        let res_commit = {
            description: description,
            tree_hash: index_tree_hash,
            date: Date.now(),
            parent: undefined
        };
        const current_branch_ref = path_1.default.join(current_working_directory().ref_heads_dir, helper.get_HEAD_branch_name());
        if (fs.statSync(current_branch_ref).isFile()) {
            const branch_latest_commit = helper.get_head_hash(helper.get_HEAD_branch_name());
            //Determine the possible parents of the commit
            if (branch_latest_commit !== '') {
                res_commit.parent = branch_latest_commit;
            }
        }
        const res_commit_hash = helper.save_object(res_commit);
        //update the branch in the ref/heads file to correspond with new commit to branch and clear the index file of the tree
        fs.writeFileSync(current_branch_ref, res_commit_hash);
    }
    else {
        throw new Error('Nothing is staged to be committed');
    }
}
function merge(master_head = helper.get_HEAD_branch_name(), feature_head) {
    if (!helper.is_branch(master_head)) {
        throw new Error(`${master_head} does not exist`);
    }
    if (!helper.is_branch(feature_head)) {
        throw new Error(`${feature_head} does not exist`);
    }
    //generate diffs for the og=>feature + og=>main and then deal with any tree conflicts
    const master_commit = helper.return_commit_from_hash(helper.get_head_hash(master_head));
    const feature_commit = helper.return_commit_from_hash(helper.get_head_hash(feature_head));
    const common_ancestor_hash = (0, structural_merge_1.return_common_ancestor)(master_head, feature_head);
    if (common_ancestor_hash !== undefined) {
        const common_ancestor = helper.return_commit_from_hash(common_ancestor_hash);
        const ancestor_master_diff = (0, structural_merge_1.return_tree_diff)(common_ancestor, master_commit);
        const ancestor_feature_diff = (0, structural_merge_1.return_tree_diff)(common_ancestor, feature_commit);
        /*recognise tree conflicts:
        if any file:
        deletion conflicts: modified, renamed in one branches differences is deleted in another(directory conflict)

        new_file conflicts: the new files made somehow intersect with the others directories
            (the file inherently doesn't intersect with any files in its own commit changes)
        rename conflicts: a renamed file is renamed into a directory that exits in another(rename + new file [directory conflicts])

        modified conflicts: a file edited in one file is also edited by another
        */
        const initial_index = (0, index_logic_1.retrieve_references)(common_ancestor);
        const master_changes_blobs = (0, index_logic_1.changes_to_index)(ancestor_master_diff, 2);
        const feature_changes_blobs = (0, index_logic_1.changes_to_index)(ancestor_feature_diff, 3);
        const structural_merge_result = (0, merge_1.structural_merge)(initial_index, master_changes_blobs, feature_changes_blobs);
        const index_directory = current_working_directory().index_dir;
        fs.writeFileSync(index_directory, JSON.stringify(structural_merge_result.index));
        if (structural_merge_result.conflicts) {
            for (let j = 0; j < structural_merge_result.index.length; j++) {
                const current_blob = structural_merge_result.index[j];
                if (current_blob.stage === 1) {
                    const file_to_sequence = (file_string) => {
                        return file_string.split(`\n`);
                    };
                    const master_blob = structural_merge_result.index[j + 1];
                    const feature_blob = structural_merge_result.index[j + 2];
                    const master_sequence = file_to_sequence(helper.return_object_from_hash(master_blob.hash));
                    const feature_sequence = file_to_sequence(helper.return_object_from_hash(feature_blob.hash));
                    const root_sequence = file_to_sequence(helper.return_object_from_hash(current_blob.hash));
                    const root_master_hunks = (0, merge_1.calc_hunks)(root_sequence, master_sequence);
                    const root_feature_hunks = (0, merge_1.calc_hunks)(root_sequence, feature_sequence);
                    let file_merge_results = (0, merge_1.three_way_merge)(root_sequence, root_feature_hunks, root_master_hunks);
                    if (file_merge_results.file_contains_conflict) {
                        //update index file
                        structural_merge_result.index[j].stage = 0;
                        structural_merge_result.index.splice(j + 1, 2);
                    }
                    //update the file in the file directory
                    const file_result = root_sequence.join(`\n`);
                    fs.writeFileSync(current_blob.reference_path, file_result);
                }
            }
        }
        fs.writeFileSync(index_directory, JSON.stringify(structural_merge_result.index));
    }
}
