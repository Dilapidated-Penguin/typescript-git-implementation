"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.object_library = object_library;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const branch_logic_1 = require("./branch_logic");
const pako_1 = __importDefault(require("pako"));
const node_object_hash_1 = require("node-object-hash");
function object_library(path_directories) {
    const { hash_to_dir } = (0, branch_logic_1.branch_operations)(path_directories);
    //get_commands
    const get_commit = (hash) => {
        return get_object(hash);
    };
    const get_object = (hash) => {
        const commit_dir = path_1.default.join(path_directories.object_dir, ...hash_to_dir(hash));
        if (fs_1.default.existsSync(commit_dir)) {
            return JSON.parse(pako_1.default.inflate(new Uint8Array(fs_1.default.readFileSync(commit_dir)), { to: 'string' }));
        }
        else {
            return null;
        }
    };
    //set_commands
    const derive_object_hash = (obj) => {
        const compressed_data = pako_1.default.deflate(JSON.stringify(obj));
        var tree_hasher = (0, node_object_hash_1.hasher)({ sort: true, coerce: true });
        return { compressed_data: compressed_data, hash: tree_hasher.hash(compressed_data) };
    };
    const save_object = (object_to_save) => {
        const { compressed_data, hash: object_hash } = derive_object_hash(object_to_save);
        const object_directory = path_1.default.join(path_directories.object_dir, ...hash_to_dir(object_hash));
        if (!fs_1.default.existsSync(object_directory)) {
            fs_1.default.mkdirSync(path_1.default.dirname(object_directory), { recursive: true });
            fs_1.default.writeFileSync(object_directory, compressed_data);
        }
        return object_hash;
    };
    const is_object = (object_hash) => {
        const file = path_1.default.join(path_directories.object_dir, ...hash_to_dir(object_hash));
        const object_stats = fs_1.default.statSync(file);
        return object_stats.isFile();
    };
    const clear_directory = () => {
        fs_1.default.readdirSync(path_directories.path)
            .filter(sub_path => {
            console.log(path_1.default.resolve(sub_path));
            console.log(path_1.default.resolve(path_directories.repo_dir));
            return path_1.default.resolve(sub_path) !== path_1.default.resolve(path_directories.repo_dir);
        })
            .map((sub_path) => {
            console.log('delete', sub_path);
            console.log('delete', path_1.default.dirname(sub_path));
            fs_1.default.rmSync(sub_path);
        });
    };
    return { get_commit, get_object, save_object, is_object, derive_object_hash, clear_directory };
}
