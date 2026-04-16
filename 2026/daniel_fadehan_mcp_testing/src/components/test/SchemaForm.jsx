import { useTestStore } from '../../stores/testStore';
import { SchemaField } from './SchemaField';

export function SchemaForm({ schema }) {
  const { inputValues, setInputValue } = useTestStore();

  if (!schema?.properties) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        This tool has no input parameters.
      </p>
    );
  }

  const required = schema.required || [];
  const properties = Object.entries(schema.properties);

  return (
    <div className="space-y-4">
      {properties.map(([name, propSchema]) => (
        <SchemaField
          key={name}
          name={name}
          schema={propSchema}
          value={inputValues[name]}
          onChange={(val) => setInputValue(name, val)}
          required={required.includes(name)}
        />
      ))}
    </div>
  );
}
