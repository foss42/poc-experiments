import { useTestStore } from '../../stores/testStore';
import { ResourceListItem } from './ResourceListItem';

export function ResourceList() {
  const { getFilteredResources, searchQuery, setSearchQuery, resources } = useTestStore();
  const filteredResources = getFilteredResources();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Resources</span>
          <span className="bg-muted text-muted-foreground text-[11px] font-medium px-1.5 py-0.5 rounded-full">
            {resources.length}
          </span>
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 bg-muted border-none rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredResources.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            {searchQuery ? 'No resources match your search' : 'No resources available'}
          </p>
        ) : (
          filteredResources.map((resource) => <ResourceListItem key={resource.uri} resource={resource} />)
        )}
      </div>
    </div>
  );
}
