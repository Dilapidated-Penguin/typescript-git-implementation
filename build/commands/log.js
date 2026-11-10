"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
const branch_logic_1 = require("../util/branch_logic");
const object_library_1 = require("../util/object_library");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Returns:
 * an array of commits providing the history of the present branch
 * @returns {history:commit[]}
 */
function log(branch_name) {
    const { get_HEAD_branch, get_branch_hash } = (0, branch_logic_1.branch_operations)(this);
    const { get_commit } = (0, object_library_1.object_library)(this);
    branch_name = branch_name !== null && branch_name !== void 0 ? branch_name : get_HEAD_branch();
    /*
    Check index file(directory/index) to check present add status
    Use present HEAD pointer to find most recent commit name => use that name to find the most recent commit in the als.objects and then recursively display those commits until one has no parent
    */
    const present_branch_hash = get_branch_hash(branch_name);
    if (present_branch_hash === null) {
        return [];
    }
    let current_commit = get_commit(present_branch_hash);
    //tags
    let tags_map = directory_to_map(this.ref_tags_dir);
    let head_map = directory_to_map(this.ref_heads_dir);
    //derive log list
    let resultant_list = [
        {
            commit: current_commit,
            commit_hash: present_branch_hash,
            branch_heads: [branch_name],
            HEAD: (branch_name === get_HEAD_branch()),
            tags: tags_map.get(present_branch_hash)
        }
    ];
    let last_commit = false;
    while (!last_commit) {
        if (current_commit.parent !== undefined) {
            const prev_hash = current_commit.parent;
            current_commit = get_commit(current_commit.parent);
            resultant_list.push({
                commit: current_commit,
                commit_hash: prev_hash,
                branch_heads: head_map.get(prev_hash),
                tags: tags_map.get(prev_hash),
            });
        }
        else {
            last_commit = true;
        }
    }
    return resultant_list;
}
const directory_to_map = (dir) => {
    const directory_list = fs_1.default.readdirSync(dir);
    let resultant_map = new Map();
    directory_list.forEach((filename) => {
        const hash = fs_1.default.readFileSync(path_1.default.join(dir, filename), 'utf-8').trim();
        if (resultant_map.has(hash)) {
            resultant_map.get(hash).push(filename);
        }
        else {
            resultant_map.set(hash, [filename]);
        }
    });
    return resultant_map;
};
