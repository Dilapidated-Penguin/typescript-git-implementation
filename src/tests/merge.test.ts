import {  merge_helper } from "../commands/merge/merge";
import { hunk } from "../commands/merge/merge";
const {edits_to_hunks, intersecting_base_space, three_way_merge} = merge_helper()
//intersections test==================================
it('intersecting_base_space',()=>{
    const a:hunk = {
        edit_list:[],
        hunk_space:[2,4]
    }
    const b:hunk = {
        edit_list:[],
        hunk_space:[3,0]
    }

    const d:hunk = {
        edit_list:[],
        hunk_space:[12,7]
    }
    const e:hunk = {
        edit_list:[],
        hunk_space:[14,2]
    }
    const c:hunk = {
        edit_list:[],
        hunk_space:[3,10]
    }
    expect((intersecting_base_space(
        a,
        [d,e]
    ))).toBe(undefined)

    expect((intersecting_base_space(
        d,
        [e,a]
    ))).toEqual(e)

})

//file merge test=====================================
// Base sequence (root)
const root_sequence = [
"Lorem ipsum dolor sit amet,",
"consectetur adipiscing elit.",
"Sed do eiusmod tempor incididunt,",
"ut labore et dolore magna aliqua.",
"Ut enim ad minim veniam,",
"quis nostrud exercitation ullamco,",
"laboris nisi ut aliquip ex ea.",
"Duis aute irure dolor in",
"reprehenderit in voluptate velit.",
"Excepteur sint occaecat cupidatat.",
];

// Feature branch: replaces lines 1-2 with one line, and inserts after line 7
const feature_hunk_list: hunk[] = [
{
    edit_list: [
    {
        original_output: [1, 3, 1, 2],
        base_space: [1, 2],
        ys_slice: ["consectetur adipiscing elit, sed do eiusmod."],
    },
    ],
    hunk_space: [1, 2],
},
{
    edit_list: [
    {
        original_output: [7, 7, 6, 7],
        base_space: [7, 0],
        ys_slice: ["FEATURE: New line inserted before reprehenderit."],
    },
    ],
    hunk_space: [7, 0],
},
];

// Master branch: modifies line 5 and replaces lines 8-9 with two new lines
const master_hunk_list: hunk[] = [
{
    edit_list: [
    {
        original_output: [5, 6, 5, 6],
        base_space: [5, 1],
        ys_slice: ["quis nostrud exercitation MASTER,"],
    },
    ],
    hunk_space: [5, 1],
},
{
    edit_list: [
    {
        original_output: [8, 10, 8, 10],
        base_space: [8, 2],
        ys_slice: [
        "reprehenderit in voluptate MASTER.",
        "Excepteur sint occaecat MASTER.",
        ],
    },
    ],
    hunk_space: [8, 2],
},
];
it('three-way-merge',()=>{
    const result:merge_helper = three_way_merge(root_sequence,feature_hunk_list,master_hunk_list)
    expect(result.file_contains_conflict).toBe(false)
    expect(result.final_sequence).toContain("quis nostrud exercitation MASTER,")
    expect(result.final_sequence).toContain("reprehenderit in voluptate MASTER.");
    expect(result.final_sequence).toContain("Excepteur sint occaecat MASTER.");
    expect(result.final_sequence).toContain("consectetur adipiscing elit, sed do eiusmod.");
    expect(result.final_sequence).toContain("FEATURE: New line inserted before reprehenderit.");
    expect(result.final_sequence).toContain("Lorem ipsum dolor sit amet,");
    expect(result.final_sequence).toContain("ut labore et dolore magna aliqua.");
})
it('three-way-merge-conflict',()=>{
    const feature_hunk_list_conflicting: hunk[] = [
        {
        edit_list: [
        {
        original_output: [4, 7, 4, 6],
        base_space: [4, 3],
        ys_slice: [
        "FEATURE: ut enim ad minim veniam,",
        "FEATURE: quis nostrud exercitation ullamco,", // overlaps master's line 5 edit
        ],
        },
        ],
        hunk_space: [4, 3],
        },
        {
            edit_list: [
            {
                original_output: [8, 10, 8, 11],
                base_space: [8, 2],
                ys_slice: [
                    "FEATURE: reprehenderit in voluptate velit.", // overlaps master's lines 8-9 edit
                    "FEATURE: Excepteur sint occaecat cupidatat.",
                    "FEATURE: Extra line added by feature branch.",
                ],
            },
            ],
            hunk_space: [8, 2],
        },
    ];
    const conflict_result:merge_helper  = three_way_merge(root_sequence,feature_hunk_list_conflicting,master_hunk_list)
    expect(conflict_result.file_contains_conflict).toBe(true)
    expect(conflict_result.final_sequence).toBe(`<<<<<<< HEAD`)
    expect(conflict_result.final_sequence).toContain(`=======`)
    expect(conflict_result.final_sequence).toContain(`>>>>>>> theirs`)
})
