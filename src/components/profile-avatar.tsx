import type { AvatarKey } from "@/lib/connectors/types";

type ProfileAvatarProps = {
  avatar: AvatarKey;
  className?: string;
};

export const profileAvatarOptions: Array<{ id: AvatarKey; label: string }> = [
  { id: "tire", label: "Tire avatar" },
  { id: "boat", label: "Lake boat avatar" },
  { id: "car", label: "Racing car avatar" },
  { id: "pizza", label: "Deep dish pizza avatar" },
];

export function ProfileAvatar({ avatar, className = "" }: ProfileAvatarProps) {
  const classes = `profile-avatar-graphic${className ? ` ${className}` : ""}`;

  if (avatar === "tire") {
    return (
      <svg aria-hidden="true" className={classes} viewBox="0 0 24 24">
        <circle className="avatar-back" cx="12" cy="12" r="10" />
        <circle className="tire-wall" cx="12" cy="12" r="6.4" />
        <circle className="tire-hole" cx="12" cy="12" r="2.7" />
        <path className="tire-tread" d="M12 5.6v2" />
        <path className="tire-tread" d="M12 16.4v2" />
        <path className="tire-tread" d="M5.6 12h2" />
        <path className="tire-tread" d="M16.4 12h2" />
        <path className="tire-tread" d="m7.5 7.5 1.4 1.4" />
        <path className="tire-tread" d="m15.1 15.1 1.4 1.4" />
      </svg>
    );
  }

  if (avatar === "boat") {
    return (
      <svg aria-hidden="true" className={classes} viewBox="0 0 24 24">
        <circle className="avatar-back blue boat-back" cx="12" cy="12" r="10" />
        <path className="boat-sail" d="M12 6.2v7.1" />
        <path className="boat-sail" d="M12 7.1 7.7 13.3H12" />
        <path className="boat-sail" d="M13 8.2l3.9 5.1H13" />
        <path className="boat-hull" d="M5.2 14.2h13.6l-1.8 2.4c-.7.9-1.8 1.4-3 1.4H10c-1.2 0-2.3-.5-3-1.4l-1.8-2.4Z" />
        <path className="water-line" d="M6 18.8c1.2-.7 2.4-.7 3.6 0s2.4.7 3.6 0 2.4-.7 3.6 0" />
      </svg>
    );
  }

  if (avatar === "car") {
    return (
      <svg aria-hidden="true" className={classes} viewBox="0 0 24 24">
        <circle className="avatar-back coral car-back" cx="12" cy="12" r="10" />
        <path className="speed-mark" d="M3.2 10.1h4.1" />
        <path className="speed-mark" d="M2.8 13h3.2" />
        <path className="race-body" d="M4.5 15.2h15.1l-1.1-3.1-4.1-.7-2.4-2.3H8.7L6.4 12l-1.9 3.2Z" />
        <path className="race-window" d="M9.2 10.2h2.6l1.3 1.4H8.2l1-1.4Z" />
        <circle cx="7.7" cy="15.5" r="1.6" />
        <circle cx="16.6" cy="15.5" r="1.6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={classes} viewBox="0 0 24 24">
      <circle className="avatar-back coral" cx="12" cy="12" r="10" />
      <path className="pizza-crust" d="M6.1 6.8c3.8-1.6 8-1.6 11.8 0" />
      <path className="pizza-slice" d="M6.5 7.5h11L12 18.2 6.5 7.5Z" />
      <path className="pizza-cheese" d="M10.4 11.1c.6.6 1.1 1.5 1 2.8" />
      <circle className="pizza-topping" cx="9.5" cy="9.8" r=".7" />
      <circle className="pizza-topping" cx="14.5" cy="10.4" r=".7" />
      <circle className="pizza-topping" cx="12" cy="13.2" r=".7" />
    </svg>
  );
}
