"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.add = add;
const path_1 = __importDefault(require("path"));
const globby_1 = require("globby");
const fs_1 = __importDefault(require("fs"));
const branch_logic_1 = require("../util/branch_logic");
const object_library_1 = require("../util/object_library");
/**
 * @param {string[]} input_paths The list of paths the user is looking to add
 * @param {string[]} to_ignore The list of files and directories the user is looking to be ignored.
 * A list of tree_references is generated for the files to be committed and then written to the index file
 * All files staged to be committed are made into blobs and those blobs are hashed and placed into the objects directory
 * Any files that have been deleted in the file system have any reference to them removed from the index
 */
function add(input_paths, to_ignore) {
    const { save_object } = (0, object_library_1.object_library)(this);
    const { append_index, get_index, set_index } = (0, branch_logic_1.staging_logic)(this);
    to_ignore.push(this.repo_dir.replace(/\\/g, '/'));
    to_ignore = to_ignore.map((ignore_path) => {
        return (0, globby_1.convertPathToPattern)(ignore_path);
    });
    const path_glob_list = input_paths.map((current_path) => {
        const rel_path = path_1.default.relative(this.path, current_path);
        return rel_path.replace(/\\/g, '/');
    });
    let index_deletion = [];
    const matched_files = path_glob_list.flatMap((path_glob) => {
        const path_files = (0, globby_1.globbySync)(path_glob, {
            expandDirectories: true,
            ignore: to_ignore,
            ignoreFiles: '.gitignore',
            cwd: this.path
        });
        if (path_files.length === 0) {
            const index_contains_glob = get_index().find((index_entry) => {
                return path_1.default.normalize(index_entry.reference_path) === path_1.default.normalize(path_1.default.join(this.path, path_glob));
            }) !== undefined;
            if (index_contains_glob) {
                index_deletion.push(path_1.default.normalize(path_1.default.join(this.path, path_glob)));
                return [];
            }
            else {
                throw new Error(`fatal: pathspec '${path_glob}' did not match any files`);
            }
        }
        else {
            return path_files;
        }
    });
    const index_addition = matched_files.flatMap((rel_file_path) => {
        try {
            const file_data = fs_1.default.readFileSync(rel_file_path, 'utf-8');
            return {
                reference_path: path_1.default.join(this.path, rel_file_path).replace(/\\/g, '/'),
                hash: save_object(file_data),
                stage: 0
            };
        }
        catch (err) {
            if (err instanceof Error && 'code' in err) {
                switch (err.code) {
                    case 'ENOENT':
                        throw new Error(`file: ${rel_file_path} not found`);
                    case 'EACCES':
                        throw new Error(`permission denied for file: ${rel_file_path}`);
                    default:
                        throw new Error(`unexpected error, code:${err.code}`);
                }
            }
            return []; // non-Error throws (shouldn't happen, but satisfies return type)
        }
    });
    index_deletion.map((path_glob) => {
        const current_index = get_index();
        const updated_index = current_index.filter((entry) => {
            return path_1.default.normalize(entry.reference_path) !== path_glob;
        });
        if (updated_index === current_index) {
            throw new Error(`fatal: pathspec ${path_glob} did not match any files`);
        }
        set_index(updated_index);
    });
    console.dir(index_addition);
    append_index(index_addition);
}
