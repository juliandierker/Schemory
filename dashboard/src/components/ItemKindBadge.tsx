import { ItemKind } from '@schemory/shared';

interface ItemKindBadgeProps {
  kind: ItemKind;
}

export default function ItemKindBadge({ kind }: ItemKindBadgeProps) {
  const kindStyles = {
    type: 'bg-primary bg-opacity-10 text-primary',
    schema: 'bg-valid bg-opacity-10 text-valid',
  };

  return (
    <span
      className={`px-2 py-1 rounded-md text-xs font-semibold ${kindStyles[kind]}`}
      aria-label={`Kind: ${kind}`}
    >
      {kind}
    </span>
  );
}
