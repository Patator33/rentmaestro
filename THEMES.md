# Ajouter un thème dans RentMaestro

Ce guide explique comment créer un nouveau thème à partir d'un design haute fidélité (Claude Design, Figma, ou tout export HTML/CSS).

---

## Architecture du système de thèmes

```
src/themes/
  index.ts          ← registre des thèmes + type ThemeId
  original.css      ← palette bleue (défaut)
  dark-colored.css  ← palette lime/cyan
  mon-theme.css     ← ton futur thème ici
```

Le sélecteur `[data-theme="mon-theme"]` est appliqué sur la balise `<html>` côté serveur (cookie SSR), donc **aucun flash de couleurs au chargement**.

---

## Étape 1 — Extraire la palette depuis le design

### Si tu as un export HTML Claude Design

Ouvre le fichier HTML dans le navigateur → Inspecteur → recherche les variables CSS dans `:root` ou `body`. Copie les valeurs qui correspondent à :

| Rôle | Variable RentMaestro | Ce que tu cherches dans le design |
|------|---------------------|-----------------------------------|
| Couleur principale (boutons, liens actifs) | `--primary-color` | primary / brand / action |
| Couleur principale au survol | `--primary-hover` | primary-dark / hover |
| Couleur d'accentuation (badges, dots) | `--accent-color` | accent / highlight |
| Fond de page | `--background` | background / bg / canvas |
| Fond des cartes/surfaces | `--surface` | surface / card / panel |
| Fond au survol d'une surface | `--surface-hover` | surface-hover / hovered |
| Bordures | `--border-color` | border / divider / stroke |
| Texte principal | `--text-main` | foreground / text-primary |
| Texte secondaire | `--text-muted` | text-secondary / muted |
| Texte placeholder | `--text-faint` | text-tertiary / placeholder |

### Si tu as un design Figma

Panneau Figma → onglet **Design tokens** ou **Variables** → exporte les couleurs en JSON ou note-les.

### Valeurs calculées à partir de la palette

Une fois que tu as `--primary-color`, dérive les valeurs suivantes (remplace `R G B` par les composantes RGB de ta couleur primaire) :

```css
--primary-glow: 0 4px 16px rgba(R, G, B, .20);
--focus-ring:   0 0 0 2px rgba(R, G, B, .12);
--shadow-glow:  0 0 20px rgba(R, G, B, .15);
```

Et pour les pills de statut (adapte selon la palette) :

```css
/* Succès / payé */
--pill-ok-bg:     rgba(163, 230, 53, .10);
--pill-ok-border: rgba(163, 230, 53, .25);
--pill-ok-color:  #a3e635;

/* Info / en cours */
--pill-info-bg:     rgba(103, 232, 249, .10);
--pill-info-border: rgba(103, 232, 249, .25);
--pill-info-color:  #67e8f9;

/* Danger / retard */
--pill-danger-bg:     rgba(248, 113, 113, .10);
--pill-danger-border: rgba(248, 113, 113, .25);
--pill-danger-color:  #f87171;

/* Avertissement / partiel */
--pill-warn-bg:     rgba(251, 191, 36, .10);
--pill-warn-border: rgba(251, 191, 36, .25);
--pill-warn-color:  #fbbf24;
```

---

## Étape 2 — Créer le fichier CSS du thème

Crée `src/themes/mon-theme.css` et copie ce squelette :

```css
[data-theme="mon-theme"] {
  /* ── Couleurs principales ─────────────────── */
  --primary-color:  #XXXXXX;
  --primary-hover:  #XXXXXX;
  --accent-color:   #XXXXXX;

  /* ── Fond & surfaces ─────────────────────── */
  --background:     #XXXXXX;
  --surface:        #XXXXXX;
  --surface-hover:  #XXXXXX;

  /* ── Bordures ────────────────────────────── */
  --border-color:   #XXXXXX;

  /* ── Texte ───────────────────────────────── */
  --text-main:      #XXXXXX;
  --text-muted:     #XXXXXX;
  --text-faint:     #XXXXXX;

  /* ── Effets (calculés depuis primary) ───── */
  --primary-glow:  0 4px 16px rgba(R, G, B, .20);
  --shadow-glow:   0 0 20px rgba(R, G, B, .15);
  --focus-ring:    0 0 0 2px rgba(R, G, B, .12);

  /* ── Boutons ─────────────────────────────── */
  /* Si primary est sombre → btn-text blanc. Si primary est clair (lime, jaune) → btn-text noir */
  --btn-text:       #0e0f12;

  /* ── Avatar sidebar ──────────────────────── */
  --avatar-gradient: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  --avatar-text:     var(--btn-text);

  /* ── Pills de statut ─────────────────────── */
  --pill-ok-bg:         rgba(R1, G1, B1, .10);
  --pill-ok-border:     rgba(R1, G1, B1, .25);
  --pill-ok-color:      #XXXXXX;

  --pill-info-bg:       rgba(R2, G2, B2, .10);
  --pill-info-border:   rgba(R2, G2, B2, .25);
  --pill-info-color:    #XXXXXX;

  --pill-danger-bg:     rgba(248, 113, 113, .10);
  --pill-danger-border: rgba(248, 113, 113, .25);
  --pill-danger-color:  #f87171;

  --pill-warn-bg:       rgba(251, 191, 36, .10);
  --pill-warn-border:   rgba(251, 191, 36, .25);
  --pill-warn-color:    #fbbf24;
}
```

> **Conseil** : danger et warn restent généralement fixes (rouge/orange) car ce sont des signaux sémantiques universels.

---

## Étape 3 — Enregistrer le thème dans index.ts

Ouvre `src/themes/index.ts` et ajoute une entrée dans le tableau `THEMES` :

```ts
export const THEMES = [
  {
    id: 'original',
    label: 'Original',
    description: 'Palette bleue — thème par défaut',
    primary: '#2b8cee',
    accent:  '#e879a8',
    bg:      '#0a0e1a',
    surface: 'rgba(255,255,255,0.04)',
  },
  {
    id: 'dark-colored',
    label: 'Foncé Coloré',
    description: 'Palette lime & cyan — design Claude',
    primary: '#a3e635',
    accent:  '#67e8f9',
    bg:      '#0e0f12',
    surface: '#16181d',
  },
  // ↓ Ajoute ton thème ici ↓
  {
    id: 'mon-theme',
    label: 'Mon Thème',
    description: 'Courte description visible dans les réglages',
    primary: '#XXXXXX',   // utilisé pour le swatch dans les paramètres
    accent:  '#XXXXXX',
    bg:      '#XXXXXX',
    surface: '#XXXXXX',
  },
] as const;
```

Le type `ThemeId` est inféré automatiquement — ton thème est déjà typé.

---

## Étape 4 — Importer le fichier CSS dans globals.css

Ouvre `src/app/globals.css` et ajoute l'import en haut, avec les autres :

```css
@import '../themes/original.css';
@import '../themes/dark-colored.css';
@import '../themes/mon-theme.css';   /* ← ajoute cette ligne */
```

---

## Étape 5 — Tester

1. Lance le serveur : `npm run dev`
2. Va dans **Paramètres → Apparence**
3. Ton thème apparaît dans la liste avec un aperçu (swatch)
4. Clique dessus → le changement est instantané, sans rechargement de page
5. Recharge la page pour vérifier qu'il n'y a pas de flash (cookie SSR)

---

## Checklist de validation visuelle

Parcours ces pages pour vérifier que tout est cohérent :

- [ ] Dashboard — cartes de stats, badges de statut
- [ ] Liste des biens — cards, pills LOUÉ/VACANT
- [ ] Liste des locataires — avatars, tableau
- [ ] Paiements — pills PAYÉ/EN ATTENTE/RETARD/PARTIEL
- [ ] Fiche bail — alerte rouge (si pas de doc garant), section garant
- [ ] Paramètres — sélecteur de thème (actif = bordure primary)
- [ ] Formulaire — champs focus (anneau de focus)

---

## Variables structurelles (ne pas toucher dans les thèmes)

Ces variables restent dans `:root` de `globals.css` et ne font pas partie des thèmes :

```css
--sidebar-width, --radius-sm, --radius-md, --radius-lg, --radius-xl,
--font-mono, --font-sans, --transition-base, --transition-fast
```

---

## Exemple complet : thème "Violet Nuit"

```css
/* src/themes/violet-night.css */
[data-theme="violet-night"] {
  --primary-color:  #a78bfa;
  --primary-hover:  #8b5cf6;
  --accent-color:   #f472b6;

  --background:     #0d0d14;
  --surface:        #14141f;
  --surface-hover:  #1c1c2e;
  --border-color:   #2a2a3d;

  --text-main:      #e2e8f0;
  --text-muted:     #94a3b8;
  --text-faint:     #475569;

  --primary-glow:  0 4px 16px rgba(167, 139, 250, .20);
  --shadow-glow:   0 0 20px rgba(167, 139, 250, .15);
  --focus-ring:    0 0 0 2px rgba(167, 139, 250, .18);

  --btn-text:      #0d0d14;
  --avatar-gradient: linear-gradient(135deg, #a78bfa, #f472b6);
  --avatar-text:   #ffffff;

  --pill-ok-bg:         rgba(167, 139, 250, .10);
  --pill-ok-border:     rgba(167, 139, 250, .25);
  --pill-ok-color:      #a78bfa;

  --pill-info-bg:       rgba(244, 114, 182, .10);
  --pill-info-border:   rgba(244, 114, 182, .25);
  --pill-info-color:    #f472b6;

  --pill-danger-bg:     rgba(248, 113, 113, .10);
  --pill-danger-border: rgba(248, 113, 113, .25);
  --pill-danger-color:  #f87171;

  --pill-warn-bg:       rgba(251, 191, 36, .10);
  --pill-warn-border:   rgba(251, 191, 36, .25);
  --pill-warn-color:    #fbbf24;
}
```

Pour `index.ts` :
```ts
{
  id: 'violet-night',
  label: 'Violet Nuit',
  description: 'Palette violet & rose',
  primary: '#a78bfa',
  accent:  '#f472b6',
  bg:      '#0d0d14',
  surface: '#14141f',
},
```

Résultat en 4 fichiers touchés : le CSS du thème (créé), `globals.css` (+1 ligne), `index.ts` (+5 lignes).
