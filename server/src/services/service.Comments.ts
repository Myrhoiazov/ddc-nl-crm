import prisma from '../../prisma/prisma-client'
import { Comment as TComment, User } from '@prisma/client';

const Comment = prisma.comment

export type CommentWithAuthor =
    TComment & {
        author?: User | null;
    };

export interface FindCommentsParams {
    entityType: 'client';
    entityId: number | string;
    expandUser?: boolean;
}


export const findManyComments = async (data: FindCommentsParams): Promise<CommentWithAuthor[]> => {

    const comments = await Comment.findMany({
        where: { clientId: Number(data.entityId) },
        orderBy: { createdAt: 'desc' },
        include: {
            author: data.expandUser
                ? {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                }
                : false,
        },
    });

    return comments

}


export const createComment = async (data: TComment) => {

    return await Comment.create({
        data: {
            text: data?.text,
            userId: Number(data.userId),
            clientId: data.clientId ? Number(data.clientId) : undefined,
        },
        include: {
            author: true,
            client: true,
        },
    });
};
