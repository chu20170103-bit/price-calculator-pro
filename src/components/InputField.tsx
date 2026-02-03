import { ChangeEvent } from 'react';

interface InputFieldProps {
  label: string;
  value: number | string;
  onChange: (value: number | string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  suffix?: string;
}

export function InputField({
  label,
  value,
  onChange,
  type = 'number',
  placeholder,
  suffix,
}: InputFieldProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (type === 'number') {
      const numValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
      onChange(isNaN(numValue) ? 0 : numValue);
    } else {
      onChange(e.target.value);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={type === 'number' && value === 0 ? '' : value}
          onChange={handleChange}
          placeholder={placeholder || (type === 'number' ? '0' : '')}
          className="input-field pr-12"
          inputMode={type === 'number' ? 'numeric' : 'text'}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
