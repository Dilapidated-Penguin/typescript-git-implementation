
# node git implementation

A minimal implementation of Git, written in typescript, built to learn how Git works under the hood.
Intended largely for educational purposes.
## Goals

- Understand Git's core data model by building it's most foundational commands
- Readable and modular implementation allowing for an easy examination of the principal git commands and future salvage for any other future version control 
projects
- Reasonably performant
## How git works


Git is a content-addressable filesystem with a version control interface on top.

- **Objects** live in `.git/objects`, keyed by the SHA-1 hash of their content (plus a header). There are four types:
  - **Blob**: the contents of a file (no name, no metadata)
  - **Tree**: a directory listing mapping names and modes to blobs or other trees
  <img width="452" height="73" alt="tree" src="https://github.com/user-attachments/assets/236562ad-a947-4104-ae5e-b232beb697cb" />
  - **Commit**: points to a tree (the snapshot), zero or more parent commits, and author/committer/message metadata
  - **Tag**: an annotated pointer to another object
- **Refs** are human-readable names for commit hashes. Branches are files under `.git/refs/heads/`, and tags are under `.git/refs/tags/`.
- **HEAD** says what is currently checked out. It's usually a symbolic ref to a branch (`ref: refs/heads/main`) but can be a raw commit hash (detached HEAD).
- **The index (staging area)** is a file at `.git/index` recording what the next commit's tree will look like.
- **Snapshots, not diffs:** each commit stores a full tree.


## Implemented commands
Refer to the help menu for a list of commands within this project
<img width="742" height="307" alt="Capture" src="https://github.com/user-attachments/assets/79635d37-5c60-42fb-aeb3-a85f5eed6ffb" />

## On disk layout
Usage aligns largely with the usage of git for the aformentioned implemented commands

```
.<repo-dir>/
├── objects/      # stored objects
├── refs/
│   └── heads/    # branches
├── HEAD
└── index
```
## Differences from Git

Making use of the node-object-hash@3.1.1 package, and the pako@2.1.0 package, using zlib compression, the objects library in this implementation, closely mirroring their git counterpart with the principal difference being that objects being that git objects, for the sake of readability are constructed using typescript objects:
- Commits:
<img width="679" height="114" alt="image" src="https://github.com/user-attachments/assets/a3c165c2-a6b1-4ef8-bd8b-e25881c33415" />
- Trees and index:
Tree objects and the index are constructed using a list of the tree_reference object:
<img width="250" height="100" alt="image" src="https://github.com/user-attachments/assets/da7d2be1-4bb2-4374-b716-5d81c53f4e08" />

## Resources

- [Pro Git book, "Git Internals" chapter](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain)
- [Git documentation](https://git-scm.com/docs)
