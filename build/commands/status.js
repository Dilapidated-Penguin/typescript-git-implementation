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
exports.status = status;
exports.current_project_state = current_project_state;
exports.output_record = output_record;
exports.output_changes = output_changes;
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const colors_1 = __importDefault(require("colors"));
const globby_1 = require("globby");
const init_1 = require("../init");
const object_library_1 = require("../util/object_library");
const branch_logic_1 = require("../util/branch_logic");
const changes_1 = require("../util/changes");
/**
 * Generate an array of blob references for the index and the current file state.
Create a function to infer the different edits:
** works with and outputs files only**
 */
function status() {
    const { flatten_tree, infer_changes } = (0, changes_1.change_operations)(this);
    const { get_HEAD_branch, get_branch_hash } = (0, branch_logic_1.branch_operations)(this);
    const { get_object, get_commit } = (0, object_library_1.object_library)(this);
    const { get_index } = (0, branch_logic_1.staging_logic)(this);
    let commit_message = '';
    const changes_without_unchanged = (key, val) => {
        key = (key === 'unchanged') ? '' : (key === 'new_files') ? 'new file: ' : `${key}: `;
        return `\t${key}${val}`;
    };
    const index = get_index();
    const index_map = flatten_tree(index, { files_only: true }); //index
    const project_working_state = current_project_state.bind(this)(); //working directory
    const branch_name = get_HEAD_branch();
    const branch_hash = get_branch_hash(branch_name);
    let last_commit_directory = new Map(); //last commit directory
    commit_message += `on branch ${branch_name}\n`;
    if (branch_hash === null) {
        commit_message += 'No commits yet\n';
    }
    else {
        const last_commit = get_commit(branch_hash);
        last_commit_directory = flatten_tree(get_object(last_commit.tree_hash));
    }
    const inferred_staged = infer_changes(last_commit_directory, index_map, { only_new_changes: false });
    const index_changes_occur = Object.values(inferred_staged).find((prop_map) => prop_map.size !== 0) !== undefined;
    const unstaged_changes = infer_changes(index_map, project_working_state, { only_new_changes: false });
    const untracked_files = new Map(unstaged_changes.new_files);
    unstaged_changes.new_files = new Map();
    const unstaged_changes_occur = Object.values(unstaged_changes).find((prop_map) => prop_map.size !== 0) !== undefined;
    const working_tree_clean = (!index_changes_occur) && (!unstaged_changes_occur) && (untracked_files.size === 0);
    if (working_tree_clean) {
        commit_message += 'nothing to commit(create/copy files to track), working tree clean\n';
        return {
            message: commit_message
        };
    }
    //changes to be committed:
    if (index_changes_occur) {
        commit_message += `Changes to be committed:\n   `;
        commit_message += colors_1.default.red(output_changes(inferred_staged, changes_without_unchanged)) + `\n`;
    }
    //changes not staged:
    if (unstaged_changes_occur) {
        commit_message += `changes not staged:\n   `;
        commit_message += colors_1.default.red(output_changes(unstaged_changes, changes_without_unchanged)) + `\n`;
    }
    //untracked files:
    if (untracked_files.size !== 0) {
        commit_message += `untracked files:\n   (use "node-git add <file>..." to stage)\n`;
        commit_message += colors_1.default.red(output_record(untracked_files, undefined)) + `\n`;
    }
    return {
        message: commit_message,
        unstaged_changes: unstaged_changes,
        staged_changes: inferred_staged,
    };
}
//helper-------------------------------------------------------------
/**
 * returns a map where Map<string,string> = Map<directory,hash>.
 * Each entry represent a file in the project directory
 * The repo directory is ignored as well as all paths specified in a .gitignore file wihtin the project
 * @param project_path
 * @returns {Map<string,string>} Map<directory,hash>.
 */
function current_project_state(project_path) {
    const { derive_object_hash } = (0, object_library_1.object_library)(this);
    project_path = project_path !== null && project_path !== void 0 ? project_path : process.cwd();
    const results = (0, globby_1.globbySync)((0, globby_1.convertPathToPattern)(project_path), {
        expandDirectories: true,
        ignore: [(0, init_1.current_working_directory)(project_path).repo_dir],
        ignoreFiles: '.gitignore',
        cwd: project_path
    });
    let resultant_map = new Map();
    for (const file_path of results) {
        const file_data = fs.readFileSync(file_path, 'utf-8');
        resultant_map.set(file_path, derive_object_hash(file_data).hash);
    }
    return resultant_map;
}
function output_record(record, status, output_format, working_path = process.cwd()) {
    return [...record.keys()]
        .map((directory) => {
        const record_dir = path_1.default.relative(working_path, directory);
        if (output_format) {
            return output_format(status !== null && status !== void 0 ? status : '', record_dir.replace(/\\/g, '/'));
        }
        return `\t${status ? `${status}: ` : ''}${record_dir.replace(/\\/g, '/')}`;
    }).join(`\n`);
}
function output_changes(change_obj, output_format) {
    return Object.entries(change_obj)
        .filter(([change_key, record]) => record.size > 0)
        .map(([change_key, record]) => {
        return output_record(record, change_key, output_format);
    })
        .join('\n');
}
