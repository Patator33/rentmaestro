# Champs DocuSeal à poser dans les templates

Fichier généré depuis `src/lib/lease-catalog.ts` (ne pas modifier à la main : relancer la génération après un changement du catalogue).

## Règles à respecter dans l'éditeur DocuSeal

1. **Nom du champ** : exactement celui de la première colonne (minuscules, underscores). Un nom inconnu de RentMaestro est traité comme un champ libre, rempli par le signataire.
2. **Un nom = un champ.** Évitez deux champs de même nom sur des rôles différents. Deux champs de même nom sur le même rôle sont remplis ensemble.
3. **Rôles** : `Bailleur` et `Locataire` obligatoires. `Colocataire` et `Caution` seulement s'ils signent (RentMaestro n'envoie que les rôles utiles : un rôle absent est accepté par DocuSeal).
4. **Placez tous les champs préremplis sur le rôle `Bailleur`**, toujours présent. DocuSeal refuse une valeur envoyée au mauvais rôle, et un champ posé sur un rôle absent resterait vide. Exceptions logiques : les champs `colocataire_*` peuvent être sur `Colocataire`, `garant_*` et `caution_*` sur `Caution`.
5. **Signatures, paraphes, dates de signature, « lu et approuvé »** : champs de type signature / date / texte libre assignés au rôle du signataire, avec un nom hors catalogue (ex. `locataire_signature`). Ils ne sont jamais préremplis.
6. **Cases à cocher** : RentMaestro envoie toujours coché ou non coché pour chaque case du catalogue présente dans le template. Une case absente du catalogue garde son état par défaut.
7. **Police** : réglez une taille lisible sur chaque champ texte (certains champs sortent minuscules par défaut).

## Valeurs

- Montants : `710 €`, `710,50 €`. Nombres sans unité pour la surface et les loyers de référence (écrivez « m² » ou « €/m² » dans le PDF).
- Dates : `30/08/2026` ; variantes `_long` : `30 août 2026`.
- Indice de référence : par défaut le dernier trimestre publié avant l'entrée dans les lieux (ex. entrée le 30/08/2026 → « 2ème trimestre 2026 »), sauf indice saisi sur le bail.
- `logement_cave` vaut « néant » et `logement_parking` « oui » ou « néant » si rien n'est saisi ; les loyers de référence valent « - » si non renseignés.
- Champs vides non envoyés : un champ dont la donnée est inconnue reste à remplir (ou vide) dans DocuSeal.

## Bail (nu, meublé, colocation)

| Nom du champ | Type | Contenu | Baux concernés |
|---|---|---|---|
| `bailleur_nom` | texte | Bailleur : nom sur le bail | tous |
| `bailleur_adresse` | texte | Bailleur : adresse | tous |
| `bailleur_email` | texte | Bailleur : email | tous |
| `bailleur_siret` | texte | Bailleur : SIRET | tous |
| `locataire_nom` | texte | Locataire : nom complet (Prénom NOM) | tous |
| `locataire_prenom` | texte | Locataire : prénom | tous |
| `locataire_nom_famille` | texte | Locataire : nom de famille | tous |
| `locataire_naissance` | texte | Locataire : date de naissance (JJ/MM/AAAA) | tous |
| `locataire_naissance_long` | texte | Locataire : date de naissance (30 août 1982) | tous |
| `locataire_lieu_naissance` | texte | Locataire : lieu de naissance | tous |
| `locataire_adresse` | texte | Locataire : adresse actuelle | tous |
| `locataire_email` | texte | Locataire : email | tous |
| `colocataire_nom` | texte | Colocataire : nom complet (Prénom NOM) | nu, meublé |
| `colocataire_prenom` | texte | Colocataire : prénom | nu, meublé |
| `colocataire_nom_famille` | texte | Colocataire : nom de famille | nu, meublé |
| `colocataire_naissance` | texte | Colocataire : date de naissance (JJ/MM/AAAA) | nu, meublé |
| `colocataire_naissance_long` | texte | Colocataire : date de naissance (30 août 1982) | nu, meublé |
| `colocataire_lieu_naissance` | texte | Colocataire : lieu de naissance | nu, meublé |
| `colocataire_adresse` | texte | Colocataire : adresse actuelle | nu, meublé |
| `colocataire_email` | texte | Colocataire : email | nu, meublé |
| `garant_nom` | texte | Garant : nom complet (Prénom NOM) | nu, meublé |
| `garant_prenom` | texte | Garant : prénom | nu, meublé |
| `garant_nom_famille` | texte | Garant : nom de famille | nu, meublé |
| `garant_naissance` | texte | Garant : date de naissance (JJ/MM/AAAA) | nu, meublé |
| `garant_naissance_long` | texte | Garant : date de naissance (30 août 1982) | nu, meublé |
| `garant_lieu_naissance` | texte | Garant : lieu de naissance | nu, meublé |
| `garant_adresse` | texte | Garant : adresse actuelle | nu, meublé |
| `garant_email` | texte | Garant : email | nu, meublé |
| `garant_telephone` | texte | Garant : téléphone | nu, meublé |
| `garant_nationalite` | texte | Garant : nationalité | nu, meublé |
| `logement_adresse` | texte | Logement : adresse complète | tous |
| `logement_adresse_rue` | texte | Logement : rue et complément | tous |
| `logement_code_postal` | texte | Logement : code postal | tous |
| `logement_ville` | texte | Logement : ville | tous |
| `logement_pieces` | texte | Logement : pièces principales | tous |
| `logement_surface` | texte | Logement : surface habitable (nombre, sans m²) | tous |
| `logement_etage` | texte | Logement : étage | tous |
| `logement_code_porte` | texte | Logement : code porte | tous |
| `logement_cave` | texte | Logement : n° de cave (« néant » si aucune) | tous |
| `logement_parking` | texte | Logement : parking (« oui » ou « néant ») | tous |
| `logement_dpe` | texte | Logement : niveau DPE | tous |
| `logement_annee_construction` | texte | Logement : année de construction | tous |
| `logement_equipement_tic` | texte | Logement : accès internet / TV | tous |
| `logement_description_privatif` | texte | Logement : parties privatives (texte libre) | colocation |
| `logement_description_commun` | texte | Logement : parties communes (texte libre) | colocation |
| `logement_description_equipements` | texte | Logement : éléments d'équipement (texte libre) | tous |
| `habitat_collectif` | case à cocher | Type d'habitat : immeuble collectif | tous |
| `habitat_individuel` | case à cocher | Type d'habitat : immeuble individuel | tous |
| `regime_copro` | case à cocher | Régime juridique : copropriété | tous |
| `regime_mono` | case à cocher | Régime juridique : monopropriété | tous |
| `periode_avant_1949` | case à cocher | Construction : avant 1949 | tous |
| `periode_1949_1974` | case à cocher | Construction : 1949 à 1974 | tous |
| `periode_1975_1989` | case à cocher | Construction : 1975 à 1989 | tous |
| `periode_1989_2005` | case à cocher | Construction : 1989 à 2005 | tous |
| `periode_apres_2005` | case à cocher | Construction : après 2005 | tous |
| `chauffage_individuel` | case à cocher | Chauffage individuel | tous |
| `chauffage_collectif` | case à cocher | Chauffage collectif | tous |
| `ecs_individuelle` | case à cocher | Eau chaude sanitaire individuelle | tous |
| `ecs_collective` | case à cocher | Eau chaude sanitaire collective | tous |
| `usage_habitation` | case à cocher | Usage : habitation principale | tous |
| `eq_parking` | case à cocher | Équipement commun : parking | nu, meublé |
| `eq_ascenseur` | case à cocher | Équipement commun : ascenseur | nu, meublé |
| `eq_gardiennage` | case à cocher | Équipement commun : gardiennage | nu, meublé |
| `eq_antenne_tv` | case à cocher | Équipement commun : antenne TV collective | nu, meublé |
| `eq_vide_ordures` | case à cocher | Équipement commun : vide-ordures | nu, meublé |
| `eq_interphone` | case à cocher | Équipement commun : interphone | nu, meublé |
| `eq_espaces_verts` | case à cocher | Équipement commun : espace(s) vert(s) | nu, meublé |
| `eq_chauffage_collectif` | case à cocher | Équipement commun : chauffage collectif | nu, meublé |
| `eq_eau_chaude_collective` | case à cocher | Équipement commun : eau chaude collective | nu, meublé |
| `zt_decret_oui` | case à cocher | Décret d'encadrement : Oui | tous |
| `zt_decret_non` | case à cocher | Décret d'encadrement : Non | tous |
| `zt_complement_oui` | case à cocher | Complément de loyer : Oui | tous |
| `zt_complement_non` | case à cocher | Complément de loyer : Non | tous |
| `zt_majore_oui` | case à cocher | Loyer de référence majoré : Oui | nu, meublé |
| `zt_majore_non` | case à cocher | Loyer de référence majoré : Non | nu, meublé |
| `zt_reevalue_oui` | case à cocher | Loyer réévalué : Oui | nu, meublé |
| `zt_reevalue_non` | case à cocher | Loyer réévalué : Non | nu, meublé |
| `loyer_reference` | texte | Loyer de référence (€/m²) | nu, meublé |
| `loyer_reference_majore` | texte | Loyer de référence majoré (€/m²) | nu, meublé |
| `dernier_loyer_precedent` | texte | Dernier loyer du précédent locataire | nu, meublé |
| `date_dernier_loyer_precedent` | texte | Date de versement de ce loyer | nu, meublé |
| `loyer_hc` | texte | Loyer hors charges (« 710 € ») | tous |
| `charges` | texte | Charges (provision ou forfait) | tous |
| `total_mensuel` | texte | Total mensuel charges comprises | tous |
| `depot_garantie` | texte | Dépôt de garantie | tous |
| `charges_detail` | texte | Détail des charges comprises | meublé, colocation |
| `charges_provision` | case à cocher | Charges : provision sur charges | tous |
| `charges_forfait` | case à cocher | Charges : forfait de charges | tous |
| `assureur` | texte | Assureur multirisque habitation | tous |
| `duree` | texte | Durée du bail (« 1 an », « 3 ans ») | tous |
| `date_debut` | texte | Date de prise d'effet (JJ/MM/AAAA) | tous |
| `date_debut_long` | texte | Date de prise d'effet (30 août 2026) | tous |
| `date_fin` | texte | Date de fin (JJ/MM/AAAA) | tous |
| `date_fin_long` | texte | Date de fin (29 août 2027) | tous |
| `irl_trimestre` | texte | Indice de référence : trimestre (« 2ème trimestre 2026 ») | tous |
| `irl_valeur` | texte | Indice de référence : valeur | tous |
| `date_revision` | texte | Date anniversaire de révision (« 30 août ») | tous |

## Acte de cautionnement

Un seul rôle : `Caution`. Les champs communs avec le bail (`bailleur_nom`, `locataire_nom`, …) y sont préremplis de la même façon.

| Nom du champ | Type | Contenu | Baux concernés |
|---|---|---|---|
| `bailleur_nom` | texte | Bailleur : nom sur le bail | tous |
| `bailleur_adresse` | texte | Bailleur : adresse | tous |
| `locataire_nom` | texte | Locataire : nom complet (Prénom NOM) | tous |
| `locataire_prenom` | texte | Locataire : prénom | tous |
| `locataire_nom_famille` | texte | Locataire : nom de famille | tous |
| `locataire_naissance` | texte | Locataire : date de naissance (JJ/MM/AAAA) | tous |
| `locataire_naissance_long` | texte | Locataire : date de naissance (30 août 1982) | tous |
| `locataire_lieu_naissance` | texte | Locataire : lieu de naissance | tous |
| `locataire_adresse` | texte | Locataire : adresse actuelle | tous |
| `locataire_email` | texte | Locataire : email | tous |
| `caution_nom` | texte | Caution (acte de cautionnement) : nom complet (Prénom NOM) | tous |
| `caution_prenom` | texte | Caution (acte de cautionnement) : prénom | tous |
| `caution_nom_famille` | texte | Caution (acte de cautionnement) : nom de famille | tous |
| `caution_naissance` | texte | Caution (acte de cautionnement) : date de naissance (JJ/MM/AAAA) | tous |
| `caution_naissance_long` | texte | Caution (acte de cautionnement) : date de naissance (30 août 1982) | tous |
| `caution_lieu_naissance` | texte | Caution (acte de cautionnement) : lieu de naissance | tous |
| `caution_adresse` | texte | Caution (acte de cautionnement) : adresse actuelle | tous |
| `caution_email` | texte | Caution (acte de cautionnement) : email | tous |
| `logement_adresse` | texte | Logement : adresse complète | tous |
| `loyer_hc` | texte | Loyer hors charges (« 710 € ») | tous |
| `irl_trimestre` | texte | Indice de référence : trimestre (« 2ème trimestre 2026 ») | tous |
| `date_revision` | texte | Date anniversaire de révision (« 30 août ») | tous |
| `loyer_chiffres` | texte | Loyer mensuel en chiffres | tous |
| `loyer_lettres` | texte | Loyer mensuel en lettres | tous |
| `plafond_chiffres` | texte | Plafond de l'engagement (12 × loyer) en chiffres | tous |
| `plafond_lettres` | texte | Plafond de l'engagement en lettres | tous |
| `duree_engagement` | texte | Durée de l'engagement (« indéterminée ») | tous |
