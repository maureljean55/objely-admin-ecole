"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import type { StaffCredentials } from "@/lib/staff";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={copied ? "check" : "content_copy"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard blocked: the value is still selectable on screen.
        }
      }}
    >
      {copied ? "Copié" : label}
    </Button>
  );
}

// Shown once, after an account is created or its password reset. The password exists nowhere else.
export function CredentialsDialog({ credentials, title, onClose }: { credentials: StaffCredentials; title: string; onClose: () => void }) {
  const sheet = `Objely École · accès à l'administration\nNom : ${credentials.name}\nAdresse : ${credentials.loginUrl}\nIdentifiant : ${credentials.email}\nMot de passe provisoire : ${credentials.password}`;
  return (
    <Dialog title={title} onClose={onClose} footer={<Button onClick={onClose}>Terminé</Button>}>
      <p className="mb-4 text-body text-ink">Transmettez ces informations à <strong>{credentials.name}</strong>. Cette personne devra choisir son propre mot de passe à la première connexion.</p>
      <dl className="flex flex-col gap-3">
        <div>
          <dt className="tag">Adresse de connexion</dt>
          <dd className="select-all rounded-field bg-canvas px-3 py-2 font-mono text-small text-ink">{credentials.loginUrl}</dd>
        </div>
        <div>
          <dt className="tag">Identifiant</dt>
          <dd className="select-all rounded-field bg-canvas px-3 py-2 font-mono text-small text-ink">{credentials.email}</dd>
        </div>
        <div>
          <dt className="tag">Mot de passe provisoire</dt>
          <dd className="select-all rounded-field border-2 border-blue bg-white px-3 py-3 text-center font-mono text-[22px] font-semibold tracking-wider text-ink">{credentials.password}</dd>
        </div>
      </dl>
      <p role="alert" className="mt-4 flex items-start gap-2 rounded-field bg-warn-tint px-3 py-2.5 text-small text-warn">
        <Icon name="warning" size={18} className="mt-px" />
        <span>Ce mot de passe ne sera <strong>plus jamais affiché</strong>. Copiez-le maintenant. S&apos;il est perdu, vous pourrez en générer un nouveau.</span>
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <CopyButton text={credentials.password} label="Copier le mot de passe" />
        <CopyButton text={sheet} label="Copier les identifiants" />
      </div>
    </Dialog>
  );
}
