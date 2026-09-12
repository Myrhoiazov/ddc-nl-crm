import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildBranchStats,
    buildGroupStats,
    isStudentActive,
    studentSummary,
} from './schedule.controller';

type ManagementBranches = Parameters<typeof buildBranchStats>[0];
type Student = Parameters<typeof studentSummary>[0];

const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const activeStudent: Student = {
    id: 1,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phoneNumber: null,
    expiresAt: future,
};

const inactiveStudent: Student = {
    id: 2,
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace@example.com',
    phoneNumber: null,
    expiresAt: past,
};

test('isStudentActive is true when expiresAt is null', () => {
    assert.equal(isStudentActive(null), true);
});

test('isStudentActive is true when expiresAt is in the future', () => {
    assert.equal(isStudentActive(future), true);
});

test('isStudentActive is false when expiresAt is in the past', () => {
    assert.equal(isStudentActive(past), false);
});

test('studentSummary adds an isActive flag while preserving the student fields', () => {
    const result = studentSummary(activeStudent);
    assert.equal(result.isActive, true);
    assert.equal(result.id, 1);
    assert.equal(result.firstName, 'Ada');
});

const branches = [
    {
        id: 10,
        name: 'Amsterdam',
        city: 'Amsterdam',
        address: 'Main St 1',
        isActive: true,
        clients: [activeStudent, inactiveStudent],
        groups: [
            {
                id: 100,
                name: 'Hip-hop kids',
                maxParticipants: 12,
                clientMemberships: [
                    { clientId: 1, client: activeStudent },
                ],
            },
        ],
    },
] as unknown as ManagementBranches;

test('buildBranchStats counts active/inactive students, capacity, and unassigned students', () => {
    const [stats] = buildBranchStats(branches);

    assert.equal(stats.id, 10);
    assert.equal(stats.groupCount, 1);
    assert.equal(stats.capacity, 12);
    assert.equal(stats.activeCount, 1);
    assert.equal(stats.inactiveCount, 1);
    // inactiveStudent (id 2) has no group membership -> unassigned
    assert.equal(stats.unassignedCount, 1);
});

test('buildBranchStats sums capacity across multiple groups and reports zero unassigned when everyone is in a group', () => {
    const branchesWithTwoGroups = [
        {
            id: 11,
            name: 'Rotterdam',
            city: 'Rotterdam',
            address: 'Side St 2',
            isActive: true,
            clients: [activeStudent, inactiveStudent],
            groups: [
                { id: 200, name: 'A', maxParticipants: 10, clientMemberships: [{ clientId: 1, client: activeStudent }] },
                { id: 201, name: 'B', maxParticipants: 8, clientMemberships: [{ clientId: 2, client: inactiveStudent }] },
            ],
        },
    ] as unknown as ManagementBranches;

    const [stats] = buildBranchStats(branchesWithTwoGroups);

    assert.equal(stats.capacity, 18);
    assert.equal(stats.unassignedCount, 0);
});

test('buildGroupStats reports per-group active/inactive/total counts', () => {
    const groupsWithMixedMembership = [
        {
            id: 12,
            name: 'Utrecht',
            groups: [
                {
                    id: 300,
                    name: 'Mixed group',
                    maxParticipants: 20,
                    clientMemberships: [
                        { clientId: 1, client: activeStudent },
                        { clientId: 2, client: inactiveStudent },
                    ],
                },
            ],
        },
    ] as unknown as ManagementBranches;

    const [group] = buildGroupStats(groupsWithMixedMembership);

    assert.equal(group.id, 300);
    assert.equal(group.branchId, 12);
    assert.equal(group.activeCount, 1);
    assert.equal(group.inactiveCount, 1);
    assert.equal(group.totalCount, 2);
});
