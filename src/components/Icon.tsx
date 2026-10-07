type IconName =
  | "palette"
  | "school"
  | "book"
  | "clapperboard"
  | "sparkles"
  | "users"
  | "sprout"
  | "heart"
  | "bulb"
  | "puzzle"
  | "target"
  | "image"
  | "pencil"
  | "mail"
  | "presentation"
  | "film"
  | "graduation"
  | "calendar"
  | "handshake"
  | "layers"
  | "tree"
  | "wand"
  | "monitor"
  | "laptop"
  | "wrench"
  | "plus"
  | "menu"
  | "close"
  | "check";

const iconClass: Record<IconName, string> = {
  palette: "ri-palette-line",
  school: "ri-school-line",
  book: "ri-book-open-line",
  clapperboard: "ri-clapperboard-line",
  sparkles: "ri-sparkling-line",
  users: "ri-group-line",
  sprout: "ri-leaf-line",
  heart: "ri-heart-line",
  bulb: "ri-lightbulb-line",
  puzzle: "ri-puzzle-line",
  target: "ri-focus-3-line",
  image: "ri-image-line",
  pencil: "ri-pencil-line",
  mail: "ri-mail-line",
  presentation: "ri-presentation-line",
  film: "ri-film-line",
  graduation: "ri-graduation-cap-line",
  calendar: "ri-calendar-line",
  handshake: "ri-handshake-line",
  layers: "ri-layers-line",
  tree: "ri-tree-line",
  wand: "ri-magic-line",
  monitor: "ri-monitor-line",
  laptop: "ri-macbook-line",
  wrench: "ri-tools-line",
  plus: "ri-add-line",
  menu: "ri-menu-line",
  close: "ri-close-line",
  check: "ri-check-line",
};

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
};

export function Icon({ name, size = 24, className = "" }: IconProps) {
  return (
    <i
      aria-hidden="true"
      className={`${iconClass[name]} ${className}`}
      style={{ fontSize: size, lineHeight: 1 }}
    />
  );
}
