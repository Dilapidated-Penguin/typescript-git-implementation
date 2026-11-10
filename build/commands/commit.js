"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commit = commit;
const interfaces_1 = require("../util/interfaces");
const object_library_1 = require("../util/object_library");
const changes_1 = require("../util/changes");
const branch_logic_1 = require("../util/branch_logic");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function commit(description) {
    var _a;
    const { get_index } = (0, branch_logic_1.staging_logic)(this);
    const { get_HEAD_branch, get_branch_hash } = (0, branch_logic_1.branch_operations)(this);
    const { save_object, get_object, get_commit } = (0, object_library_1.object_library)(this);
    const { flatten_tree, infer_changes } = (0, changes_1.change_operations)(this);
    const index = get_index();
    if (index.find(entry => entry.stage !== 0)) {
        throw new Error('fatal: Exiting because of an unresolved conflict.');
    }
    const HEAD_branch = get_HEAD_branch();
    const HEAD_hash = (_a = get_branch_hash(HEAD_branch)) !== null && _a !== void 0 ? _a : undefined;
    let last_commit_directory = new Map();
    if (HEAD_hash) {
        const last_commit = get_commit(HEAD_hash);
        last_commit_directory = flatten_tree(get_object(last_commit.tree_hash));
    }
    const index_map = flatten_tree(index, { files_only: true });
    const staged_changes = infer_changes(last_commit_directory, index_map, { only_new_changes: false });
    const staged_changes_occur = Object.values(staged_changes).find((prop_map) => prop_map.size !== 0) !== undefined;
    if (!staged_changes_occur) {
        throw new Error('Nothing is staged to be committed');
    }
    const commit_tree = (index.length === 0) ? [] : build_commit_tree.call(this, index.map((entry) => {
        return Object.assign(Object.assign({}, entry), { reference_type: 'file' });
    }));
    const new_commit = {
        parent: HEAD_hash,
        additional_parents: fs_1.default.existsSync(this.merge_head) ? fs_1.default.readFileSync(this.merge_head).toString().split('\n') : undefined,
        tree_hash: save_object(commit_tree),
        description: description,
        date: Date.now()
    };
    (0, interfaces_1.logger)('new commit has been made');
    const new_commit_hash = save_object(new_commit);
    //update the branch in the ref/heads file to correspond with new commit to branch and clear the index file of the tree
    const branch_ref_dir = path_1.default.join(this.ref_heads_dir, HEAD_branch);
    fs_1.default.writeFileSync(branch_ref_dir, new_commit_hash);
    fs_1.default.rmSync(this.merge_head, { force: true });
}
/**
 * builds the final tree for the commit
 * @param ref_list
 * @returns
 */
function build_commit_tree(ref_list) {
    const { save_object } = (0, object_library_1.object_library)(this);
    const folder_map = new Map();
    // Group entries by their parent folder
    for (const entry of ref_list) {
        const segments = path_1.default.relative(this.path, entry.reference_path)
            .split(path_1.default.sep);
        // Walk each folder level and ensure it exists in the map
        for (let i = 0; i < segments.length; i++) {
            const folder_path = segments.slice(0, i).join(path_1.default.sep);
            if (!folder_map.has(folder_path)) {
                folder_map.set(folder_path, []);
            }
        }
        const parent_path = segments.slice(0, -1).join(path_1.default.sep);
        (0, interfaces_1.logger)('parent_path: ', parent_path);
        folder_map.get(parent_path).push(entry);
    }
    // Process folders deepest first so child hashes are ready for parents
    const sorted_folders = [...folder_map.keys()]
        .filter(k => k !== "")
        .sort((a, b) => b.split(path_1.default.sep).length - a.split(path_1.default.sep).length)
        .concat(""); //a single key of "" represents our entire correspond
    for (const folder_path of sorted_folders) {
        if (folder_path === "") {
            continue;
        }
        const children = folder_map.get(folder_path);
        const folder_hash = save_object(children);
        const folder_entry = {
            hash: folder_hash,
            reference_path: folder_path,
            reference_type: 'tree'
        };
        // Update parent folder's children to include this folder entry
        const segments = folder_path.split(path_1.default.sep);
        const parent_path = segments.slice(0, -1).join(path_1.default.sep);
        folder_map.get(parent_path).push(folder_entry);
        folder_map.delete(folder_path);
    }
    return folder_map.get("");
}
