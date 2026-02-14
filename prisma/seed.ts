
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const tenantsData = [
        { firstName: 'Jean', lastName: 'Dupont', email: 'jean.dupont@example.com', phone: '0601020304' },
        { firstName: 'Marie', lastName: 'Martin', email: 'marie.martin@example.com', phone: '0612345678' },
        { firstName: 'Pierre', lastName: 'Durand', email: 'pierre.durand@example.com', phone: '0687654321' },
        { firstName: 'Sophie', lastName: 'Leroy', email: 'sophie.leroy@example.com', phone: '0655443322' },
        { firstName: 'Luc', lastName: 'Moreau', email: 'luc.moreau@example.com', phone: '0699887766' },
        { firstName: 'Julie', lastName: 'Simon', email: 'julie.simon@example.com', phone: '0611223344' },
        { firstName: 'Thomas', lastName: 'Laurent', email: 'thomas.laurent@example.com', phone: '0622334455' },
        { firstName: 'Emma', lastName: 'Lefevre', email: 'emma.lefevre@example.com', phone: '0633445566' },
        { firstName: 'Nicolas', lastName: 'Michel', email: 'nicolas.michel@example.com', phone: '0644556677' },
        { firstName: 'Alice', lastName: 'Garcia', email: 'alice.garcia@example.com', phone: '0655667788' },
    ]

    const apartmentsData = [
        { address: '10 Rue de la Paix', city: 'Paris', zipCode: '75002', rent: 1500, charges: 100, complement: 'Interphone B' },
        { address: '25 Avenue des Champs-Elysées', city: 'Paris', zipCode: '75008', rent: 2500, charges: 200, complement: '3ème étage' },
        { address: '5 Boulevard Saint-Michel', city: 'Paris', zipCode: '75005', rent: 1200, charges: 80 },
        { address: '1 Place du Capitole', city: 'Toulouse', zipCode: '31000', rent: 900, charges: 50 },
        { address: '42 Rue St-Rome', city: 'Toulouse', zipCode: '31000', rent: 850, charges: 45 },
        { address: '8 Quai des Chartrons', city: 'Bordeaux', zipCode: '33000', rent: 1100, charges: 90, complement: 'Vue Garonne' },
        { address: '12 Cours Victor Hugo', city: 'Bordeaux', zipCode: '33000', rent: 950, charges: 60 },
        { address: '3 Rue de la République', city: 'Lyon', zipCode: '69001', rent: 1300, charges: 110 },
        { address: '15 Place Bellecour', city: 'Lyon', zipCode: '69002', rent: 1400, charges: 120 },
        { address: '7 Promenade des Anglais', city: 'Nice', zipCode: '06000', rent: 1600, charges: 150, complement: 'Terrasse' },
    ]

    console.log('Start seeding tenants...')
    for (const t of tenantsData) {
        const tenant = await prisma.tenant.upsert({
            where: { email: t.email },
            update: {},
            create: t,
        })
        console.log(`Created tenant with id: ${tenant.id}`)
    }

    console.log('Start seeding apartments...')
    for (const a of apartmentsData) {
        // We don't have a unique constraint on address, so we just create. 
        // To avoid duplicates on multiple runs, one might check existence first, but for now simple create is enough or deleteMany first.
        // Let's check if exists by address to be cleaner.
        const existing = await prisma.apartment.findFirst({ where: { address: a.address } });
        if (!existing) {
            const apt = await prisma.apartment.create({
                data: a
            })
            console.log(`Created apartment with id: ${apt.id}`)
        } else {
            console.log(`Apartment ${a.address} already exists.`)
        }
    }

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
