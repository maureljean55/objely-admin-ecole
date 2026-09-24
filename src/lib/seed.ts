import type { CategoryId, Declaration, Kiosk, LogEntry, Restitution, State, StaffMember, StoredObject } from "./types";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Demo data only. Timestamps are relative to "now" so the dashboard always looks alive.
export function createSeed(now = Date.now()): State {
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const day = (d: number) => new Date(now - d * DAY).toISOString().slice(0, 10);

  const staff: StaffMember[] = [
    { id: "s1", name: "Camille Martin", email: "camille.martin@lycee-jean-moulin.fr", role: "admin", active: true, createdAt: ago(200 * DAY), lastSeenAt: ago(2 * MIN) },
    { id: "s2", name: "Yanis Benali", email: "yanis.benali@lycee-jean-moulin.fr", role: "vie_scolaire", active: true, createdAt: ago(120 * DAY), lastSeenAt: ago(3 * HOUR) },
    { id: "s3", name: "Sophie Lambert", email: "sophie.lambert@lycee-jean-moulin.fr", role: "vie_scolaire", active: true, createdAt: ago(90 * DAY), lastSeenAt: ago(1 * DAY) },
    { id: "s4", name: "Marc Rousseau", email: "marc.rousseau@lycee-jean-moulin.fr", role: "lecture", active: true, createdAt: ago(40 * DAY) },
    { id: "s5", name: "Inès Garnier", email: "ines.garnier@lycee-jean-moulin.fr", role: "vie_scolaire", active: false, createdAt: ago(150 * DAY), lastSeenAt: ago(60 * DAY) },
  ];

  const kiosks: Kiosk[] = [
    { id: "k1", name: "Borne d'entrée principale", location: "Hall, bâtiment A", version: "2.4", createdAt: ago(80 * DAY), lastSeenAt: ago(1 * MIN) },
    { id: "k2", name: "Borne du CDI", location: "CDI, 1er étage", version: "2.4", createdAt: ago(60 * DAY), lastSeenAt: ago(2 * MIN) },
    { id: "k3", name: "Borne du gymnase", location: "Entrée du gymnase", version: "2.3", createdAt: ago(30 * DAY), lastSeenAt: ago(2 * DAY) },
  ];

  const objects: StoredObject[] = [
    { id: "o1", ref: "OBJ-1048", name: "Écouteurs sans fil noirs", category: "autre", description: "Boîtier de charge noir, petit autocollant blanc au dos.", foundAt: "Cantine", foundOn: day(0), depositedAt: ago(2 * HOUR), storage: "Casier 2", status: "en_stock", photo: "/illustrations/splash/earbuds.png" },
    { id: "o2", ref: "OBJ-1047", name: "Portefeuille en cuir marron", category: "autre", description: "Cuir vieilli, plusieurs compartiments pour cartes.", foundAt: "Couloir bâtiment B", foundOn: day(0), depositedAt: ago(5 * HOUR), storage: "Casier 2", status: "en_stock", photo: "/illustrations/splash/wallet.png" },
    { id: "o3", ref: "OBJ-1046", name: "Téléphone gris métallisé", category: "telephone", description: "Écran fissuré en bas à gauche, pas de coque.", foundAt: "Gymnase", foundOn: day(1), depositedAt: ago(1 * DAY + 3 * HOUR), storage: "Coffre", status: "en_stock", photo: "/illustrations/splash/phone.png" },
    { id: "o4", ref: "OBJ-1045", name: "Trousseau de clés", category: "cles", description: "Trois clés et une télécommande de voiture, porte-clés rond.", foundAt: "Salle de cours", foundOn: day(1), depositedAt: ago(1 * DAY + 6 * HOUR), storage: "Casier 1", status: "en_stock", photo: "/illustrations/splash/keys.png" },
    { id: "o5", ref: "OBJ-1044", name: "Calculatrice graphique", category: "scolaire", description: "Coque turquoise, autocollant panda blanc au dos.", foundAt: "Salle B12", foundOn: day(2), depositedAt: ago(2 * DAY + 4 * HOUR), storage: "Casier 3", status: "en_stock" },
    { id: "o6", ref: "OBJ-1043", name: "Sweat gris à capuche", category: "vetement", description: "Taille M, étiquette arrachée, poche kangourou.", foundAt: "Cour", foundOn: day(3), depositedAt: ago(3 * DAY + 2 * HOUR), storage: "Étagère vêtements", status: "en_stock" },
    { id: "o7", ref: "OBJ-1042", name: "Sac à dos bleu marine", category: "sac", description: "Deux fermetures, badge rond jaune sur la sangle.", foundAt: "CDI", foundOn: day(3), depositedAt: ago(3 * DAY + 5 * HOUR), storage: "Étagère sacs", status: "en_stock" },
    { id: "o8", ref: "OBJ-1041", name: "Gourde métallique verte", category: "autre", description: "Bouchon noir, quelques rayures sur le côté.", foundAt: "Gymnase", foundOn: day(5), depositedAt: ago(5 * DAY + 1 * HOUR), storage: "Casier 3", status: "en_stock" },
    { id: "o9", ref: "OBJ-1040", name: "Badge de cantine", category: "cles", description: "Badge blanc sur cordon rouge.", foundAt: "Cantine", foundOn: day(5), depositedAt: ago(5 * DAY + 2 * HOUR), storage: "Casier 1", status: "en_stock" },
    { id: "o10", ref: "OBJ-1039", name: "Trousse rouge", category: "scolaire", description: "Zip noir, contient des stylos et un surligneur.", foundAt: "Salle de cours", foundOn: day(6), depositedAt: ago(6 * DAY), storage: "Casier 3", status: "en_stock" },
    { id: "o11", ref: "OBJ-1038", name: "Veste de sport noire", category: "vetement", description: "Trois bandes blanches sur les manches.", foundAt: "Gymnase", foundOn: day(9), depositedAt: ago(9 * DAY), storage: "Étagère vêtements", status: "en_stock" },
    { id: "o12", ref: "OBJ-1037", name: "Cahier de maths", category: "scolaire", description: "Couverture verte, prénom écrit au crayon à l'intérieur.", foundAt: "Couloir bâtiment B", foundOn: day(12), depositedAt: ago(12 * DAY), storage: "Casier 3", status: "en_stock" },
    { id: "o13", ref: "OBJ-1030", name: "Parapluie noir", category: "autre", description: "Manche en bois, un baleine tordue.", foundAt: "Hall", foundOn: day(34), depositedAt: ago(34 * DAY), storage: "Étagère sacs", status: "en_stock" },
    { id: "o14", ref: "OBJ-1021", name: "Écharpe bleue à carreaux", category: "vetement", description: "Laine, franges aux extrémités.", foundAt: "Cour", foundOn: day(64), depositedAt: ago(64 * DAY), storage: "Étagère vêtements", status: "en_stock" },
    { id: "o15", ref: "OBJ-1009", name: "Clé USB rouge 32 Go", category: "autre", description: "Capuchon perdu, étiquette « Histoire ».", foundAt: "Salle informatique", foundOn: day(75), depositedAt: ago(75 * DAY), storage: "Coffre", status: "a_donner" },
    { id: "o16", ref: "OBJ-1036", name: "Casque audio blanc", category: "autre", description: "Arceau réglable, coussinets noirs.", foundAt: "CDI", foundOn: day(8), depositedAt: ago(8 * DAY), storage: "Casier 2", status: "restitue", restitutionId: "r1" },
    { id: "o17", ref: "OBJ-1035", name: "Carte étudiante", category: "cles", description: "Carte au nom de Dupont.", foundAt: "Cantine", foundOn: day(10), depositedAt: ago(10 * DAY), storage: "Casier 1", status: "restitue", restitutionId: "r2" },
  ];

  const decl = (d: Omit<Declaration, "photos"> & { photos?: string[] }): Declaration => ({ photos: [], ...d });
  const declarations: Declaration[] = [
    decl({ id: "d1", ref: "DEC-2081", kind: "perdu", nom: "Dupont", prenom: "Léa", classe: "Terminale C", telephone: "06 12 34 56 78", objectName: "Calculatrice Casio", category: "scolaire", description: "Modèle Graph 35+ avec coque turquoise et autocollant panda blanc au dos.", location: "Salle B12", kioskId: "k1", createdAt: ago(35 * MIN), status: "ouverte" }),
    decl({ id: "d2", ref: "DEC-2080", kind: "perdu", nom: "Martin", prenom: "Hugo", classe: "1ère STI2D", telephone: "", objectName: "Écouteurs sans fil", category: "autre", description: "Boîtier noir avec un autocollant blanc.", location: "Cantine", kioskId: "k1", createdAt: ago(1 * HOUR + 10 * MIN), status: "ouverte" }),
    decl({ id: "d3", ref: "DEC-2079", kind: "trouve", nom: "Bernard", prenom: "Chloé", classe: "2nde A", telephone: "07 55 44 33 22", objectName: "Portefeuille marron", category: "autre", description: "Cuir, avec des cartes dedans. Remis à l'accueil.", location: "Couloir bâtiment B", kioskId: "k2", createdAt: ago(5 * HOUR + 30 * MIN), status: "cloturee", objectId: "o2" }),
    decl({ id: "d4", ref: "DEC-2078", kind: "perdu", nom: "Petit", prenom: "Lucas", classe: "Terminale S", telephone: "06 98 76 54 32", objectName: "Téléphone Samsung", category: "telephone", description: "Gris métallisé, écran fissuré en bas à gauche.", location: "Gymnase", kioskId: "k3", createdAt: ago(1 * DAY + 2 * HOUR), status: "ouverte" }),
    decl({ id: "d5", ref: "DEC-2077", kind: "perdu", nom: "Roux", prenom: "Emma", classe: "1ère L", telephone: "06 11 22 33 44", objectName: "Clés de voiture", category: "cles", description: "Trois clés avec une télécommande, porte-clés rond.", location: "Salle de cours", kioskId: "k1", createdAt: ago(1 * DAY + 5 * HOUR), status: "ouverte" }),
    decl({ id: "d6", ref: "DEC-2076", kind: "trouve", nom: "Moreau", prenom: "Noah", classe: "Personnel", telephone: "", objectName: "Sweat gris", category: "vetement", description: "Capuche, taille M.", location: "Cour", kioskId: "k1", createdAt: ago(3 * DAY + 3 * HOUR), status: "cloturee", objectId: "o6" }),
    decl({ id: "d7", ref: "DEC-2075", kind: "perdu", nom: "Simon", prenom: "Jade", classe: "2nde B", telephone: "", objectName: "Sac à dos noir", category: "sac", description: "Sac Eastpak noir avec un porte-clés lapin.", location: "CDI", kioskId: "k2", createdAt: ago(3 * DAY + 6 * HOUR), status: "ouverte" }),
    decl({ id: "d8", ref: "DEC-2074", kind: "trouve", nom: "Laurent", prenom: "Tom", classe: "Terminale C", telephone: "06 44 55 66 77", objectName: "Gourde verte", category: "autre", description: "Métal, bouchon noir.", location: "Gymnase", kioskId: "k3", createdAt: ago(5 * DAY), status: "ouverte" }),
    decl({ id: "d9", ref: "DEC-2070", kind: "perdu", nom: "Girard", prenom: "Zoé", classe: "Terminale L", telephone: "07 12 34 56 78", objectName: "Casque audio", category: "autre", description: "Casque blanc, coussinets noirs.", location: "CDI", kioskId: "k2", createdAt: ago(9 * DAY), status: "cloturee", objectId: "o16" }),
  ];

  // Older, already-handled declarations so the charts have a real two-week history.
  const NAMES: [string, string, string][] = [
    ["Leroy", "Manon", "2nde A"], ["Garcia", "Ethan", "1ère B"], ["Fournier", "Inès", "Terminale S"], ["Mercier", "Lucas", "2nde C"],
    ["Blanc", "Sarah", "1ère STI2D"], ["Guerin", "Nathan", "Terminale L"], ["Muller", "Clara", "2nde B"], ["Faure", "Adam", "1ère L"],
  ];
  const THINGS: [string, CategoryId, string][] = [
    ["Trousse bleue", "scolaire", "Zip noir, prénom au marqueur."], ["Sweat noir", "vetement", "Capuche, logo blanc."], ["Clés de casier", "cles", "Deux clés sur un anneau."],
    ["Sac de sport", "sac", "Grand sac gris, bandes rouges."], ["Écouteurs filaires", "autre", "Câble blanc emmêlé."], ["Téléphone", "telephone", "Coque transparente."],
    ["Carnet de correspondance", "scolaire", "Couverture verte."], ["Veste en jean", "vetement", "Boutons dorés."],
  ];
  const PLACES = ["Cantine", "CDI", "Gymnase", "Cour", "Salle de cours", "Couloir bâtiment B"];
  const perDay = [1, 3, 2, 4, 1, 0, 3, 5, 2, 3, 1, 4, 2, 3]; // extra declarations, days ago 0 → 13
  let extra = 0;
  perDay.forEach((count, daysAgo) => {
    for (let j = 0; j < count; j++) {
      const [nom, prenom, classe] = NAMES[(extra + j) % NAMES.length];
      const [objectName, category, description] = THINGS[(extra * 3 + j) % THINGS.length];
      declarations.push(
        decl({
          id: `dx${extra}`, ref: `DEC-${2000 + extra}`, kind: extra % 3 === 0 ? "trouve" : "perdu", nom, prenom, classe, telephone: "",
          objectName, category, description, location: PLACES[(extra + j) % PLACES.length], kioskId: kiosks[extra % kiosks.length].id,
          createdAt: ago(daysAgo * DAY + (j + 2) * HOUR + (extra % 4) * 7 * MIN), status: "cloturee",
        }),
      );
      extra++;
    }
  });

  // A few more objects already given back, so "rendus" is not the smallest slice by a mile.
  const returned: [string, string, CategoryId, number, string, string][] = [
    ["OBJ-1034", "Doudoune noire", "vetement", 4, "Lina", "Moreau"],
    ["OBJ-1033", "Clé USB bleue", "autre", 6, "Yanis", "Perrin"],
    ["OBJ-1032", "Gourde rose", "autre", 11, "Jade", "Colin"],
    ["OBJ-1031", "Agenda violet", "scolaire", 13, "Tom", "Andre"],
  ];
  returned.forEach(([ref, name, category, daysAgo], i) => {
    objects.push({ id: `ox${i}`, ref, name, category, description: "", foundAt: "Couloir bâtiment B", foundOn: day(daysAgo + 1), depositedAt: ago((daysAgo + 1) * DAY), storage: "Casier 3", status: "restitue", restitutionId: `rx${i}` });
  });

  const restitutions: Restitution[] = [
    { id: "r1", ref: "RST-0212", objectId: "o16", objectRef: "OBJ-1036", objectName: "Casque audio blanc", nom: "Girard", prenom: "Zoé", classe: "Terminale L", idChecked: true, note: "A décrit le casque et son étui.", doneAt: ago(7 * DAY), doneBy: "Yanis Benali", declarationId: "d9" },
    ...returned.map(([ref, name, , daysAgo, prenom, nom], i): Restitution => ({
      id: `rx${i}`, ref: `RST-${String(207 + i).padStart(4, "0")}`, objectId: `ox${i}`, objectRef: ref, objectName: name, nom, prenom, classe: "2nde B",
      idChecked: true, note: "", doneAt: ago(daysAgo * DAY), doneBy: "Sophie Lambert",
    })),
    { id: "r2", ref: "RST-0211", objectId: "o17", objectRef: "OBJ-1035", objectName: "Carte étudiante", nom: "Dupont", prenom: "Théo", classe: "1ère B", idChecked: true, note: "", doneAt: ago(9 * DAY), doneBy: "Sophie Lambert" },
  ];

  const log: LogEntry[] = [
    { id: "l1", at: ago(35 * MIN), actor: "Borne d'entrée principale", action: "declaration.create", message: "Déclaration DEC-2081 reçue (perdu : Calculatrice Casio)" },
    { id: "l2", at: ago(1 * HOUR + 10 * MIN), actor: "Borne d'entrée principale", action: "declaration.create", message: "Déclaration DEC-2080 reçue (perdu : Écouteurs sans fil)" },
    { id: "l3", at: ago(2 * HOUR), actor: "Yanis Benali", action: "object.create", message: "Objet OBJ-1048 enregistré (Écouteurs sans fil noirs)" },
    { id: "l4", at: ago(5 * HOUR), actor: "Yanis Benali", action: "object.create", message: "Objet OBJ-1047 enregistré (Portefeuille en cuir marron)" },
    { id: "l5", at: ago(7 * DAY), actor: "Yanis Benali", action: "restitution.create", message: "Objet OBJ-1036 rendu à Zoé Girard" },
    { id: "l6", at: ago(9 * DAY), actor: "Sophie Lambert", action: "restitution.create", message: "Objet OBJ-1035 rendu à Théo Dupont" },
  ];

  return {
    objects,
    declarations,
    restitutions,
    staff,
    kiosks,
    settings: {
      schoolName: "Lycée Jean Moulin",
      schoolType: "lycee",
      address: "12 rue de la République, 69003 Lyon",
      phone: "04 72 00 00 00",
      email: "vie-scolaire@lycee-jean-moulin.fr",
      retentionDays: 60,
      idleSeconds: 90,
      helpDesk: "Poste 204",
    },
    log,
    currentUserId: "s1",
    counters: { object: 1049, declaration: 2082, restitution: 213 },
  };
}
