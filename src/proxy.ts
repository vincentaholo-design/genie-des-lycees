import { NextResponse, type NextRequest } from "next/server";

/**
 * Filtre rapide : sans cookie de session, l'administration renvoie vers la connexion.
 * La vérification réelle (session en base, rôle) est faite côté serveur sur chaque page et action.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/connexion") && !req.cookies.get("gdl_admin")) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/connexion";
    url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
