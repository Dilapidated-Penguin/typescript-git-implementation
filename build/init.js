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
exports.init = init;
exports.repo_exists = repo_exists;
exports.current_working_directory = current_working_directory;
exports.Repository = Repository;
const fs_1 = __importDefault(require("fs"));
const hidefile_1 = __importDefault(require("hidefile"));
const node_fs_1 = require("node:fs");
const path = __importStar(require("path"));
const config_json_1 = __importDefault(require("./util/config.json"));
const add_1 = require("./commands/add");
const branch_1 = require("./commands/branch");
const checkout_1 = require("./commands/checkout");
const commit_1 = require("./commands/commit");
const log_1 = require("./commands/log");
const merge_1 = require("./commands/merge");
const status_1 = require("./commands/status");
const tag_1 = require("./commands/tag");
function init(repo_directory) {
    const repo_paths = current_working_directory(repo_directory);
    const structure = [
        repo_paths.ref_heads_dir,
        repo_paths.ref_tags_dir,
        repo_paths.object_dir,
    ];
    structure.map((dir) => {
        return (0, node_fs_1.mkdirSync)(dir, { recursive: true });
    });
    fs_1.default.writeFileSync(repo_paths.index_dir, JSON.stringify([]), 'utf-8');
    fs_1.default.writeFileSync(repo_paths.HEAD_dir, 'main', 'utf-8');
    hidefile_1.default.hideSync(repo_paths.repo_dir);
}
function repo_exists(path_to_dir) {
    const path_stats = fs_1.default.statSync(path_to_dir);
    if (path_stats.isDirectory()) {
        return fs_1.default.existsSync(path.join(path_to_dir, config_json_1.default.repo_dir));
    }
    else {
        throw (console.error(`${path_to_dir} is an invalid directory`));
    }
}
function current_working_directory(working_directory = process.cwd()) {
    const default_repo = path.join(working_directory, config_json_1.default.repo_dir);
    return {
        ref_heads_dir: path.join(default_repo, ...config_json_1.default.ref_heads_dir),
        ref_tags_dir: path.join(default_repo, ...config_json_1.default.ref_tags_dir),
        object_dir: path.join(default_repo, config_json_1.default.object_dir),
        HEAD_dir: path.join(default_repo, config_json_1.default.HEAD_dir),
        index_dir: path.join(default_repo, config_json_1.default.index_dir),
        repo_dir: default_repo,
        path: working_directory,
        merge_head: path.join(default_repo, config_json_1.default.merge_head),
        merge_msg: path.join(default_repo, config_json_1.default.merge_msg)
    };
}
function Repository(repo_dir) {
    const repo_paths = current_working_directory(repo_dir);
    const bind = (fn) => fn.bind(repo_paths);
    init(repo_dir);
    return {
        repo_paths,
        add: bind(add_1.add),
        status: bind(status_1.status),
        log: bind(log_1.log),
        merge: bind(merge_1.merge),
        list_tags: bind(tag_1.list_tags),
        tag: bind(tag_1.tag),
        checkout: bind(checkout_1.checkout),
        commit: bind(commit_1.commit),
        branch: bind(branch_1.branch),
    };
}
