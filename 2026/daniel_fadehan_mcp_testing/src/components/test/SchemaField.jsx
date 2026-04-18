import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export function SchemaField({ name, schema, value, onChange, required }) {
  const type = schema.type || 'string';
  const description = schema.description;
  const enumValues = schema.enum;

  const label = (
    <>
      {name}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </>
  );

  // Enum → Select
  if (enumValues && Array.isArray(enumValues)) {
    const options = [
      { value: '', label: 'Select...' },
      ...enumValues.map((v) => ({ value: String(v), label: String(v) })),
    ];
    return (
      <div className="space-y-1">
        <Select
          label={label}
          options={options}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    );
  }

  // Boolean → toggle
  if (type === 'boolean') {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-neutral-700">
            {label}
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={value === true || value === 'true'}
            onClick={() => onChange(value === true || value === 'true' ? false : true)}
            className={`
              relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
              transition-colors duration-200
              ${value === true || value === 'true' ? 'bg-neutral-900' : 'bg-neutral-200'}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm
                transform transition-transform duration-200
                ${value === true || value === 'true' ? 'translate-x-4' : 'translate-x-0'}
              `}
            />
          </button>
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    );
  }

  // Number
  if (type === 'number' || type === 'integer') {
    return (
      <div className="space-y-1">
        <Input
          label={label}
          type="number"
          placeholder={`Enter ${name}`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    );
  }

  // Array or Object → textarea
  if (type === 'array' || type === 'object') {
    const placeholder = type === 'array' ? '[\n  \n]' : '{\n  \n}';
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700">{label}</label>
        <textarea
          placeholder={placeholder}
          value={typeof value === 'string' ? value : (value != null ? JSON.stringify(value, null, 2) : '')}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 text-sm font-mono text-neutral-900 placeholder:text-neutral-400 bg-white border border-border rounded-md transition-colors hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-0 focus:border-transparent resize-y"
        />
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    );
  }

  // Default: string
  return (
    <div className="space-y-1">
      <Input
        label={label}
        placeholder={`Enter ${name}`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
