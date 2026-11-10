"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.change_operations = change_operations;
const object_library_1 = require("./object_library");
function change_operations(path_directories) {
    const { get_object, get_commit } = (0, object_library_1.object_library)(path_directories);
    /**
     *
     * @param tree_to_flatten an array containing references to files and folders
     * @param options
     * @returns Map<string,string> = Map< reference_path, hash>, a flat list of all the files referenced
     */
    const flatten_tree = (tree_to_flatten, options = {}) => {
        let resultant_flat_map = new Map();
        const dump_to_res = (outer_tree) => {
            for (const ref of outer_tree) {
                if ((ref.reference_type === 'file') || (options === null || options === void 0 ? void 0 : options.files_only)) {
                    resultant_flat_map.set(ref.reference_path.replace(/\\/g, '/'), ref.hash);
                }
                else if (ref.reference_type === 'tree') {
                    const tree_object = get_object(ref.hash);
                    dump_to_res(tree_object);
                }
            }
        };
        dump_to_res(tree_to_flatten);
        return resultant_flat_map;
    };
    const hash_to_directory = (commit_hash) => {
        let latest_commit;
        if (commit_hash && (latest_commit = get_commit(commit_hash))) {
            const commit_tree = get_object(latest_commit.tree_hash);
            return flatten_tree(commit_tree);
        }
        return new Map();
    };
    /**
     * Deletes all entries within directory_map which are within the staged_changes array and returns the filtered directory_map
     * @param staged_changes
     * @param directory_map
     */
    const filter_staged_changes = (staged_changes, directory_map) => {
        for (const ref of staged_changes) {
            const directory_match = directory_map.get(ref.reference_path.replace(/\\/g, '/'));
            if (directory_match === ref.hash) {
                directory_map.delete(directory_match);
            }
        }
        return directory_map;
    };
    function infer_changes(previous_commit, new_changes, options, return_unstaged = false) {
        previous_commit = new Map(previous_commit);
        new_changes = new Map(new_changes);
        let resultant_changes = {
            modified: new Map,
            new_files: new Map,
            deleted: new Map,
        };
        let unchanged_files = new Map;
        if ((options === null || options === void 0 ? void 0 : options.staged_changes) !== undefined) {
            new_changes = filter_staged_changes(options.staged_changes, new_changes);
        }
        for (const [new_change_path, new_change_hash] of new_changes) {
            const old_hash = previous_commit.get(new_change_path);
            if (old_hash !== undefined) {
                if (old_hash !== new_change_hash) {
                    resultant_changes.modified.set(new_change_path, new_change_hash);
                }
                if (return_unstaged) {
                    unchanged_files.set(new_change_path, new_change_hash);
                }
            }
            else {
                //no file existed at this path ∴ new file
                resultant_changes.new_files.set(new_change_path, new_change_hash);
            }
            previous_commit.delete(new_change_path);
        }
        if ((options === undefined) || ((options === null || options === void 0 ? void 0 : options.only_new_changes) === false)) {
            resultant_changes.deleted = previous_commit;
        }
        return (return_unstaged) ? Object.assign(Object.assign({}, resultant_changes), { unchanged: unchanged_files }) : resultant_changes;
    }
    return { flatten_tree, filter_staged_changes, infer_changes, hash_to_directory };
}
