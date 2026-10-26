"use client";

import { startTransition, type FormEvent } from "react";

/**
 * Soumission sans réinitialisation : React 19 vide un formulaire après une action serveur,
 * ce qui ferait perdre la saisie (et les fichiers) quand une erreur est renvoyée.
 * Sans JavaScript, l'attribut `action` du formulaire prend le relais normalement.
 */
export function useSubmit(formAction: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => formAction(fd));
  };
}
