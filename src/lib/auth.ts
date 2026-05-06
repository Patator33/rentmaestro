import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function getUser() {
    return prisma.user.findFirst();
}

export async function getUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
}

export async function getAllUsers() {
    return prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
}

export async function hasUser(): Promise<boolean> {
    const count = await prisma.user.count();
    return count > 0;
}
