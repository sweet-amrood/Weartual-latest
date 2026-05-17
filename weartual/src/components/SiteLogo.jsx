import { useTheme } from "../context/ThemeContext.jsx";
import { getSiteLogoSrc } from "../config/branding";

export default function SiteLogo({ className = "object-contain", width, height, alt = "" }) {
  const { theme } = useTheme();
  return (
    <img
      src={getSiteLogoSrc(theme)}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}
