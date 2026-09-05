import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Halls ────────────────────────────────────────────────────────────────────

export const getHalls = async (_req: Request, res: Response) => {
    const halls = await prisma.hall.findMany({ orderBy: { name: 'asc' } });
    return res.json(halls);
};

export const createHall = async (req: Request, res: Response) => {
    const { name, capacity } = req.body;
    if (!name) return res.status(400).json({ message: 'name required' });
    const hall = await prisma.hall.create({ data: { name, capacity: capacity ? Number(capacity) : null } });
    return res.status(201).json(hall);
};

export const deleteHall = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await prisma.hall.delete({ where: { id } });
    return res.json({ ok: true });
};

// ─── Choreographers ───────────────────────────────────────────────────────────

export const getChoreographers = async (_req: Request, res: Response) => {
    const list = await prisma.choreographer.findMany({ orderBy: { firstName: 'asc' } });
    return res.json(list);
};

export const createChoreographer = async (req: Request, res: Response) => {
    const {
        firstName, lastName, firstNameUa, lastNameUa, firstNameEn, lastNameEn,
        email, phone, birthday, experience, category,
        photo, mainPhoto, additionalPhotos,
        description, templateDescription, showOnSite,
    } = req.body;

    if (!firstName || !lastName) return res.status(400).json({ message: 'firstName and lastName required' });

    const choreographer = await prisma.choreographer.create({
        data: {
            firstName, lastName,
            firstNameUa: firstNameUa || null,
            lastNameUa: lastNameUa || null,
            firstNameEn: firstNameEn || null,
            lastNameEn: lastNameEn || null,
            email: email || null,
            phone: phone || null,
            birthday: birthday || null,
            experience: experience ? Number(experience) : null,
            category: category || null,
            photo: photo || null,
            mainPhoto: mainPhoto || null,
            additionalPhotos: additionalPhotos ? JSON.stringify(additionalPhotos) : null,
            description: description || null,
            templateDescription: templateDescription || null,
            showOnSite: showOnSite !== undefined ? Boolean(showOnSite) : true,
        },
    });
    return res.status(201).json(choreographer);
};

export const updateChoreographer = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const {
        firstName, lastName, firstNameUa, lastNameUa, firstNameEn, lastNameEn,
        email, phone, birthday, experience, category,
        photo, mainPhoto, additionalPhotos,
        description, templateDescription, showOnSite,
    } = req.body;

    const choreographer = await prisma.choreographer.update({
        where: { id },
        data: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            firstNameUa: firstNameUa ?? undefined,
            lastNameUa: lastNameUa ?? undefined,
            firstNameEn: firstNameEn ?? undefined,
            lastNameEn: lastNameEn ?? undefined,
            ...(email !== undefined && { email: email || null }),
            ...(phone !== undefined && { phone: phone || null }),
            ...(birthday !== undefined && { birthday: birthday || null }),
            ...(experience !== undefined && { experience: experience ? Number(experience) : null }),
            ...(category !== undefined && { category: category || null }),
            ...(photo !== undefined && { photo: photo || null }),
            ...(mainPhoto !== undefined && { mainPhoto: mainPhoto || null }),
            ...(additionalPhotos !== undefined && {
                additionalPhotos: additionalPhotos ? JSON.stringify(additionalPhotos) : null,
            }),
            ...(description !== undefined && { description: description || null }),
            ...(templateDescription !== undefined && { templateDescription: templateDescription || null }),
            ...(showOnSite !== undefined && { showOnSite: Boolean(showOnSite) }),
        },
    });
    return res.json(choreographer);
};

export const deleteChoreographer = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await prisma.choreographer.delete({ where: { id } });
    return res.json({ ok: true });
};

// ─── Dance Groups ─────────────────────────────────────────────────────────────

const groupInclude = {
    choreographer: true,
    hall: true,
    branch: true,
    slots: { orderBy: { dayOfWeek: 'asc' as const } },
};

const studentSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    phoneNumber: true,
    expiresAt: true,
};

const isStudentActive = (expiresAt: Date | null) => !expiresAt || expiresAt >= new Date();

const studentSummary = (student: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
    expiresAt: Date | null;
}) => ({
    ...student,
    isActive: isStudentActive(student.expiresAt),
});

const loadManagementBranches = () => prisma.branch.findMany({
    include: {
        clients: {
            select: studentSelect,
            orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        },
        groups: {
            include: {
                clientMemberships: {
                    include: { client: { select: studentSelect } },
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { name: 'asc' },
        },
    },
    orderBy: { name: 'asc' },
});

const buildBranchStats = (branches: Awaited<ReturnType<typeof loadManagementBranches>>) => branches.map((branch) => {
    const students = branch.clients.map(studentSummary);
    const activeStudents = students.filter((student) => student.isActive);
    const inactiveStudents = students.filter((student) => !student.isActive);
    const assignedStudentIds = new Set(
        branch.groups.flatMap((group) => group.clientMemberships.map((membership) => membership.clientId)),
    );

    return {
        id: branch.id,
        name: branch.name,
        city: branch.city,
        address: branch.address,
        isActive: branch.isActive,
        groupCount: branch.groups.length,
        capacity: branch.groups.reduce((sum, group) => sum + group.maxParticipants, 0),
        activeCount: activeStudents.length,
        inactiveCount: inactiveStudents.length,
        unassignedCount: students.filter((student) => !assignedStudentIds.has(student.id)).length,
        activeStudents,
        inactiveStudents,
    };
});

const buildGroupStats = (branches: Awaited<ReturnType<typeof loadManagementBranches>>) => branches.flatMap((branch) => branch.groups.map((group) => {
    const students = group.clientMemberships.map((membership) => studentSummary(membership.client));
    const activeStudents = students.filter((student) => student.isActive);
    const inactiveStudents = students.filter((student) => !student.isActive);

    return {
        id: group.id,
        name: group.name,
        branchId: branch.id,
        activeCount: activeStudents.length,
        inactiveCount: inactiveStudents.length,
        totalCount: students.length,
        activeStudents,
        inactiveStudents,
    };
}));

export const getGroupManagementStats = async (_req: Request, res: Response) => {
    const branches = await loadManagementBranches();

    const branchStats = buildBranchStats(branches);

    const groupStats = buildGroupStats(branches);

    const allStudents = branchStats.flatMap((branch) => [
        ...branch.activeStudents,
        ...branch.inactiveStudents,
    ]);

    return res.json({
        totals: {
            branchCount: branchStats.length,
            groupCount: groupStats.length,
            activeCount: allStudents.filter((student) => student.isActive).length,
            inactiveCount: allStudents.filter((student) => !student.isActive).length,
            capacity: branchStats.reduce((sum, branch) => sum + branch.capacity, 0),
        },
        branches: branchStats,
        groups: groupStats,
    });
};

export const getGroups = async (req: Request, res: Response) => {
    const { style, level, choreographerId, _q, page = '1', limit = '50' } = req.query as Record<string, string>;

    const where: any = {};
    if (style) where.style = style;
    if (level) where.level = level;
    if (choreographerId) where.choreographerId = Number(choreographerId);
    if (_q) where.name = { contains: _q };

    const [total, groups] = await Promise.all([
        prisma.danceGroup.count({ where }),
        prisma.danceGroup.findMany({
            where,
            include: groupInclude,
            orderBy: { createdAt: 'asc' },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        }),
    ]);

    return res.json({ total, data: groups });
};

export const getGroupById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const group = await prisma.danceGroup.findUnique({ where: { id }, include: groupInclude });
    if (!group) return res.status(404).json({ message: 'Not found' });
    return res.json(group);
};

export const createGroup = async (req: Request, res: Response) => {
    const { name, style, level, maxParticipants, lessonPriceCents, choreographerId, branchId, slots } = req.body;

    if (!name || !style || !choreographerId || !branchId) {
        return res.status(400).json({ message: 'name, style, choreographerId, branchId required' });
    }

    const parsedLessonPriceCents = Number(lessonPriceCents ?? 0);
    if (!Number.isInteger(parsedLessonPriceCents) || parsedLessonPriceCents < 0) {
        return res.status(400).json({ message: 'lessonPriceCents must be a non-negative integer' });
    }

    const group = await prisma.danceGroup.create({
        data: {
            name,
            style,
            level: level ?? 'START',
            maxParticipants: maxParticipants ? Number(maxParticipants) : 20,
            lessonPriceCents: parsedLessonPriceCents,
            choreographerId: Number(choreographerId),
            branchId: Number(branchId),
            slots: slots?.length
                ? { create: slots.map((s: any) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime })) }
                : undefined,
        },
        include: groupInclude,
    });

    return res.status(201).json(group);
};

export const updateGroup = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { name, style, level, maxParticipants, lessonPriceCents, choreographerId, branchId, slots } = req.body;

    const parsedLessonPriceCents = lessonPriceCents === undefined ? undefined : Number(lessonPriceCents);
    if (
        parsedLessonPriceCents !== undefined
        && (!Number.isInteger(parsedLessonPriceCents) || parsedLessonPriceCents < 0)
    ) {
        return res.status(400).json({ message: 'lessonPriceCents must be a non-negative integer' });
    }

    // Replace all slots
    if (slots !== undefined) {
        await prisma.scheduleSlot.deleteMany({ where: { groupId: id } });
    }

    const group = await prisma.danceGroup.update({
        where: { id },
        data: {
            ...(name && { name }),
            ...(style && { style }),
            ...(level && { level }),
            ...(maxParticipants !== undefined && { maxParticipants: Number(maxParticipants) }),
            ...(parsedLessonPriceCents !== undefined && { lessonPriceCents: parsedLessonPriceCents }),
            ...(choreographerId && { choreographerId: Number(choreographerId) }),
            ...(branchId !== undefined && { branchId: branchId ? Number(branchId) : null }),
            ...(slots !== undefined && {
                slots: { create: slots.map((s: any) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime })) },
            }),
        },
        include: groupInclude,
    });

    return res.json(group);
};

export const deleteGroup = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await prisma.danceGroup.delete({ where: { id } });
    return res.json({ ok: true });
};

// ─── Styles (unique values from groups) ──────────────────────────────────────

export const getStyles = async (_req: Request, res: Response) => {
    const [styles, groups] = await Promise.all([
        prisma.danceStyle.findMany({ where: { isActive: true }, select: { name: true } }),
        prisma.danceGroup.findMany({ select: { style: true }, distinct: ['style'] }),
    ]);
    return res.json(Array.from(new Set([
        ...styles.map((style) => style.name),
        ...groups.map((group) => group.style),
    ])).sort());
};

const optionalTrimmedString = (value: unknown): string | null => (value ? String(value).trim() : null);

const danceStyleData = (body: Record<string, unknown>) => ({
    name: String(body.name ?? '').trim(),
    nameUa: optionalTrimmedString(body.nameUa),
    nameEn: optionalTrimmedString(body.nameEn),
    description: optionalTrimmedString(body.description),
    descriptionUa: optionalTrimmedString(body.descriptionUa),
    descriptionEn: optionalTrimmedString(body.descriptionEn),
    content: optionalTrimmedString(body.content),
    contentUa: optionalTrimmedString(body.contentUa),
    contentEn: optionalTrimmedString(body.contentEn),
    image: optionalTrimmedString(body.image),
    youtubeUrl: optionalTrimmedString(body.youtubeUrl),
    isActive: body.isActive === undefined ? true : Boolean(body.isActive),
});

export const getStyleCards = async (req: Request, res: Response) => {
    const { _q = '', status = 'all', sort = 'name-asc' } = req.query as Record<string, string>;
    const where: any = {};
    if (_q) {
        where.OR = [
            { name: { contains: _q } },
            { nameUa: { contains: _q } },
            { nameEn: { contains: _q } },
            { description: { contains: _q } },
        ];
    }
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const orderBy = sort === 'name-desc'
        ? { name: 'desc' as const }
        : sort === 'newest'
            ? { createdAt: 'desc' as const }
            : { name: 'asc' as const };

    const items = await prisma.danceStyle.findMany({ where, orderBy });
    return res.json({ items, total: items.length });
};

export const createStyleCard = async (req: Request, res: Response) => {
    const data = danceStyleData(req.body);
    if (!data.name) return res.status(400).json({ message: 'Название обязательно' });
    return res.status(201).json(await prisma.danceStyle.create({ data }));
};

export const updateStyleCard = async (req: Request, res: Response) => {
    const data = danceStyleData(req.body);
    if (!data.name) return res.status(400).json({ message: 'Название обязательно' });
    return res.json(await prisma.danceStyle.update({ where: { id: Number(req.params.id) }, data }));
};

export const deleteStyleCard = async (req: Request, res: Response) => {
    await prisma.danceStyle.delete({ where: { id: Number(req.params.id) } });
    return res.json({ ok: true });
};
