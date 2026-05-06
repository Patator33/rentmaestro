const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function d(y, m, day) {
  return new Date(y, m - 1, day);
}

async function main() {
  console.log('Nettoyage de la base...');
  await prisma.rentPayment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.apartment.deleteMany();
  await prisma.tenant.deleteMany();

  // ── Locataires ──────────────────────────────────────────────────────────────
  console.log('Création des locataires...');
  const tenants = await Promise.all([
    prisma.tenant.create({ data: { id: uuid(), firstName: 'Thomas', lastName: 'Dupont', email: 'thomas.dupont@gmail.com', phone: '06 12 34 56 78', paymentDay: 5 } }),
    prisma.tenant.create({ data: { id: uuid(), firstName: 'Sophie', lastName: 'Martin', email: 'sophie.martin@outlook.fr', phone: '06 23 45 67 89', paymentDay: 1 } }),
    prisma.tenant.create({ data: { id: uuid(), firstName: 'Julien', lastName: 'Leroy', email: 'julien.leroy@gmail.com', phone: '07 34 56 78 90', paymentDay: 5, coTenantFirstName: 'Camille', coTenantLastName: 'Leroy', coTenantEmail: 'camille.leroy@gmail.com' } }),
    prisma.tenant.create({ data: { id: uuid(), firstName: 'Amira', lastName: 'Benzara', email: 'amira.benzara@yahoo.fr', phone: '06 45 67 89 01', paymentDay: 10 } }),
    prisma.tenant.create({ data: { id: uuid(), firstName: 'Lucas', lastName: 'Girard', email: 'lucas.girard@gmail.com', phone: '07 56 78 90 12', paymentDay: 5 } }),
    prisma.tenant.create({ data: { id: uuid(), firstName: 'Emma', lastName: 'Bernard', email: 'emma.bernard@gmail.com', phone: '06 67 89 01 23', paymentDay: 1 } }),
    prisma.tenant.create({ data: { id: uuid(), firstName: 'Maxime', lastName: 'Petit', email: 'maxime.petit@hotmail.fr', phone: '07 78 90 12 34', paymentDay: 15 } }),
    prisma.tenant.create({ data: { id: uuid(), firstName: 'Inès', lastName: 'Moreau', email: 'ines.moreau@gmail.com', phone: '06 89 01 23 45', paymentDay: 5 } }),
    prisma.tenant.create({ data: { id: uuid(), firstName: 'Kevin', lastName: 'Lefebvre', email: 'kevin.lefebvre@sfr.fr', phone: '07 90 12 34 56', paymentDay: 1 } }),
    prisma.tenant.create({ data: { id: uuid(), firstName: 'Chloé', lastName: 'Simon', email: 'chloe.simon@gmail.com', phone: '06 01 23 45 67', paymentDay: 5 } }),
  ]);

  // ── Appartements ────────────────────────────────────────────────────────────
  console.log('Création des appartements...');
  const apartments = await Promise.all([
    prisma.apartment.create({ data: { id: uuid(), name: 'Apt. 12 Bellecour', address: '12 Place Bellecour', city: 'Lyon', zipCode: '69002', rent: 850, charges: 80, description: 'T2 lumineux, 3e étage sans ascenseur', mortgageAmount: 620, insuranceAmount: 18, taxAmount: 1200, defaultDeposit: 850 } }),
    prisma.apartment.create({ data: { id: uuid(), name: 'Studio Garibaldi', address: '5 Rue Garibaldi', city: 'Lyon', zipCode: '69003', rent: 580, charges: 50, description: 'Studio meublé, plein sud', mortgageAmount: 0, insuranceAmount: 12, taxAmount: 780, defaultDeposit: 580 } }),
    prisma.apartment.create({ data: { id: uuid(), name: 'T3 Croix-Rousse', address: '27 Boulevard de la Croix-Rousse', city: 'Lyon', zipCode: '69004', rent: 1100, charges: 120, description: 'Grand T3, vue dégagée, cave et parking', mortgageAmount: 780, insuranceAmount: 22, taxAmount: 1800, defaultDeposit: 2200 } }),
    prisma.apartment.create({ data: { id: uuid(), name: 'T1 Vieux-Lyon', address: '3 Rue Saint-Jean', city: 'Lyon', zipCode: '69005', rent: 680, charges: 60, description: 'Charme Renaissance, pierres apparentes', mortgageAmount: 0, insuranceAmount: 14, taxAmount: 950, defaultDeposit: 680 } }),
    prisma.apartment.create({ data: { id: uuid(), name: 'T2 Part-Dieu', address: '42 Rue de la Part-Dieu', city: 'Lyon', zipCode: '69003', rent: 920, charges: 90, description: 'Proche gare, 4e étage avec ascenseur', mortgageAmount: 650, insuranceAmount: 20, taxAmount: 1350, defaultDeposit: 920 } }),
    prisma.apartment.create({ data: { id: uuid(), name: 'Loft Confluence', address: '8 Rue de la Confluence', city: 'Lyon', zipCode: '69002', rent: 1350, charges: 150, description: 'Loft 65m², double hauteur, terrasse', mortgageAmount: 980, insuranceAmount: 28, taxAmount: 2100, defaultDeposit: 2700 } }),
    prisma.apartment.create({ data: { id: uuid(), name: 'Studio Monplaisir', address: '19 Avenue Berthelot', city: 'Lyon', zipCode: '69008', rent: 510, charges: 45, description: 'Studio 22m², quartier calme', mortgageAmount: 0, insuranceAmount: 10, taxAmount: 650, defaultDeposit: 510 } }),
    prisma.apartment.create({ data: { id: uuid(), name: 'T2 Villeurbanne', address: '33 Cours Émile Zola', city: 'Villeurbanne', zipCode: '69100', rent: 760, charges: 70, description: 'T2 rénové, cuisine équipée', mortgageAmount: 510, insuranceAmount: 16, taxAmount: 1050, defaultDeposit: 760 } }),
    prisma.apartment.create({ data: { id: uuid(), name: 'T3 Bron', address: '11 Rue Marcel Cachin', city: 'Bron', zipCode: '69500', rent: 980, charges: 100, description: 'Maison de ville 3 pièces, jardin', mortgageAmount: 720, insuranceAmount: 24, taxAmount: 1600, defaultDeposit: 1960 } }),
    prisma.apartment.create({ data: { id: uuid(), name: 'T1bis Tassin', address: '6 Avenue Victor Hugo', city: 'Tassin-la-Demi-Lune', zipCode: '69160', rent: 720, charges: 65, description: 'T1bis calme, balcon, parking', mortgageAmount: 490, insuranceAmount: 15, taxAmount: 980, defaultDeposit: 720 } }),
  ]);

  // ── Baux ────────────────────────────────────────────────────────────────────
  console.log('Création des baux...');
  const leaseData = [
    { apt: 0, tenant: 0, start: d(2022, 9, 1),  rent: 850,  charges: 80,  deposit: 850,   depositStatus: 'RECEIVED',  lastReview: d(2023, 9, 1) },
    { apt: 1, tenant: 1, start: d(2023, 3, 1),  rent: 580,  charges: 50,  deposit: 580,   depositStatus: 'RECEIVED',  lastReview: null },
    { apt: 2, tenant: 2, start: d(2021, 11, 1), rent: 1100, charges: 120, deposit: 2200,  depositStatus: 'RECEIVED',  lastReview: d(2024, 11, 1) },
    { apt: 3, tenant: 3, start: d(2023, 7, 1),  rent: 680,  charges: 60,  deposit: 680,   depositStatus: 'RECEIVED',  lastReview: null },
    { apt: 4, tenant: 4, start: d(2024, 1, 1),  rent: 920,  charges: 90,  deposit: 920,   depositStatus: 'RECEIVED',  lastReview: null },
    { apt: 5, tenant: 5, start: d(2024, 6, 1),  rent: 1350, charges: 150, deposit: 2700,  depositStatus: 'PARTIAL_RECEIVED', depositPaidAmount: 1350, lastReview: null },
    { apt: 6, tenant: 6, start: d(2023, 9, 1),  rent: 510,  charges: 45,  deposit: 510,   depositStatus: 'RECEIVED',  lastReview: null },
    { apt: 7, tenant: 7, start: d(2022, 4, 1),  rent: 760,  charges: 70,  deposit: 760,   depositStatus: 'RECEIVED',  lastReview: d(2024, 4, 1) },
    { apt: 8, tenant: 8, start: d(2024, 3, 1),  rent: 980,  charges: 100, deposit: 1960,  depositStatus: 'RECEIVED',  lastReview: null },
    { apt: 9, tenant: 9, start: d(2025, 1, 1),  rent: 720,  charges: 65,  deposit: 720,   depositStatus: 'PENDING',   lastReview: null },
  ];

  const leases = [];
  for (const ld of leaseData) {
    const lease = await prisma.lease.create({
      data: {
        id: uuid(),
        apartmentId: apartments[ld.apt].id,
        tenantId: tenants[ld.tenant].id,
        startDate: ld.start,
        rentAmount: ld.rent,
        chargesAmount: ld.charges,
        depositAmount: ld.deposit,
        depositPaidAmount: ld.depositPaidAmount ?? ld.deposit,
        depositStatus: ld.depositStatus,
        isActive: true,
        lastRentReviewDate: ld.lastReview,
      }
    });
    leases.push(lease);
  }

  // ── Paiements de loyer ───────────────────────────────────────────────────────
  console.log('Création des paiements de loyer...');
  // Pour chaque bail, on génère des paiements depuis le début jusqu'à avril 2026
  const today = new Date(2026, 3, 1); // avril 2026

  for (let i = 0; i < leases.length; i++) {
    const lease = leases[i];
    const ld = leaseData[i];
    const total = ld.rent + ld.charges;

    let cursor = new Date(ld.start.getFullYear(), ld.start.getMonth(), 1);

    while (cursor <= today) {
      const period = new Date(cursor);
      const monthsAgo = (today.getFullYear() - cursor.getFullYear()) * 12 + (today.getMonth() - cursor.getMonth());

      let status, paidAt, paidAmount;

      if (monthsAgo >= 2) {
        // Passé : la plupart payés, quelques retards et partiels selon le locataire
        if (i === 3 && monthsAgo === 3) {
          // Amira : un mois en retard récent
          status = 'LATE'; paidAt = null; paidAmount = null;
        } else if (i === 6 && monthsAgo === 5) {
          // Maxime : un mois partiel
          status = 'PARTIAL'; paidAt = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 18);
          paidAmount = Math.round(total * 0.6);
        } else if (i === 9 && monthsAgo <= 4) {
          // Chloé (nouveau bail jan 2025) : 2 mois late
          status = monthsAgo === 4 ? 'LATE' : 'PAID';
          paidAt = status === 'PAID' ? new Date(cursor.getFullYear(), cursor.getMonth(), ld.depositStatus === 'PENDING' ? 12 : 8) : null;
          paidAmount = null;
        } else {
          status = 'PAID';
          // Variété dans les dates de paiement
          const dayPaid = [3, 5, 7, 2, 8, 4, 6, 5, 3, 10][i];
          paidAt = new Date(cursor.getFullYear(), cursor.getMonth(), dayPaid);
          paidAmount = null;
        }
      } else if (monthsAgo === 1) {
        // Mois dernier : mélange
        const pendingTenants = [2, 5, 8];
        if (pendingTenants.includes(i)) {
          status = 'PENDING'; paidAt = null; paidAmount = null;
        } else if (i === 7) {
          status = 'PARTIAL'; paidAt = null; paidAmount = Math.round(total * 0.5);
        } else {
          status = 'PAID';
          paidAt = new Date(cursor.getFullYear(), cursor.getMonth(), [5,1,8,3,7,2,6,9,4,5][i]);
          paidAmount = null;
        }
      } else {
        // Mois courant
        const paidCurrentMonth = [0, 1, 4, 6];
        if (paidCurrentMonth.includes(i)) {
          status = 'PAID';
          paidAt = new Date(cursor.getFullYear(), cursor.getMonth(), [5,1,3,2][paidCurrentMonth.indexOf(i)]);
          paidAmount = null;
        } else {
          status = 'PENDING'; paidAt = null; paidAmount = null;
        }
      }

      await prisma.rentPayment.create({
        data: {
          id: uuid(),
          leaseId: lease.id,
          period,
          amount: total,
          paidAmount,
          status,
          paidAt,
        }
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  // ── Charges / Dépenses ───────────────────────────────────────────────────────
  console.log('Création des charges...');
  const expenseTemplates = [
    { cat: 'INSURANCE',    desc: 'Assurance propriétaire non-occupant',   amt: [180,120,220,140,180,280,110,160,200,150], recurring: true },
    { cat: 'TAX',         desc: 'Taxe foncière',                          amt: [1200,780,1800,950,1350,2100,650,1050,1600,980], recurring: true },
    { cat: 'MAINTENANCE', desc: 'Remplacement chauffe-eau',               amt: [380,0,0,0,320,0,0,0,420,0], recurring: false },
    { cat: 'MAINTENANCE', desc: 'Réparation fuite robinet',               amt: [0,85,0,0,0,0,65,0,0,120], recurring: false },
    { cat: 'MANAGEMENT',  desc: 'Honoraires gestion locative (1 mois)',   amt: [85,58,110,68,92,135,51,76,98,72], recurring: false },
    { cat: 'MAINTENANCE', desc: 'Peinture entrée / rafraîchissement',     amt: [0,0,650,0,0,0,0,480,0,0], recurring: false },
    { cat: 'OTHER',       desc: 'Frais de copropriété Q1',               amt: [240,0,310,0,260,380,0,190,280,0], recurring: false },
    { cat: 'MAINTENANCE', desc: 'Remplacement serrure',                   amt: [0,0,0,140,0,0,0,0,0,95], recurring: false },
  ];

  const expenseDates = [
    d(2025, 1, 15), d(2024, 10, 1), d(2024, 7, 10),
    d(2024, 4, 3),  d(2025, 3, 20), d(2024, 12, 5),
    d(2025, 4, 1),  d(2024, 9, 18),
  ];

  for (let aptIdx = 0; aptIdx < apartments.length; aptIdx++) {
    for (let eIdx = 0; eIdx < expenseTemplates.length; eIdx++) {
      const tmpl = expenseTemplates[eIdx];
      const amt = tmpl.amt[aptIdx];
      if (amt === 0) continue;
      await prisma.expense.create({
        data: {
          id: uuid(),
          apartmentId: apartments[aptIdx].id,
          category: tmpl.cat,
          description: tmpl.desc,
          amount: amt,
          date: expenseDates[eIdx],
          recurring: tmpl.recurring,
        }
      });
    }
  }

  // ── États des lieux ──────────────────────────────────────────────────────────
  console.log('Création des états des lieux...');
  for (let i = 0; i < leases.length; i++) {
    await prisma.inspection.create({
      data: {
        id: uuid(),
        leaseId: leases[i].id,
        type: 'ENTRY',
        date: leaseData[i].start,
        notes: 'État des lieux d\'entrée — bon état général.',
      }
    });
  }

  console.log('\n✅ Base de données peuplée avec succès !');
  console.log(`   ${tenants.length} locataires`);
  console.log(`   ${apartments.length} appartements`);
  console.log(`   ${leases.length} baux actifs`);
  console.log('   Paiements de loyer générés avec statuts variés');
  console.log('   Charges et dépenses créées');
  console.log('   États des lieux d\'entrée créés');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
