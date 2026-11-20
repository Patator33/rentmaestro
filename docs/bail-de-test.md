# Bail de test : recette de la signature électronique

Objectif : vérifier de bout en bout, sur ta production, l'envoi d'un bail en signature, le retour du PDF signé dans la GED et les notifications, **sans toucher à un vrai locataire**.

## Ce qui est déjà prêt dans DocuSeal

Template **n° 34 « TEST RentMaestro - bail nu »** : copie de ton template « Bail location nu » (n° 1, qui n'est pas modifié), dont les champs portent les noms du catalogue ([champs-docuseal.md](champs-docuseal.md)).

- Rôles : `Locataire`, `Colocataire`, `Bailleur`, `Caution`.
- 32 champs préremplis par RentMaestro : identité et adresse du locataire et du colocataire, loyer, charges, total, dépôt de garantie, loyer de référence, dernier loyer du précédent locataire, durée, 9 cases d'équipements communs, bloc garant.
- Tous les champs préremplis sont sur le rôle `Bailleur`. Les signatures restent sur le rôle de chaque signataire.
- Vérifié par une répétition complète en local (envoi, signature des 4 rôles, retour du PDF dans la GED, statut « Signé »).

**Limites de ce template de test**
- Il vient d'un ancien PDF Rentila qui contient déjà des valeurs écrites en dur d'un précédent bail : bailleur, dates de départ et de fin (2025 à 2028), indice IRL 2025, caution « 680 euros », type d'habitat, chauffage, période de construction. Elles ne suivent pas les données de RentMaestro.
- Il n'a pas de champ pour l'adresse du logement, la surface, les pièces, l'étage, les dates et l'indice du bail.
- **Pour un vrai bail, il faudra un PDF vierge** (Word → PDF, sans valeur écrite en dur) avec un champ pour chaque donnée variable, aux noms de [champs-docuseal.md](champs-docuseal.md).

## 1. Réglages (Paramètres → Signature des baux)

| Réglage | Valeur |
|---|---|
| URL de DocuSeal | `https://sign.nico33.net` |
| Clé API | la clé API de DocuSeal (Paramètres → API) |
| Template bail nu | `34` |
| Autres templates | vides pour ce test |
| Secret du webhook | « Générer », puis copier avant d'enregistrer |
| Rappel après / maximum | `3` jours / `3` rappels (ou 1 jour pour tester plus vite) |

Cliquer sur **Enregistrer**, puis **Tester la connexion** et **Vérifier les modèles** : le bail nu doit afficher « 32 champ(s) préremplis », sans rôle manquant.

## 2. Webhook dans DocuSeal

Paramètres → Webhooks : URL `https://<ton-domaine>/api/docuseal/webhook`, en-tête `x-docuseal-secret` portant le secret ci-dessus, événements `submission.completed`, `form.declined`, `submission.expired`, `submission.archived`. Sans webhook, le retour fonctionne quand même à l'ouverture de la page du bail.

## 3. Données de test à créer dans RentMaestro

Utilise **des adresses e-mail que tu contrôles** (une par rôle : un alias `+` fonctionne avec la plupart des messageries).

| Objet | À saisir |
|---|---|
| Société | « TEST », nom sur les baux « M. et Mme TEST », adresse, **email du signataire** = ton adresse |
| Appartement | « Appt Test », 12 rue des Tests 33000 Bordeaux, loyer 500 €, charges 20 €, type de bail par défaut **nu**, 2 pièces, 30 m², étage RDC, type d'habitat, régime, année de construction, chauffage et eau chaude (individuel), DPE |
| Locataire | prénom/nom fictifs, **email = alias 1**, date et lieu de naissance, adresse actuelle |
| Colocataire (facultatif) | prénom/nom fictifs, **email = alias 2**, naissance, adresse |
| Bail | début à la date de ton choix, loyer 500 €, charges 20 €, dépôt 500 €, **sans garant** pour une 1ʳᵉ passe (un garant exige aussi un template d'acte de cautionnement) |

## 4. Déroulé

1. Page du bail → **Contrôler les données** : la liste des manques doit se vider au fur et à mesure de ta saisie ; **Voir les valeurs préparées** montre ce qui partira dans DocuSeal.
2. **1ʳᵉ passe sans e-mail** : décocher « Envoyer les emails d'invitation », **Envoyer pour signature**, puis « Copier le lien » de chaque signataire et signer dans un navigateur.
3. Après la dernière signature : statut du bail « ✅ Signé », badge dans la liste des baux, deux documents ou un seul dans la GED du bail nommé « bail signé Prénom NOM (et Prénom NOM) Appt Test », notification Telegram « Bail signé » si l'événement est activé.
4. **2ᵉ passe avec e-mails** : supprimer les documents de la passe précédente si tu veux, puis **Régénérer** ou renvoyer, cette fois en laissant la case cochée : chaque signataire reçoit l'invitation de DocuSeal et celle de RentMaestro.
5. **Rappels** : laisser un signataire sans signer ; après le délai, il reçoit un rappel (le bailleur est prévenu par Telegram). Tester **Annuler la demande**.
6. Même scénario depuis l'appli mobile (après mise à jour de l'APK) : type de bail, envoi, suivi.

## 5. Nettoyage

- Supprimer le bail, le locataire, l'appartement et la société de test (la suppression du bail archive les demandes en cours dans DocuSeal).
- Les demandes terminées restent visibles dans DocuSeal : les archiver à la main si tu veux.
- Template n° 34 : à garder pour de nouveaux essais, ou archiver dans DocuSeal.
