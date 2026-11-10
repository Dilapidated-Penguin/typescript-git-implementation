"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkout = checkout;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const object_library_1 = require("../util/object_library");
const branch_logic_1 = require("../util/branch_logic");
const status_1 = require("./status");
const changes_1 = require("../util/changes");
function checkout(branch) {
    var _a;
    console.log('the branch we are checkout out is ', branch);
    const alt_branch_ref = path_1.default.join(this.ref_heads_dir, branch);
    const { get_object, get_commit } = (0, object_library_1.object_library)(this);
    const { flatten_tree, infer_changes, hash_to_directory } = (0, changes_1.change_operations)(this);
    const { get_HEAD_hash } = (0, branch_logic_1.branch_operations)(this);
    const { get_index, set_index } = (0, branch_logic_1.staging_logic)(this);
    if (!fs_1.default.existsSync(alt_branch_ref)) {
        throw new Error(`error: '${branch}' did not match any branches known to node-git`);
    }
    //index_declaration and conflict check
    let index = get_index();
    if (index.find((entry) => entry.stage !== 0)) {
        throw new Error('unresolved merge conflict.cannot merge. aborting');
    }
    const feature_branch_hash = fs_1.default.readFileSync(alt_branch_ref, 'utf-8');
    console.log('last commit directory');
    const last_commit_directory = hash_to_directory((_a = get_HEAD_hash()) !== null && _a !== void 0 ? _a : undefined);
    console.log('feature');
    const feature_branch_directory = hash_to_directory(feature_branch_hash !== null && feature_branch_hash !== void 0 ? feature_branch_hash : undefined);
    const index_map = flatten_tree(index, { files_only: true });
    const working_directory = status_1.current_project_state.bind(this)();
    //locally modified
    const staged_changes = infer_changes(last_commit_directory, index_map, {});
    const unstaged_changes = infer_changes(index_map, working_directory, {});
    let to_create = new Map(); //dir,hash
    let to_delete = new Set();
    const all_keys = [...new Set([...last_commit_directory.keys(), ...feature_branch_directory.keys(), ...working_directory.keys()])];
    console.log('all keys: ', all_keys);
    for (const dir of all_keys) {
        const HEAD_hash = last_commit_directory.get(dir);
        const target_hash = feature_branch_directory.get(dir);
        console.log('head ', HEAD_hash);
        console.log('target ', target_hash);
        if (HEAD_hash !== target_hash) {
            const in_staged = Object.values(staged_changes).find((change_prop) => change_prop.has(dir));
            const in_unstaged = Object.values(unstaged_changes).find((change_prop) => change_prop.has(dir));
            const locally_changed = in_staged || in_unstaged;
            if (locally_changed) {
                if (in_unstaged) {
                    throw new Error(`
          error: The following untracked working tree files would be overwritten by checkout:\n
          ${dir}\n
          Aborting`);
                }
                else {
                    throw new Error(`error: Your local changes to the following files would be overwritten by checkout:\n
          ${dir}\n
          Aborting`);
                }
            }
            else {
                if (target_hash) {
                    to_create.set(dir, target_hash);
                    console.log(dir, ': ', target_hash);
                    console.log('file contents', get_object(target_hash));
                }
                if (HEAD_hash) {
                    console.log('delete', dir);
                    to_delete.add(dir);
                }
            }
        }
    }
    //deleting paths:
    for (const to_delete_path of to_delete) {
        fs_1.default.rmSync(to_delete_path);
        console.log('deleting path', to_delete_path);
        let path_dir = path_1.default.dirname(to_delete_path);
        while ((path_dir !== this.repo_dir) && (path_dir !== path_1.default.dirname(path_dir))) {
            const entries = fs_1.default.readdirSync(path_dir);
            if (entries.length > 0) {
                break;
            }
            fs_1.default.rmdirSync(path_dir);
            path_dir = path_1.default.dirname(path_dir);
        }
        index = index.filter((index_entry) => {
            return path_1.default.normalize(index_entry.reference_path) !== path_1.default.normalize(to_delete_path);
        });
    }
    //creating paths:
    for (const [to_create_path, target_hash] of to_create) {
        fs_1.default.mkdirSync(path_1.default.dirname(to_create_path), { recursive: true });
        console.log('creating path', to_create_path);
        console.log('target hash', target_hash);
        const target_data = get_object(target_hash);
        console.log('d');
        fs_1.default.writeFileSync(to_create_path, target_data, 'utf-8');
        index.push({
            reference_path: to_create_path,
            hash: target_hash,
            stage: 0
        });
    }
    set_index(index);
    fs_1.default.writeFileSync(this.HEAD_dir, branch);
    console.log(`on branch ${branch}`);
}
