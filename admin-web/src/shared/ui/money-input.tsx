import { InputNumber } from 'antd';
import type { InputNumberProps } from 'antd';

/**
 * Денежное поле формы: хранит копейки (value), показывает рубли.
 * Форматирование — только на границе UI (docs/frontend/web/03-api-integration.md §4).
 */
export function MoneyInput({
  value,
  onChange,
  ...rest
}: Omit<InputNumberProps<number>, 'value' | 'onChange'> & {
  value?: number | null;
  onChange?: (value: number | null) => void;
}) {
  return (
    <InputNumber<number>
      min={0}
      step={1}
      precision={2}
      style={{ width: '100%' }}
      addonAfter="BYN"
      {...rest}
      value={value == null ? null : value / 100}
      onChange={(next) => onChange?.(next == null ? null : Math.round(next * 100))}
      formatter={(display) => `${display ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
      parser={(display) => {
        const normalized = `${display ?? ''}`.replace(/\s/g, '').replace(',', '.');
        const parsed = Number(normalized);
        return Number.isNaN(parsed) ? 0 : parsed;
      }}
    />
  );
}
