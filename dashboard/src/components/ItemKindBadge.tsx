import { ItemKind } from '@schemory/shared';

interface ItemKindBadgeProps {
  kind: ItemKind;
}

export default function ItemKindBadge({ kind }: ItemKindBadgeProps) {
  const kindStyles = {
    type: 'bg-primary bg-opacity-10 text-white',
    schema: 'bg-valid bg-opacity-10 text-white',
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
