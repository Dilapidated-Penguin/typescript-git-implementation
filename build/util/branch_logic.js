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
exports.branch_operations = branch_operations;
exports.staging_logic = staging_logic;
const fs_1 = __importDefault(require("fs"));
const path = __importStar(require("path"));
function branch_operations(path_directories) {
    const hash_to_dir = (hash) => {
        return [hash.slice(0, 2), hash.slice(2)];
    };
    const get_HEAD_branch = () => {
        return fs_1.default.readFileSync(path_directories.HEAD_dir, 'utf-8');
    };
    const is_branch = (branch_name) => {
        try {
            return fs_1.default.readdirSync(path_directories.ref_heads_dir).includes(branch_name);
        }
        catch (_a) {
            return false;
        }
    };
    const get_branch_hash = (branch_name) => {
        const branch_dir = path.join(path_directories.ref_heads_dir, branch_name);
        if (!fs_1.default.existsSync(branch_dir)) {
            return null;
        }
        const last_commit = fs_1.default.readFileSync(branch_dir, 'utf-8');
        return last_commit || null;
    };
    const get_HEAD_hash = () => {
        return get_branch_hash(get_HEAD_branch());
    };
    return { hash_to_dir, get_HEAD_branch, is_branch, get_branch_hash, get_HEAD_hash };
}
//staging logic:-----
function staging_logic(path_directories) {
    const get_index = () => {
        const raw_index = fs_1.default.readFileSync(path_directories.index_dir, 'utf-8');
        return JSON.parse(raw_index);
    };
    const set_index = (data) => {
        fs_1.default.writeFileSync(path_directories.index_dir, JSON.stringify(data));
    };
    const append_index = (new_entries) => {
        let index = get_index();
        index = index
            .filter((index_el) => {
            return new_entries.find((new_entry) => new_entry.reference_path === index_el.reference_path) === undefined;
        });
        index.push(...new_entries);
        set_index(index);
    };
    return { get_index, set_index, append_index };
}
