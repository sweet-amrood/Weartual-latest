/** Site logo assets (served from /public). */
export const SITE_LOGO_SRC = "/favicon1.png";
export const SITE_LOGO_SRC_DARK = "/favicon1dark.png";

export function getSiteLogoSrc(theme) {
  return theme === "dark" ? SITE_LOGO_SRC_DARK : SITE_LOGO_SRC;
}
