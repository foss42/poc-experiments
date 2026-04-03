/**
 * JsonView — recursive JSON pretty-printer used in Data / Context tabs.
 */
export const JsonView = ({ data }) => {
  if (data === null) return <span className="text-orange-500">null</span>;
  if (typeof data === 'boolean') return <span className="text-orange-500">{data ? 'true' : 'false'}</span>;
  if (typeof data === 'number') return <span className="text-purple-600">{data}</span>;
  if (typeof data === 'string') return <span className="text-green-700">"{data}"</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-neutral-500">[]</span>;
    return (
      <div className="inline-block">
        <span className="text-neutral-500">[</span>
        <div className="pl-4 border-l border-neutral-200/50">
          {data.map((val, i) => (
            <div key={i}>
              <JsonView data={val} />
              {i < data.length - 1 && <span className="text-neutral-500">,</span>}
            </div>
          ))}
        </div>
        <span className="text-neutral-500">]</span>
      </div>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span className="text-neutral-500">{'{}'}</span>;
    return (
      <div className="inline-block">
        <span className="text-neutral-500">{'{'}</span>
        <div className="pl-4 border-l border-neutral-200/50">
          {keys.map((key, i) => (
            <div key={key}>
              <span className="text-blue-600">"{key}"</span>
              <span className="text-neutral-500">: </span>
              <JsonView data={data[key]} />
              {i < keys.length - 1 && <span className="text-neutral-500">,</span>}
            </div>
          ))}
        </div>
        <span className="text-neutral-500">{'}'}</span>
      </div>
    );
  }

  return <span>{String(data)}</span>;
};
