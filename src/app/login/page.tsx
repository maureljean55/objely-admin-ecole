import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen grid-cols-[1fr_520px]">
      <div className="flex flex-col justify-between bg-ink p-12 text-white">
        <div className="flex items-center gap-3">
          <Image src="/logo/objely-mark.png" alt="" width={52} height={46} priority className="h-[46px] w-[52px]" />
          <span className="font-display text-[28px] font-extrabold tracking-tight">Objely</span>
        </div>
        <div>
          <h1 className="max-w-[520px] font-display text-[44px] font-extrabold leading-[48px] tracking-tight">Chaque objet trouvé mérite de retrouver son propriétaire.</h1>
          <p className="mt-4 max-w-[480px] text-body text-white/70">L&apos;espace de la vie scolaire pour suivre les déclarations des bornes, ranger les objets et les rendre.</p>
        </div>
        <p className="tag !text-white/40">Objely École · Administration</p>
      </div>

      <div className="flex items-center justify-center bg-canvas p-12">
        <div className="w-full max-w-[360px]">
          <h2 className="text-title text-ink">Connexion</h2>
          <p className="mt-1 text-body text-slate">Espace réservé au personnel de l&apos;établissement.</p>

          <form className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-small font-semibold text-ink">
              E-mail
              <input disabled placeholder="prenom.nom@etablissement.fr" className="h-10 rounded-field border border-line-strong bg-canvas px-3 text-body font-normal text-mute" />
            </label>
            <label className="flex flex-col gap-1.5 text-small font-semibold text-ink">
              Mot de passe
              <input disabled type="password" placeholder="••••••••" className="h-10 rounded-field border border-line-strong bg-canvas px-3 text-body font-normal text-mute" />
            </label>
            <p className="rounded-field bg-warn-tint px-3 py-2.5 text-small text-warn">La connexion sécurisée sera activée avec la base de données de l&apos;établissement. En attendant, entrez en mode démonstration.</p>
            <Link href="/" className="flex h-11 items-center justify-center rounded-field bg-blue font-semibold text-white hover:brightness-110">
              Entrer en mode démonstration
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
