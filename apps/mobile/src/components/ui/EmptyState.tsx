import { Button } from './Button';
import { Box } from './Box';
import { Text } from './Text';

interface EmptyStateProps {
  title: string;
  text: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

/**
 * "Nada encontrado" com saída.
 *
 * A CTA não é enfeite: o estado vazio da busca em Vender oferece cadastrar o
 * produto na hora, para que uma busca frustrada não interrompa a venda.
 */
export function EmptyState({ title, text, actionLabel, onActionPress }: EmptyStateProps) {
  return (
    <Box alignItems="center" paddingVertical="s38" paddingHorizontal="s20">
      <Text variant="titleSm" marginBottom="s6" textAlign="center">
        {title}
      </Text>
      <Text variant="bodySm" color="textMuted" textAlign="center">
        {text}
      </Text>
      {actionLabel && onActionPress ? (
        <Box marginTop="s14">
          <Button
            title={actionLabel}
            onPress={onActionPress}
            height={44}
            radius={14}
            larguraTotal={false}
            textVariant="buttonXs"
          />
        </Box>
      ) : null}
    </Box>
  );
}
