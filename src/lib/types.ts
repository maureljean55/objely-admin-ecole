export type CategoryId = "telephone" | "sac" | "cles" | "vetement" | "scolaire" | "autre";

export const CATEGORIES: { id: CategoryId; label: string; icon: string }[] = [
  { id: "telephone", label: "Téléphone", icon: "smartphone" },
  { id: "sac", label: "Sac & Dos", icon: "backpack" },
  { id: "cles", label: "Clés / Badge", icon: "key" },
  { id: "vetement", label: "Vêtement", icon: "checkroom" },
  { id: "scolaire", label: "Scolaire", icon: "menu_book" },
  { id: "autre", label: "Autre", icon: "more_horiz" },
];

export const categoryLabel = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
export const categoryIcon = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.icon ?? "more_horiz";

/** en_stock: at the vie scolaire · restitue: given back · a_donner: retention delay passed, to be donated. */
export type ObjectStatus = "en_stock" | "restitue" | "a_donner";

export type StoredObject = {
  id: string;
  ref: string;
  name: string;
  category: CategoryId;
  description: string;
  /** Where it was found. */
  foundAt: string;
  /** ISO day it was found. */
  foundOn: string;
  /** ISO datetime it was handed in to the vie scolaire. */
  depositedAt: string;
  /** Where it is kept (locker, shelf…). */
  storage: string;
  /** Small preview (data URL), used in lists. */
  photo?: string;
  /** Full-size photo in the object-photos bucket; needs a signed URL to display. */
  photoPath?: string;
  status: ObjectStatus;
  restitutionId?: string;
  /** Declaration this object was created from, if any. */
  fromDeclarationId?: string;
};

export type DeclarationKind = "perdu" | "trouve";
export type DeclarationStatus = "ouverte" | "correspondance" | "cloturee";

export type Declaration = {
  id: string;
  ref: string;
  kind: DeclarationKind;
  nom: string;
  prenom: string;
  classe: string;
  telephone: string;
  objectName: string;
  category: CategoryId;
  description: string;
  location: string;
  photos: string[];
  kioskId: string;
  createdAt: string;
  status: DeclarationStatus;
  /** Stock object this declaration was matched with or created. */
  objectId?: string;
  /** Declaration of the other side (lost ↔ found) that the student recognised at the borne. */
  matchedDeclarationId?: string;
};

export type Restitution = {
  id: string;
  ref: string;
  objectId: string;
  objectRef: string;
  objectName: string;
  nom: string;
  prenom: string;
  classe: string;
  idChecked: boolean;
  note: string;
  doneAt: string;
  doneBy: string;
  declarationId?: string;
};

export type StaffRole = "admin" | "vie_scolaire" | "lecture";

export const ROLES: Record<StaffRole, { label: string; description: string }> = {
  admin: { label: "Administrateur", description: "Tout gérer : objets, personnel, bornes et paramètres." },
  vie_scolaire: { label: "Vie scolaire", description: "Enregistrer, restituer et suivre les objets et les déclarations." },
  lecture: { label: "Lecture seule", description: "Consulter sans rien modifier." },
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
  createdAt: string;
  lastSeenAt?: string;
};

export type Kiosk = {
  id: string;
  name: string;
  location: string;
  version: string;
  createdAt: string;
  /** Last time the borne reported in; null until it has been paired. */
  lastSeenAt: string | null;
  /** Set until the borne has been paired. */
  pairingCode?: string;
  pairingExpiresAt?: string;
  pairedAt?: string;
};

/** One pairing code ever issued, kept after use. */
export type PairingCodeRecord = {
  id: string;
  code: string;
  /** Name of the borne when the code was issued (the borne may have been deleted since). */
  kioskName: string;
  createdAt: string;
  createdBy: string | null;
  expiresAt: string;
  usedAt: string | null;
  /** Replaced by a newer code, or cancelled because the borne was deleted before it was used. */
  replacedAt: string | null;
};

export type Settings = {
  schoolName: string;
  schoolType: "ecole" | "college" | "lycee" | "universite";
  address: string;
  phone: string;
  email: string;
  /** Days an object is kept before it can be donated. */
  retentionDays: number;
  /** Seconds without a touch before a borne wipes its form. */
  idleSeconds: number;
  /** Shown on the borne as the help-desk number. */
  helpDesk: string;
};

export const SCHOOL_TYPES: Record<Settings["schoolType"], string> = {
  ecole: "École",
  college: "Collège",
  lycee: "Lycée",
  universite: "Université",
};

export type LogEntry = {
  id: string;
  at: string;
  actor: string;
  /** Machine-readable, e.g. "object.create". */
  action: string;
  /** Human sentence, e.g. "Objet OBJ-1042 enregistré". */
  message: string;
};

export type State = {
  objects: StoredObject[];
  declarations: Declaration[];
  restitutions: Restitution[];
  staff: StaffMember[];
  kiosks: Kiosk[];
  pairingCodes: PairingCodeRecord[];
  settings: Settings;
  log: LogEntry[];
  /** The establishment this data belongs to. */
  organizationId: string;
};
