"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rm = rm;
const path_1 = __importDefault(require("path"));
const globby_1 = require("globby");
const branch_logic_1 = require("../util/branch_logic");
const fs_1 = __importDefault(require("fs"));
function rm(file_names, remove_from_index) {
    const { get_index, set_index } = (0, branch_logic_1.staging_logic)(this);
    const path_glob_list = file_names.map((current_path) => {
        const rel_path = path_1.default.relative(this.path, current_path);
        return rel_path.replace(/\\/g, '/');
    });
    const matched_files = path_glob_list.flatMap((path_glob) => {
        const path_files = (0, globby_1.globbySync)(path_glob_list, {
            expandDirectories: true,
            ignoreFiles: '.gitignore',
            cwd: this.path
        });
        if (path_files.length === 0) {
            throw new Error(`fatal: pathspec '${path_glob}' did not match any files`);
        }
        else {
            return path_files;
        }
    });
    matched_files.map((file_to_delete) => {
        file_to_delete = path_1.default.join(this.path, file_to_delete);
        if (remove_from_index) {
            const updated_index = get_index().filter((entry) => {
                return path_1.default.normalize(entry.reference_path) !== path_1.default.normalize(file_to_delete);
            });
            set_index(updated_index);
        }
        else {
            fs_1.default.rmSync(file_to_delete);
        }
    });
}
