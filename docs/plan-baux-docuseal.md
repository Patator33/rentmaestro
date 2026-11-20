# Plan : génération et signature des baux via DocuSeal

Statut : **plan à valider, rien n'est implémenté.**
Périmètre : nouveaux baux uniquement (pas de renouvellement, avenant, état des lieux, mandat SEPA).

## 1. Décisions déjà prises

| Sujet | Décision |
|---|---|
| Modèles | 3 modèles de bail (nu, meublé, colocation) + 1 modèle « acte de cautionnement ». Un modèle par **type de bail**, pas par appartement |
| Création des modèles | À la main dans DocuSeal (champs placés dans l'éditeur). Les ids de templates se règlent dans les paramètres |
| Type de bail | Champ NU / MEUBLÉ / COLOCATION sur le bail, avec valeur par défaut sur l'appartement |
| Colocation | Un bail individuel par chambre ; la chambre est un `Apartment` rattaché à un `Building` |
| Signataires | Tous signent, sans ordre : bailleur, locataire, colocataire s'il existe, garant privé s'il existe. Rien pour Visale ou sans garant |
| Acte de cautionnement | Généré par RentMaestro, 2e demande de signature, signé par la seule caution. Texte et plafond (12 × loyer HC) calculés |
| Envoi | Bouton sur le bail (web + mobile). Le bail passe en « En attente de signature ». Pas de blocage de la génération des loyers |
| Invitation | Mail DocuSeal **et** mail RentMaestro avec le lien de signature |
| Rappels | Au bout de 3 jours (réglable dans les paramètres), par le scheduler interne |
| Renvoi | Régénérer annule l'ancienne demande |
| Retour | Webhook DocuSeal vers RentMaestro, sans n8n. PDF signé dans la GED du bail, notification Telegram |
| Nom du PDF signé | `bail signé Prénom Nom et Prénom Nom Appt Berson 3` (pas de civilité) |
| Copie au locataire | Déjà faite par DocuSeal |
| Statut « Signé » | Informatif seulement |
| Surface, pièces, régime, période de construction, type d'habitat | Pris sur `Building` quand l'appartement en a un, sinon sur l'appartement |
| Zone tendue | Réponses sur la fiche appartement, avec exception possible sur le bail |
| Bailleur | `Company` reçoit un « nom sur le bail » et un email de signataire |

## 2. Modèle de données (migrations Prisma)

Toutes les colonnes sont nullables ou ont une valeur par défaut : aucune rupture pour l'existant.

**Lease**
- `leaseType` : NU | MEUBLE | COLOCATION (défaut repris de l'appartement)
- `chargesMode` : PROVISION | FORFAIT (défaut PROVISION)
- `durationMonths` : défaut 36 (nu) ou 12 (meublé, colocation) ; 9 possible pour un étudiant. `endDate` est calculée si vide : début + durée − 1 jour
- `insurerName` (assureur multirisque, optionnel)
- `rentRulesOverride` : JSON nullable qui remplace les réponses « zone tendue » de l'appartement pour ce bail
- Garant : `guarantorBirthDate`, `guarantorBirthPlace`, `guarantorAddress`, `guarantorNationality` (défaut « française »)
- `signatureStatus` : NONE | PENDING | SIGNED | CANCELED | EXPIRED (cache de la table ci-dessous)

**SignatureRequest** (nouvelle table, une ligne par demande DocuSeal)
`id`, `leaseId`, `kind` (BAIL | CAUTION), `docusealSubmissionId`, `status`, `sentAt`, `completedAt`, `lastReminderAt`, `reminderCount`, `signedDocumentId` (lien vers le `LeaseDocument` créé), `createdAt`.
Elle garde l'historique des renvois ; l'ancienne ligne passe en CANCELED.

**Tenant**
- `birthDate`, `birthPlace`, `address`
- Colocataire : `coTenantBirthDate`, `coTenantBirthPlace`, `coTenantAddress`

**Apartment**
- `rooms` (nombre de pièces), `floor`, `doorCode`, `cellarNumber`, `hasParking`
- `housingType` (COLLECTIVE | INDIVIDUAL), `legalRegime` (COPRO | MONO), `constructionYear`
- `heatingMode` et `hotWaterMode` (INDIVIDUAL | COLLECTIVE)
- `commonEquipments` : liste de clés (parking, ascenseur, antenne TV, vide-ordures, interphone, espaces verts, gardiennage, chauffage collectif, eau chaude collective)
- Zone tendue : `rentCapDecree`, `rentComplement`, `rentReferenceMajored`, `rentReassessed` (booléens), `referenceRentPerM2`, `referenceRentMajoredPerM2`
- Textes libres : `descPrivate`, `descCommon`, `descEquipment`, `chargesDetail`, `ictEquipment` (internet/TV)
- `defaultLeaseType`

**Building** : `surface`, `rooms`, `housingType`, `legalRegime`, `constructionYear`. Règle de résolution : si l'appartement a un immeuble, les valeurs de l'immeuble priment pour ces champs ; sinon celles de l'appartement.

**Company** : `leaseDisplayName` (ex. « M. et Mme RIGAUD » ou « Rigaudimmo&co »), `signerEmail`. SIRET et adresse existent déjà.

**Settings** (table `Setting`, comme la sauvegarde) :
`docuseal_url`, `docuseal_api_key`, `docuseal_webhook_secret`, `docuseal_tpl_nu`, `docuseal_tpl_meuble`, `docuseal_tpl_coloc`, `docuseal_tpl_caution`, `signature_reminder_days` (3), `signature_reminder_max` (3).

## 3. Catalogue de champs DocuSeal

Les champs posés dans DocuSeal portent ces noms. RentMaestro ne remplit que ceux qui existent dans le template lu via l'API.

**Parties** : `bailleur_nom`, `bailleur_adresse`, `bailleur_email`, `bailleur_siret`, `locataire_nom`, `locataire_naissance`, `locataire_adresse`, `locataire_email`, `colocataire_*` (mêmes champs), `garant_*` (nom, naissance, adresse, tel, nationalité, email).

**Logement** : `logement_adresse`, `logement_pieces`, `logement_surface`, `logement_etage`, `logement_code_porte`, `logement_cave`, `logement_parking`, `logement_dpe`, `logement_annee_construction`, `logement_equipement_tic`, `logement_description_privatif`, `logement_description_commun`, `logement_description_equipements`.

**Cases à cocher** : `habitat_collectif|individuel`, `regime_copro|mono`, `periode_avant_1949|1949_1974|1975_1989|1989_2005|apres_2005`, `chauffage_individuel|collectif`, `ecs_individuelle|collective`, `eq_parking|ascenseur|antenne_tv|vide_ordures|interphone|espaces_verts|gardiennage|chauffage_collectif|eau_chaude_collective`, `charges_provision|forfait`, `zt_decret_oui|non`, `zt_complement_oui|non`, `zt_majore_oui|non`, `zt_reevalue_oui|non`.

**Financier et durée** : `loyer_hc`, `charges`, `total_mensuel`, `depot_garantie`, `loyer_reference`, `loyer_reference_majore`, `dernier_loyer_precedent`, `date_dernier_loyer_precedent`, `charges_detail`, `duree`, `date_debut`, `date_fin`, `irl_trimestre`, `irl_valeur`, `date_revision`, `date_signature`.

**Acte de cautionnement** : `caution_nom`, `caution_naissance`, `caution_adresse`, `locataire_nom`, `bailleur_nom`, `bailleur_adresse`, `logement_adresse`, `loyer_chiffres`, `loyer_lettres`, `plafond_chiffres` (12 × loyer HC), `plafond_lettres`, `irl_trimestre`, `date_revision`, `duree_engagement` (« indéterminée »).

**Valeurs calculées** : `dernier_loyer_precedent` et sa date viennent du bail précédent du même appartement ; `loyer_lettres` et `plafond_lettres` viennent d'un utilitaire français nombre vers lettres ; les dates sont en JJ/MM/AAAA, sauf `date_signature` qui reste vide pour la signature.

**Rôles DocuSeal attendus** : `Bailleur`, `Locataire`, `Colocataire`, `Caution`. Les noms exacts des rôles restent à fixer lors de la création des templates.

## 4. Composants à écrire

1. **`src/lib/docuseal.ts`** : client de l'API DocuSeal (en-tête `X-Auth-Token`). Fonctions : lire un template et ses champs, créer une submission, lire une submission, annuler, relancer un signataire. Timeout et erreurs explicites.
2. **`src/lib/lease-document.ts`** : `buildLeaseDocumentData(leaseId)` qui renvoie `{ values, signers, missing, warnings }`. `missing` liste chaque donnée manquante avec un lien vers l'écran où la saisir (ex. « Date de naissance du locataire → fiche locataire »). Règles :
   - Garant privé : adresse, naissance et email obligatoires.
   - Colocataire : email obligatoire.
   - Logement : champs requis selon le type de bail.
3. **`src/lib/signature.ts`** : `sendLeaseForSignature`, `cancelSignature`, `handleSubmissionCompleted`, `runSignatureRemindersIfDue`.
4. **Webhook `POST /api/docuseal/webhook`**, ajouté aux chemins publics du middleware, protégé par un secret en en-tête (comparaison à temps constant). Le corps n'est jamais pris tel quel : on ne retient que l'id de submission, puis on relit la submission via l'API avec la clé. Les URL de documents ne sont téléchargées que si l'hôte correspond à `docuseal_url` (protection SSRF). L'opération est idempotente.
5. **Server actions et routes** : action web `sendLeaseForSignature` / `cancelLeaseSignature` ; routes mobile `/api/landlord/leases/[id]/signature` (POST envoyer, DELETE annuler, GET statut), protégées par le jeton mobile.
6. **Scheduler** : un appel à `runSignatureRemindersIfDue` dans le tick horaire de `instrumentation.ts`. Les demandes PENDING dont le dernier envoi ou rappel dépasse `signature_reminder_days` reçoivent une relance via l'API, avec `reminderCount` plafonné par `signature_reminder_max`.
7. **Notification** : nouvel événement `LEASE_SIGNED` via `notifyN8n` (Telegram), et `LEASE_SIGNATURE_REMINDER_MAX` si le plafond de rappels est atteint sans signature.
8. **Mail RentMaestro** : réutilise l'envoi d'emails existant, avec le lien de signature de chaque signataire.

## 5. Écrans

**Web**
- Fiche appartement : nouveaux champs logement, équipements communs, zone tendue, textes libres, type de bail par défaut.
- Fiche immeuble : surface, pièces, régime, type d'habitat, année de construction.
- Fiche locataire : adresse, naissance, et idem pour le colocataire.
- Création et édition de bail : type de bail, mode de charges, durée, assureur, informations du garant (naissance, adresse, nationalité), exceptions « zone tendue ».
- Fiche société : nom sur le bail, email du signataire.
- Paramètres : bloc DocuSeal (URL, clé, secret, 4 ids de templates, délai de rappel, nombre maximal de rappels) avec un bouton « Vérifier les modèles » qui liste les champs inconnus de RentMaestro et les champs du catalogue absents du template.
- Page du bail : panneau « Signature » avec le statut (PENDING, avec le nombre de signataires ayant signé), le bouton « Envoyer pour signature », le détail des données manquantes, « Annuler / Régénérer », et les liens vers les PDF signés.
- Liste des baux : badge « En attente de signature ».

**Mobile** : sélecteur de type de bail sur la fiche bail, badge de statut, bouton « Envoyer pour signature » avec la liste des manques. La saisie des nouvelles données se fait sur le web (v1).

## 6. Phases de livraison

Chaque phase = un commit sur `main`, poussé (CI → image Docker → Portainer).

**Phase 0 : test jetable (avant tout code)**. Sur ton DocuSeal Docker, avec un template copié et ton propre email, vérifier :
1. L'authentification par clé API et la lecture des champs d'un template.
2. La création d'une submission avec préremplissage des champs texte **et des cases à cocher**.
3. Une submission **sans** le rôle Caution ou Colocataire quand le template le prévoit : est-ce accepté ? Sinon, plan B : deux variantes de template par type, choisies automatiquement.
4. La configuration d'un webhook avec en-tête secret, et le contenu du payload.
5. Le téléchargement du PDF signé et du certificat via l'API (point d'attention : les téléchargements ont déjà cassé à cause du certificat de signature).
6. La disponibilité des rappels natifs et des champs conditionnels dans ta version.
Résultat : une note de quelques lignes qui fige les choix techniques.

**Phase 1 : données et formulaires.** Schéma, migrations, formulaires web, réglages. Sans effet visible sur l'existant.

**Phase 2 : catalogue et contrôle.** `docuseal.ts`, `lease-document.ts`, bouton « Vérifier les modèles », liste des données manquantes. Tu peux déjà créer tes templates dans DocuSeal avec la liste de champs (section 3).

**Phase 3 : envoi.** Création des demandes (bail + acte), statut, panneau sur la page du bail, mails, badge.

**Phase 4 : retour.** Webhook, PDF signé dans la GED du bail sous le nom prévu (types `BAIL_SIGNE` / `ACTE_CAUTION_SIGNE`), statut « Signé », Telegram.

**Phase 5 : rappels et annulation.** Scheduler, relances, annulation et régénération.

**Phase 6 : mobile.**

**Phase 7 : recette réelle.** Un vrai bail de bout en bout avec toi (sur un bail test, puis le prochain bail réel), puis nettoyage des données de test.

## 7. Ce que tu dois faire de ton côté

- Créer les 4 templates dans DocuSeal : poser les champs avec les noms du catalogue, assigner les rôles, cocher « champ obligatoire » là où il faut.
- Renseigner dans les paramètres l'URL, la clé API, le secret du webhook et les 4 ids de templates.
- Déclarer dans DocuSeal le webhook vers `https://<ton-domaine>/api/docuseal/webhook` avec l'en-tête secret.
- Renseigner les nouvelles données sur les appartements, immeubles, sociétés et locataires existants au fur et à mesure des besoins.

## 8. Risques et points à surveiller

- **Rôles optionnels** : à trancher en phase 0 (plan B prévu).
- **Cases à cocher** : le préremplissage des cases doit marcher via l'API ; à valider en phase 0.
- **Téléchargement du PDF signé** : à valider en phase 0 sur le Docker (incident passé sur le NAS lié au certificat).
- **Webhook et réseau** : DocuSeal doit atteindre RentMaestro, et RentMaestro doit atteindre DocuSeal depuis son conteneur.
- **Secrets en base** : la clé API et le secret du webhook sont stockés dans la table `Setting`, comme le mot de passe de la sauvegarde SMB. Le champ de saisie sera masqué.
- **Données légales** : le contenu juridique des modèles reste ta responsabilité ; RentMaestro ne fait que préremplir les champs.
- **Charge de saisie** : de nombreuses fiches existantes n'ont pas les nouvelles données ; le contrôle des manques guide la saisie bail par bail.

## 9. Résultats de la phase 0 (20/11/2026)

Test réalisé sur `sign.nico33.net` avec l'API REST (en-tête `X-Auth-Token`) et le template 1 « Bail location nu ». Aucun e-mail envoyé. Les 2 submissions de test (119, 120) sont archivées.

| Point | Résultat |
|---|---|
| Rôles optionnels (Colocataire, Caution absents) | **OK.** La submission est acceptée avec 2 signataires sur 4 rôles et passe à « completed ». Pas besoin de champs conditionnels ni de templates en double |
| Préremplissage texte | **OK**, y compris pour deux champs de même nom (les deux sont remplis) |
| Préremplissage cases à cocher | **OK** (`true` / `false`). Une case non envoyée garde son état par défaut du template : Chauffage collectif et Antenne TV sont apparues cochées sans qu'on les envoie. **Il faut donc envoyer toutes les cases, explicitement, à chaque fois** |
| Champ inconnu | Erreur 422 `Unknown field: X`. Il ne faut envoyer que les champs présents dans le template |
| Champ envoyé au mauvais rôle | Erreur 422 `Unknown field`. **Chaque valeur doit partir dans le signataire du rôle propriétaire du champ.** On lit `submitter_uuid` de chaque champ dans le template. Règle de templates retenue : tous les champs préremplis sur le rôle Bailleur |
| Envoi sans e-mail | `send_email: false` fonctionne ; la réponse donne un lien de signature par signataire (`embed_src`) |
| Lien de retour | `external_id` et `metadata` acceptés sur chaque signataire : on y met l'id du bail et le type (BAIL / CAUTION) |
| Annulation | `DELETE /api/submissions/{id}` archive la demande (`archived_at`) |
| Signature par API | `PUT /api/submitters/{id}` avec `completed: true` suffit à finir une demande de test |
| PDF signé | Téléchargeable **sans clé** via l'URL de `documents`. 427 Ko, signature numérique présente. Idem sur 2 anciens baux signés (116 et 113) : le problème de certificat du NAS n'existe pas sur le Docker |
| Rendu | Police très petite sur certains champs (ex. Loyer_HC) : à régler dans l'éditeur du template |

Non vérifié (à confirmer en phase 4 et 5, avec le vrai endpoint) :
- **Webhook :** contenu exact du payload et secret en en-tête. Le design reste sûr sans ça : le webhook sert seulement de déclencheur, RentMaestro relit ensuite la submission avec la clé API. Un appel falsifié ne peut rien faire d'autre qu'un contrôle.
- **Relance d'un signataire :** `PUT /api/submitters/{id}` avec `send_email: true`, non testé pour éviter d'envoyer un e-mail. À valider avec une vraie adresse.
- **Rappels natifs et champs conditionnels :** inutiles à cause des résultats ci-dessus, non testés.

Conséquences sur le plan : le client DocuSeal lit pour chaque champ son rôle et sa présence dans le template, envoie `true`/`false` pour chaque case, et construit les signataires uniquement pour les rôles utiles (Caution absent si Visale ou sans garant).

## 10. Hors périmètre (pour l'instant)

Renouvellement et avenant, états des lieux, mandat de prélèvement, mandataire, usage mixte (habitation + profession libérale), signature électronique qualifiée, import des baux déjà signés, envoi en lot.
